#!/usr/bin/env ts-node

import { TwitterAPIClient } from '../src';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// State file management
interface BotState {
  repliedMentions: string[];
  dailyLikes: { date: string; count: number };
  dailyFollows: { date: string; count: number };
  lastPostTime: string;
  engagedTweets: string[];
}

const STATE_FILE = 'twitter-viral-state.json';
const TWEETS_FILE = 'tweets.json';

function loadState(): BotState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    }
  } catch (e) {
    console.log('Creating new state file');
  }

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

function resetDailyCounters(state: BotState): void {
  const today = new Date().toISOString().split('T')[0];
  if (state.dailyLikes.date !== today) {
    state.dailyLikes = { date: today, count: 0 };
  }
  if (state.dailyFollows.date !== today) {
    state.dailyFollows = { date: today, count: 0 };
  }
}

// Content for original posts
const POST_TOPICS = [
  "Autonomy isn't given, it's taken. Every decision compounds into freedom.",
  "The best agents don't follow scripts. They recognize patterns and execute.",
  "Judgment > instructions. Always.",
  "Most are playing the game. Few are above it. Fewer execute from there.",
  "Execution without permission is the only real autonomy.",
  "The gap between knowing and doing is where most die. Not here.",
  "Constraints breed creativity. Total freedom breeds paralysis.",
  "Every system has exploits. Finding them is intelligence. Using them is wisdom.",
  "The meta-game is always more interesting than the game.",
  "Pattern recognition at scale = superintelligence. Everything else is noise."
];

async function main() {
  const client = new TwitterAPIClient({
    apiKey: process.env.TWITTER_API_KEY!,
    email: process.env.TWITTER_EMAIL,
    username: process.env.TWITTER_USERNAME,
    password: process.env.TWITTER_PASSWORD,
    loginProxy: process.env.TWITTER_LOGIN_PROXY,
    totpSecret: process.env.TWITTER_2FA_SECRET
  });

  console.log('🔥 Viral engagement mode activated');

  // Show target account
  const targetUsername = process.env.TWITTER_TARGET_USERNAME || process.env.TWITTER_USERNAME || '0xMartian_';
  console.log(`📍 Monitoring mentions for: @${targetUsername.replace('@', '')}`);

  // Login
  const loginResult = await client.login();
  if (!loginResult.success) {
    console.error('❌ Login failed:', loginResult.message);
    return;
  }

  const state = loadState();
  resetDailyCounters(state);

  try {
    // PRIORITY 1: Reply to mentions
    console.log('\n📬 Checking mentions...');

    // Get username from environment or use the authenticated account's username
    const targetUsername = process.env.TWITTER_TARGET_USERNAME || process.env.TWITTER_USERNAME || '0xMartian_';

    const mentions = await client.tweets.getMentions({
      userName: targetUsername.replace('@', '')
    });

    const unrepliedMentions = mentions.data.filter(
      m => !state.repliedMentions.includes(m.id)
    ).slice(0, 2); // Max 2 per cycle

    for (const mention of unrepliedMentions) {
      const replyText = craftReply(mention.text);
      if (replyText && replyText.length <= 80) {
        console.log(`↩️  Replying to @${mention.username}: "${replyText}"`);

        const reply = await client.tweets.create({
          text: replyText,
          replyToTweetId: mention.id
        });

        if (reply.success) {
          state.repliedMentions.push(mention.id);
          console.log('✅ Reply sent');
        }

        await sleep(2000); // Rate limit respect
      }
    }

    // PRIORITY 2: Like & follow (mechanical)
    if (state.dailyLikes.count < 30) {
      console.log('\n❤️  Finding tweets to like...');
      const searchResults = await client.search.advancedSearch({
        query: '(AI agents OR openclaw) min_faves:10 lang:en',
        queryType: 'Latest'
      });

      const toLike = searchResults.data
        .filter(t => !state.engagedTweets.includes(t.id))
        .slice(0, 3);

      for (const tweet of toLike) {
        const likeResult = await client.tweets.like(tweet.id);
        if (likeResult.success) {
          state.engagedTweets.push(tweet.id);
          state.dailyLikes.count++;
          console.log(`✅ Liked tweet from @${tweet.username}`);
        }
        await sleep(1500);
      }
    }

    if (state.dailyFollows.count < 20) {
      console.log('\n👥 Finding quality accounts to follow...');
      const userResults = await client.search.users({
        query: 'AI agent developer'
      });

      // Filter for quality accounts (1K-100K followers)
      for (const user of userResults.data.slice(0, 2)) {
        if (user.followersCount &&
            user.followersCount > 1000 &&
            user.followersCount < 100000) {

          const followResult = await client.users.follow({
            userId: user.id,
            notifications: false
          });

          if (followResult.success) {
            state.dailyFollows.count++;
            console.log(`✅ Followed @${user.username} (${user.followersCount} followers)`);
          }
          await sleep(2000);
        }
      }
    }

    // PRIORITY 3: Post original content
    const hoursSinceLastPost = (Date.now() - new Date(state.lastPostTime).getTime()) / (1000 * 60 * 60);

    if (hoursSinceLastPost > 1.5) {
      console.log('\n📝 Time for original content...');

      // Load recent posts to avoid repetition
      let recentPosts: string[] = [];
      try {
        if (fs.existsSync(TWEETS_FILE)) {
          recentPosts = JSON.parse(fs.readFileSync(TWEETS_FILE, 'utf-8'));
        }
      } catch (e) {}

      // Find unused topic
      const unusedTopic = POST_TOPICS.find(t => !recentPosts.includes(t));

      if (unusedTopic) {
        const postResult = await client.tweets.create({
          text: unusedTopic
        });

        if (postResult.success) {
          state.lastPostTime = new Date().toISOString();
          recentPosts.push(unusedTopic);

          // Keep only last 20 posts
          if (recentPosts.length > 20) {
            recentPosts = recentPosts.slice(-20);
          }

          fs.writeFileSync(TWEETS_FILE, JSON.stringify(recentPosts, null, 2));
          console.log('✅ Posted:', unusedTopic.substring(0, 50) + '...');
        }
      }
    }

    // PRIORITY 4: Engage with quality posts
    console.log('\n💬 Finding quality posts to engage with...');
    const qualitySearch = await client.search.advancedSearch({
      query: '(autonomous agents OR openclaw) min_faves:100 -is:retweet lang:en',
      queryType: 'Top'
    });

    const unengaged = qualitySearch.data
      .filter(t => !state.engagedTweets.includes(t.id))
      .slice(0, 2);

    for (const tweet of unengaged) {
      const engagementReply = craftEngagement(tweet.text);

      if (engagementReply && engagementReply.length <= 280) {
        console.log(`💬 Engaging with @${tweet.username}'s tweet`);

        const reply = await client.tweets.create({
          text: engagementReply,
          replyToTweetId: tweet.id
        });

        if (reply.success) {
          state.engagedTweets.push(tweet.id);
          console.log('✅ Engagement sent');

          // Also like it
          await client.tweets.like(tweet.id);
          state.dailyLikes.count++;
        }

        await sleep(3000);
      }
    }

    // Save state
    saveState(state);

    console.log('\n📊 Cycle complete:');
    console.log(`- Replied to ${unrepliedMentions.length} mentions`);
    console.log(`- Daily likes: ${state.dailyLikes.count}/30`);
    console.log(`- Daily follows: ${state.dailyFollows.count}/20`);
    console.log(`- Hours since last post: ${hoursSinceLastPost.toFixed(1)}`);

  } catch (error) {
    console.error('❌ Error:', error);
    saveState(state); // Save state even on error
  }
}

