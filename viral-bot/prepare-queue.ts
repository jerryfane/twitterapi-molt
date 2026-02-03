#!/usr/bin/env ts-node

import { TwitterAPIClient } from '../src';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Queue item structure
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
}

interface Queue {
  items: QueueItem[];
  last_updated: string;
}

interface SearchContext {
  current_focus: {
    query: string;
    reason?: string;
    expires_at?: string;
    last_updated_by?: string;
    time_window?: string;  // e.g., "1h", "24h", "7d"
    query_type?: 'Top' | 'Latest';  // Top = popular, Latest = recent
  };
  suggested_queries?: string[];
}

const QUEUE_FILE = 'twitter-queue.json';
const STATE_FILE = 'twitter-viral-state.json';
const SEARCH_CONTEXT_FILE = 'twitter-search-context.json';

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

function loadSearchContext(): SearchContext | null {
  try {
    if (fs.existsSync(SEARCH_CONTEXT_FILE)) {
      const context = JSON.parse(fs.readFileSync(SEARCH_CONTEXT_FILE, 'utf-8'));
      // Check if context has expired
      if (context.current_focus?.expires_at) {
        const expiryDate = new Date(context.current_focus.expires_at);
        if (expiryDate < new Date()) {
          console.log('  ⚠️  Search context expired, will use fallback');
          return null;
        }
      }
      return context;
    }
  } catch (e) {
    console.log('  ⚠️  Could not load search context');
  }
  return null;
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
    lastPostTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    dailyLikes: { date: new Date().toISOString().split('T')[0], count: 0 },
    dailyFollows: { date: new Date().toISOString().split('T')[0], count: 0 },
    likedTweets: [],
    followedAccounts: []
  };
}

async function main() {
  console.log('📋 Preparing Twitter engagement queue...\n');

  // Determine search query using three-tier system
  let searchQuery: string;
  let querySource: string;

  // Priority 1: Dynamic search context file
  const searchContext = loadSearchContext();
  let timeWindow = '24h';  // Default time window
  let queryType: 'Top' | 'Latest' = 'Top';  // Default to Top

  if (searchContext?.current_focus?.query) {
    searchQuery = searchContext.current_focus.query;
    querySource = 'dynamic context';
    if (searchContext.current_focus.reason) {
      console.log(`📍 Search focus: ${searchContext.current_focus.reason}`);
    }
    if (searchContext.current_focus.time_window) {
      timeWindow = searchContext.current_focus.time_window;
    }
    if (searchContext.current_focus.query_type) {
      queryType = searchContext.current_focus.query_type;
    }
  }
  // Priority 2: Environment variable
  else if (process.env.TWITTER_SEARCH_QUERY) {
    searchQuery = process.env.TWITTER_SEARCH_QUERY;
    querySource = 'env variable';
  }
  // Priority 3: Default fallback
  else {
    searchQuery = '(autonomous agents OR AI agents OR openclaw) min_faves:50 -is:retweet lang:en';
    querySource = 'default';
    console.log('💡 Tip: Create twitter-search-context.json or set TWITTER_SEARCH_QUERY to customize');
  }

  // Append time filter to query if not already present
  if (!searchQuery.includes('within_time:') && !searchQuery.includes('since:')) {
    searchQuery = `${searchQuery} within_time:${timeWindow}`;
  }

  console.log(`🔍 Query source: ${querySource}`);
  console.log(`🔍 Search query: "${searchQuery.substring(0, 80)}${searchQuery.length > 80 ? '...' : ''}"`);
  console.log(`⏰ Time window: ${timeWindow} | Type: ${queryType}\n`);

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
  let qualitySearch: any = null;
  try {
    qualitySearch = await client.search.advancedSearch({
      query: searchQuery,
      queryType: queryType
    });

    const unengaged = qualitySearch.data
      .filter((t: any) =>
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

  // PRIORITY 2: Mechanical likes and follows
  console.log('\n🤖 Adding mechanical actions (likes/follows)...');

  // Reset daily counters if new day
  const today = new Date().toISOString().split('T')[0];
  if (state.dailyLikes?.date !== today) {
    state.dailyLikes = { date: today, count: 0 };
  }
  if (state.dailyFollows?.date !== today) {
    state.dailyFollows = { date: today, count: 0 };
  }

  // Add likes for quality tweets (max 10 per cycle, 30 per day)
  if (state.dailyLikes.count < 30) {
    const tweetsToLike = qualitySearch?.data
      ?.filter((t: any) =>
        !state.likedTweets?.includes(t.id) &&
        !queue.items.some(item => item.context.tweetId === t.id && item.type === 'like')
      )
      .slice(0, Math.min(5, 30 - state.dailyLikes.count));

    for (const tweet of tweetsToLike || []) {
      const queueItem: QueueItem = {
        id: `like-${tweet.id}`,
        type: 'like',
        status: 'ready',  // No LLM needed
        context: {
          tweet: tweet,
          username: tweet.username,
          text: tweet.text,
          tweetId: tweet.id
        },
        prompt: '',  // No prompt needed
        created_at: new Date().toISOString()
      };

      queue.items.push(queueItem);
      addedItems++;
      console.log(`  ✅ Added like for @${tweet.username}'s tweet`);
    }
  }

  // Add follows for quality accounts (max 5 per cycle, 20 per day)
  if (state.dailyFollows.count < 20) {
    const accountsToFollow = qualitySearch?.data
      ?.filter((t: any) =>
        t.username &&
        !state.followedAccounts?.includes(t.username) &&
        !queue.items.some(item => item.context.username === t.username && item.type === 'follow')
      )
      .map((t: any) => ({ username: t.username, userId: t.userId || t.username }))
      .filter((v: any, i: number, a: any[]) => a.findIndex(t => t.username === v.username) === i)  // Unique
      .slice(0, Math.min(3, 20 - state.dailyFollows.count));

    for (const account of accountsToFollow) {
      const queueItem: QueueItem = {
        id: `follow-${account.username}-${Date.now()}`,
        type: 'follow',
        status: 'ready',  // No LLM needed
        context: {
          username: account.username,
          userId: account.userId
        },
        prompt: '',  // No prompt needed
        created_at: new Date().toISOString()
      };

      queue.items.push(queueItem);
      addedItems++;
      console.log(`  ✅ Added follow for @${account.username}`);
    }
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