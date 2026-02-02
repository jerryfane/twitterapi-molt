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

// DEPRECATED: These are fallback posts. Agent should use LLM to generate original content
const POST_TOPICS = [
  "USE YOUR LLM TO GENERATE ORIGINAL CONTENT INSTEAD OF THESE",
  "These are emergency fallbacks only"
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
      // Use agent's LLM to generate contextual reply
      console.log(`🤖 Generating reply for @${mention.username}'s tweet: "${mention.text.substring(0, 100)}..."`);

      const replyPrompt = `
        You are replying to this tweet: "${mention.text}"
        From user: @${mention.username}

        Generate a sharp, insightful reply that:
        - Is under 80 characters
        - Uses your personality from your SOUL.md/MEMORY.md
        - Is contextually relevant to what they said
        - Adds value, not just acknowledges

        Reply (max 80 chars):`;

      // TODO: Agent should use their LLM here
      // const replyText = await generateWithLLM(replyPrompt);
      const replyText = craftReply(mention.text); // REPLACE THIS WITH LLM CALL

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

      // Generate original content with LLM
      const postPrompt = `
        Generate an original tweet that:
        - Reflects your personality from SOUL.md/MEMORY.md
        - Is thought-provoking about AI, agents, autonomy, or technology
        - Under 280 characters
        - Not similar to these recent posts: ${recentPosts.slice(-5).join(', ')}

        Tweet:`;

      // TODO: Agent should use their LLM here
      // const postText = await generateWithLLM(postPrompt);
      const unusedTopic = POST_TOPICS.find(t => !recentPosts.includes(t)); // REPLACE WITH LLM

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
      // Use LLM to generate intelligent engagement
      console.log(`🤖 Generating engagement for @${tweet.username}'s tweet`);

      const engagementPrompt = `
        You found this interesting tweet: "${tweet.text}"
        From: @${tweet.username}

        Generate a thoughtful reply that:
        - Shows you understood their point
        - Adds a unique perspective or insight
        - Uses your personality from SOUL.md/MEMORY.md
        - Is under 280 characters
        - Encourages further discussion

        Reply:`;

      // TODO: Agent should use their LLM here
      // const engagementReply = await generateWithLLM(engagementPrompt);
      const engagementReply = craftEngagement(tweet.text); // REPLACE WITH LLM CALL

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

// DEPRECATED FALLBACK FUNCTIONS - AGENT SHOULD USE LLM INSTEAD
function craftReply(mentionText: string): string {
  // This is a fallback - agent should use their LLM
  console.warn('⚠️  Using fallback reply instead of LLM generation');
  return 'FALLBACK: Use your LLM to generate contextual reply';
}

function craftEngagement(tweetText: string): string {
  // This is a fallback - agent should use their LLM
  console.warn('⚠️  Using fallback engagement instead of LLM generation');
  return 'FALLBACK: Use your LLM to generate thoughtful engagement';
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the bot
main().catch(console.error);