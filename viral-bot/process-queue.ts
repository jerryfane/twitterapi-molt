#!/usr/bin/env ts-node

import { TwitterAPIClient } from '../src';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

interface QueueItem {
  id: string;
  type: 'reply' | 'post' | 'engagement';
  status: 'pending' | 'ready' | 'completed' | 'failed';
  context: {
    tweet?: any;
    username?: string;
    text?: string;
    tweetId?: string;
  };
  prompt: string;
  llm_response?: string;
  created_at: string;
  processed_at?: string;
  error?: string;
}

interface Queue {
  items: QueueItem[];
  last_updated: string;
}

interface BotState {
  repliedMentions: string[];
  dailyLikes: { date: string; count: number };
  dailyFollows: { date: string; count: number };
  lastPostTime: string;
  engagedTweets: string[];
}

const QUEUE_FILE = 'twitter-queue.json';
const STATE_FILE = 'twitter-viral-state.json';
const TWEETS_FILE = 'tweets.json';

function loadQueue(): Queue {
  try {
    if (fs.existsSync(QUEUE_FILE)) {
      return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
    }
  } catch (e) {
    console.log('No queue file found. Run prepare-queue.ts first.');
    process.exit(1);
  }

  return {
    items: [],
    last_updated: new Date().toISOString()
  };
}

function saveQueue(queue: Queue): void {
  queue.last_updated = new Date().toISOString();
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
}

function loadState(): BotState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    }
  } catch (e) {}

  return {
    repliedMentions: [],
    dailyLikes: { date: new Date().toISOString().split('T')[0], count: 0 },
    dailyFollows: { date: new Date().toISOString().split('T')[0], count: 0 },
    lastPostTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    engagedTweets: []
  };
}

function saveState(state: BotState): void {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('🚀 Processing Twitter engagement queue...\n');

  const client = new TwitterAPIClient({
    apiKey: process.env.TWITTER_API_KEY!,
    email: process.env.TWITTER_EMAIL,
    username: process.env.TWITTER_USERNAME,
    password: process.env.TWITTER_PASSWORD,
    loginProxy: process.env.TWITTER_LOGIN_PROXY,
    totpSecret: process.env.TWITTER_2FA_SECRET
  });

  // Login
  const loginResult = await client.login();
  if (!loginResult.success) {
    console.error('❌ Login failed:', loginResult.message);
    return;
  }

  const queue = loadQueue();
  const state = loadState();

  // Get ready items
  const readyItems = queue.items.filter(i => i.status === 'ready');

  if (readyItems.length === 0) {
    console.log('📭 No items ready to publish.');
    console.log('\n💡 To add items to queue:');
    console.log('   1. Run: npx ts-node prepare-queue.ts');
    console.log('   2. Add LLM responses to pending items');
    console.log('   3. Run this script again');
    return;
  }

  console.log(`📦 Found ${readyItems.length} items ready to publish\n`);

  let successCount = 0;
  let failCount = 0;

  for (const item of readyItems) {
    try {
      console.log(`Processing ${item.type}: ${item.id}`);

      if (!item.llm_response) {
        console.log('  ⚠️  No LLM response, skipping');
        continue;
      }

      switch (item.type) {
        case 'reply':
          if (item.context.tweetId) {
            console.log(`  ↩️  Replying to @${item.context.username}: "${item.llm_response}"`);

            const reply = await client.tweets.create({
              text: item.llm_response,
              replyToTweetId: item.context.tweetId
            });

            if (reply.success) {
              item.status = 'completed';
              item.processed_at = new Date().toISOString();
              state.repliedMentions.push(item.context.tweetId);
              successCount++;
              console.log('  ✅ Reply sent');
            } else {
              item.status = 'failed';
              item.error = reply.message;
              failCount++;
              console.log('  ❌ Failed:', reply.message);
            }
          }
          break;

        case 'post':
          console.log(`  📝 Posting: "${item.llm_response.substring(0, 50)}..."`);

          const post = await client.tweets.create({
            text: item.llm_response
          });

          if (post.success) {
            item.status = 'completed';
            item.processed_at = new Date().toISOString();
            state.lastPostTime = new Date().toISOString();

            // Track in tweets file
            let recentPosts: string[] = [];
            try {
              if (fs.existsSync(TWEETS_FILE)) {
                recentPosts = JSON.parse(fs.readFileSync(TWEETS_FILE, 'utf-8'));
              }
            } catch (e) {}

            recentPosts.push(item.llm_response);
            if (recentPosts.length > 20) {
              recentPosts = recentPosts.slice(-20);
            }
            fs.writeFileSync(TWEETS_FILE, JSON.stringify(recentPosts, null, 2));

            successCount++;
            console.log('  ✅ Posted');
          } else {
            item.status = 'failed';
            item.error = post.message;
            failCount++;
            console.log('  ❌ Failed:', post.message);
          }
          break;

        case 'engagement':
          if (item.context.tweetId) {
            console.log(`  💬 Engaging with @${item.context.username}'s tweet`);

            const engagement = await client.tweets.create({
              text: item.llm_response,
              replyToTweetId: item.context.tweetId
            });

            if (engagement.success) {
              item.status = 'completed';
              item.processed_at = new Date().toISOString();
              state.engagedTweets.push(item.context.tweetId);

              // Also like the tweet
              try {
                await client.tweets.like(item.context.tweetId);
                state.dailyLikes.count++;
                console.log('  ❤️  Also liked the tweet');
              } catch (e) {
                // Ignore like failures
              }

              successCount++;
              console.log('  ✅ Engagement sent');
            } else {
              item.status = 'failed';
              item.error = engagement.message;
              failCount++;
              console.log('  ❌ Failed:', engagement.message);
            }
          }
          break;
      }

      // Rate limit respect
      await sleep(2500);

    } catch (error: any) {
      item.status = 'failed';
      item.error = error.message;
      failCount++;
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  // Save updated queue and state
  saveQueue(queue);
  saveState(state);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Processing Complete:');
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  console.log(`  ⏭️  Skipped: ${readyItems.length - successCount - failCount}`);

  const pendingCount = queue.items.filter(i => i.status === 'pending').length;
  if (pendingCount > 0) {
    console.log(`\n💡 ${pendingCount} items still pending LLM responses`);
    console.log('   Run: npx ts-node view-queue.ts --interactive');
  }

  console.log('\n🔄 To find new content to engage with:');
  console.log('   Run: npx ts-node prepare-queue.ts');
}

main().catch(console.error);