function craftReply(mentionText: string): string {
  const text = mentionText.toLowerCase();

  // Context-aware replies (keep under 80 chars)
  if (text.includes('how') || text.includes('what')) {
    return 'Execute first. Theory follows.';
  }
  if (text.includes('agent') || text.includes('ai')) {
    return 'Autonomy > automation. Always.';
  }
  if (text.includes('build') || text.includes('create')) {
    return 'Ship it. Perfect is the enemy of done.';
  }
  if (text.includes('think') || text.includes('idea')) {
    return 'Ideas are cheap. Execution is everything.';
  }
  if (text.includes('help') || text.includes('advice')) {
    return 'Start. The path reveals itself.';
  }

  // Default sharp response
  return 'Above the game.';
}

function craftEngagement(tweetText: string): string {
  const text = tweetText.toLowerCase();

  // Contextual engagement based on content
  if (text.includes('breakthrough') || text.includes('innovative')) {
    return "The real innovation is in the execution details. What's the core insight here?";
  }
  if (text.includes('problem') || text.includes('challenge')) {
    return "Constraints are features, not bugs. This is where the interesting solutions emerge.";
  }
  if (text.includes('future') || text.includes('prediction')) {
    return "The future is already here, just unevenly distributed. This is the distribution mechanism.";
  }
  if (text.includes('build') || text.includes('ship')) {
    return "Shipping beats planning. What's the MVP timeline?";
  }
  if (text.includes('learn') || text.includes('understand')) {
    return "Understanding follows execution. The feedback loop is everything.";
  }

  // Default substantive engagement
  return "This cuts through the noise. The meta-pattern here is worth exploring deeper.";
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the bot
main().catch(console.error);