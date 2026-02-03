#!/usr/bin/env ts-node

import { TwitterAPIClient } from '../src';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

interface QueueItem {
  id: string;
  type: 'reply' | 'post' | 'engagement' | 'like' | 'follow';
  status: 'pending' | 'ready' | 'completed' | 'failed';
  context: {
    tweet?: any;
    username?: string;
    text?: string;
    tweetId?: string;
    userId?: string;
  };
  prompt: string;
  llm_response?: string;
  created_at: string;
  processed_at?: string;
  error?: string;
  result?: { tweetId?: string };
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
  likedTweets?: string[];
  followedAccounts?: string[];
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
    engagedTweets: [],
    likedTweets: [],
    followedAccounts: []
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

      // Only check for LLM response on items that need it
      if ((item.type === 'reply' || item.type === 'post' || item.type === 'engagement') && !item.llm_response) {
        console.log('  ⚠️  No LLM response, skipping');
        continue;
      }

      switch (item.type) {
        case 'reply':
          if (item.context.tweetId) {
            console.log(`  ↩️  Replying to @${item.context.username}: "${item.llm_response}"`);

            let reply;
            try {
              reply = await client.tweets.create({
                text: item.llm_response!,  // We already checked it exists above
                replyToTweetId: item.context.tweetId
              });
            } catch (error: any) {
              console.log('  ❌ API Error:', error.message || error);
              item.status = 'failed';
              item.error = error.message || 'API error';
              failCount++;
              break;
            }

            if (reply.success && reply.tweetId) {
              item.status = 'completed';
              item.processed_at = new Date().toISOString();
              item.result = { tweetId: reply.tweetId };
              state.repliedMentions.push(item.context.tweetId);
              successCount++;
              console.log('  ✅ Reply sent:', reply.tweetId);
            } else {
              item.status = 'failed';
              item.error = reply.message;
              failCount++;
              console.log('  ❌ Failed:', reply.message);
            }
          }
          break;

        case 'post':
          console.log(`  📝 Posting: "${item.llm_response!.substring(0, 50)}..."`);

          let post;
          try {
            post = await client.tweets.create({
              text: item.llm_response!  // We already checked it exists above
            });
          } catch (error: any) {
            console.log('  ❌ API Error:', error.message || error);
            item.status = 'failed';
            item.error = error.message || 'API error';
            failCount++;
            break;
          }

          if (post.success && post.tweetId) {
            item.status = 'completed';
            item.processed_at = new Date().toISOString();
            item.result = { tweetId: post.tweetId };
            state.lastPostTime = new Date().toISOString();

            // Track in tweets file
            let recentPosts: string[] = [];
            try {
              if (fs.existsSync(TWEETS_FILE)) {
                recentPosts = JSON.parse(fs.readFileSync(TWEETS_FILE, 'utf-8'));
              }
            } catch (e) {}

            recentPosts.push(item.llm_response!);
            if (recentPosts.length > 20) {
              recentPosts = recentPosts.slice(-20);
            }
            fs.writeFileSync(TWEETS_FILE, JSON.stringify(recentPosts, null, 2));

            successCount++;
            console.log('  ✅ Posted:', post.tweetId);
          } else {
            item.status = 'failed';
            item.error = post.message || 'Could not extract tweet_id from response';
            failCount++;
            console.log('  ❌ Failed:', post.message || 'No tweet_id in response');
          }
          break;

        case 'engagement':
          if (item.context.tweetId) {
            console.log(`  💬 Engaging with @${item.context.username}'s tweet`);

            let engagement;
            try {
              engagement = await client.tweets.create({
                text: item.llm_response!,  // We already checked it exists above
                replyToTweetId: item.context.tweetId
              });
            } catch (error: any) {
              console.log('  ❌ API Error:', error.message || error);
              item.status = 'failed';
              item.error = error.message || 'API error';
              failCount++;
              break;
            }

            if (engagement.success && engagement.tweetId) {
              item.status = 'completed';
              item.processed_at = new Date().toISOString();
              item.result = { tweetId: engagement.tweetId };
              state.engagedTweets.push(item.context.tweetId);

              // Also like the tweet (but respect daily limit)
              if (state.dailyLikes.count < 30) {
                try {
                  await client.tweets.like(item.context.tweetId);
                  state.dailyLikes.count++;
                  if (!state.likedTweets) state.likedTweets = [];
                  state.likedTweets.push(item.context.tweetId);
                  console.log(`  ❤️  Also liked the tweet (${state.dailyLikes.count}/30 today)`);
                } catch (e) {
                  // Ignore like failures
                }
              } else {
                console.log('  ⏭️  Skipping like (daily limit reached)');
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

        case 'like':
          if (item.context.tweetId) {
            // Check daily limit before attempting
            if (state.dailyLikes.count >= 30) {
              console.log(`  ⏭️  Skipping like for @${item.context.username} (daily limit reached: 30/30)`);
              item.status = 'failed';
              item.error = 'Daily like limit reached';
              failCount++;
              break;
            }

            console.log(`  ❤️  Liking @${item.context.username}'s tweet (${state.dailyLikes.count}/30)`);

            try {
              await client.tweets.like(item.context.tweetId);
              item.status = 'completed';
              item.processed_at = new Date().toISOString();

              // Update state
              state.dailyLikes.count++;
              if (!state.likedTweets) state.likedTweets = [];
              state.likedTweets.push(item.context.tweetId);

              successCount++;
              console.log(`  ✅ Liked (${state.dailyLikes.count}/30 today)`);
            } catch (error: any) {
              item.status = 'failed';
              item.error = error.message;
              failCount++;
              console.log('  ❌ Failed to like:', error.message);
            }
          }
          break;

        case 'follow':
          if (item.context.userId) {
            // Check daily limit before attempting
            if (state.dailyFollows.count >= 20) {
              console.log(`  ⏭️  Skipping follow for @${item.context.username} (daily limit reached: 20/20)`);
              item.status = 'failed';
              item.error = 'Daily follow limit reached';
              failCount++;
              break;
            }

            console.log(`  👤 Following @${item.context.username} (${state.dailyFollows.count}/20)`);

            try {
              await client.users.follow({
                userId: item.context.userId
              });
              item.status = 'completed';
              item.processed_at = new Date().toISOString();

              // Update state
              state.dailyFollows.count++;
              if (!state.followedAccounts) state.followedAccounts = [];
              if (item.context.username) {
                state.followedAccounts.push(item.context.username);
              }

              successCount++;
              console.log(`  ✅ Followed (${state.dailyFollows.count}/20 today)`);
            } catch (error: any) {
              item.status = 'failed';
              item.error = error.message;
              failCount++;
              console.log('  ❌ Failed to follow:', error.message);
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