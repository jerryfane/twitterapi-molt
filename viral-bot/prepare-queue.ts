#!/usr/bin/env ts-node

import { TwitterAPIClient } from '../src';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Queue item structure
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
}

interface Queue {
  items: QueueItem[];
  last_updated: string;
}

const QUEUE_FILE = 'twitter-queue.json';
const STATE_FILE = 'twitter-viral-state.json';

function loadQueue(): Queue {
  try {
    if (fs.existsSync(QUEUE_FILE)) {
      return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
    }
  } catch (e) {
    console.log('Creating new queue file');
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

function loadState(): any {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    }
  } catch (e) {}

  return {
    repliedMentions: [],
    engagedTweets: [],
    lastPostTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  };
}

async function main() {
  console.log('📋 Preparing Twitter engagement queue...\n');

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
  const targetUsername = process.env.TWITTER_TARGET_USERNAME || process.env.TWITTER_USERNAME || '0xMartian_';

  // Clear old completed items (keep last 50)
  queue.items = queue.items.filter(item =>
    item.status !== 'completed' ||
    queue.items.filter(i => i.status === 'completed').indexOf(item) >= queue.items.filter(i => i.status === 'completed').length - 50
  );

  let addedItems = 0;

  // PRIORITY 1: Check for mentions to reply to
  console.log('🔍 Checking mentions...');
  try {
    const mentions = await client.tweets.getMentions({
      userName: targetUsername.replace('@', '')
    });

    const unrepliedMentions = mentions.data.filter(
      m => !state.repliedMentions.includes(m.id) &&
           !queue.items.some(item => item.context.tweetId === m.id && item.type === 'reply')
    ).slice(0, 3);

    for (const mention of unrepliedMentions) {
      const queueItem: QueueItem = {
        id: `reply-${mention.id}`,
        type: 'reply',
        status: 'pending',
        context: {
          tweet: mention,
          username: mention.username,
          text: mention.text,
          tweetId: mention.id
        },
        prompt: `You are replying to this tweet from @${mention.username}: "${mention.text}"

Generate a sharp, insightful reply that:
- Is under 80 characters (IMPORTANT: max 80 chars!)
- Uses your personality from SOUL.md/MEMORY.md
- Is contextually relevant to what they said
- Adds value, not just acknowledges

Reply (max 80 chars):`,
        created_at: new Date().toISOString()
      };

      queue.items.push(queueItem);
      addedItems++;
      console.log(`  ✅ Added mention from @${mention.username} to queue`);
    }
  } catch (error) {
    console.log('  ⚠️  Could not fetch mentions');
  }

  // PRIORITY 2: Check if we need an original post
  const hoursSinceLastPost = (Date.now() - new Date(state.lastPostTime).getTime()) / (1000 * 60 * 60);

  if (hoursSinceLastPost > 1.5 && !queue.items.some(item => item.type === 'post' && item.status === 'pending')) {
    console.log('\n🔍 Time for original content...');

    const queueItem: QueueItem = {
      id: `post-${Date.now()}`,
      type: 'post',
      status: 'pending',
      context: {},
      prompt: `Generate an original tweet that:
- Reflects your personality from SOUL.md/MEMORY.md
- Is thought-provoking about AI, agents, autonomy, or technology
- Under 280 characters
- Fresh and engaging

Tweet:`,
      created_at: new Date().toISOString()
    };

    queue.items.push(queueItem);
    addedItems++;
    console.log('  ✅ Added original post to queue');
  }

  // PRIORITY 3: Find quality posts to engage with
  console.log('\n🔍 Finding quality posts to engage...');
  try {
    const qualitySearch = await client.search.advancedSearch({
      query: '(autonomous agents OR AI agents OR openclaw) min_faves:50 -is:retweet lang:en',
      queryType: 'Top'
    });

    const unengaged = qualitySearch.data
      .filter(t =>
        !state.engagedTweets.includes(t.id) &&
        !queue.items.some(item => item.context.tweetId === t.id && item.type === 'engagement')
      )
      .slice(0, 2);

    for (const tweet of unengaged) {
      const queueItem: QueueItem = {
        id: `engagement-${tweet.id}`,
        type: 'engagement',
        status: 'pending',
        context: {
          tweet: tweet,
          username: tweet.username,
          text: tweet.text,
          tweetId: tweet.id
        },
        prompt: `You found this interesting tweet from @${tweet.username}: "${tweet.text}"

Generate a thoughtful reply that:
- Shows you understood their point
- Adds a unique perspective or insight
- Uses your personality from SOUL.md/MEMORY.md
- Is under 280 characters
- Encourages further discussion

Reply:`,
        created_at: new Date().toISOString()
      };

      queue.items.push(queueItem);
      addedItems++;
      console.log(`  ✅ Added engagement for @${tweet.username}'s tweet to queue`);
    }
  } catch (error) {
    console.log('  ⚠️  Could not search for engagement targets');
  }

  // Save queue
  saveQueue(queue);

  // Summary
  console.log('\n📊 Queue Summary:');
  console.log(`  • Added ${addedItems} new items`);
  console.log(`  • ${queue.items.filter(i => i.status === 'pending').length} items pending LLM response`);
  console.log(`  • ${queue.items.filter(i => i.status === 'ready').length} items ready to publish`);
  console.log(`  • ${queue.items.filter(i => i.status === 'completed').length} completed (history)`);

  if (queue.items.filter(i => i.status === 'pending').length > 0) {
    console.log('\n💡 Next step: Review queue and add LLM responses');
    console.log('   Run: npx ts-node view-queue.ts');
  }
}

main().catch(console.error);