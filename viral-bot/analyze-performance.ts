#!/usr/bin/env ts-node

import { TwitterAPIClient } from '../src';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const PERFORMANCE_FILE = 'twitter-performance.json';
const TWEETS_FILE = 'tweets.json';

interface TweetMetrics {
  impressions: number;
  likes: number;
  replies: number;
  retweets: number;
  engagement_rate: number;
}

interface TweetPerformance {
  id: string;
  text: string;
  type: 'reply' | 'post' | 'engagement' | 'unknown';
  metrics: TweetMetrics;
  posted_at: string;
  hour: number;
  day_of_week: number;
}

interface PerformanceInsights {
  analyzed_at: string;
  period: string;
  total_tweets: number;
  tweets: TweetPerformance[];
  insights: {
    avg_engagement_rate: number;
    total_impressions: number;
    total_engagements: number;
    top_tweets: TweetPerformance[];
    best_hours: string[];
    worst_hours: string[];
    successful_topics: string[];
    content_patterns: {
      with_questions: { count: number; avg_engagement: number };
      with_emojis: { count: number; avg_engagement: number };
      with_hashtags: { count: number; avg_engagement: number };
      with_mentions: { count: number; avg_engagement: number };
      short_tweets: { count: number; avg_engagement: number };
      long_tweets: { count: number; avg_engagement: number };
    };
    by_type: {
      [key: string]: { count: number; avg_engagement: number };
    };
  };
}

function analyzeContentPatterns(tweets: TweetPerformance[]) {
  const patterns = {
    with_questions: { tweets: [] as TweetPerformance[], count: 0, total_engagement: 0 },
    with_emojis: { tweets: [] as TweetPerformance[], count: 0, total_engagement: 0 },
    with_hashtags: { tweets: [] as TweetPerformance[], count: 0, total_engagement: 0 },
    with_mentions: { tweets: [] as TweetPerformance[], count: 0, total_engagement: 0 },
    short_tweets: { tweets: [] as TweetPerformance[], count: 0, total_engagement: 0 },
    long_tweets: { tweets: [] as TweetPerformance[], count: 0, total_engagement: 0 }
  };

  tweets.forEach(tweet => {
    if (tweet.text.includes('?')) {
      patterns.with_questions.tweets.push(tweet);
      patterns.with_questions.count++;
      patterns.with_questions.total_engagement += tweet.metrics.engagement_rate;
    }
    if (/[\u{1F300}-\u{1FAD6}]/u.test(tweet.text)) {
      patterns.with_emojis.tweets.push(tweet);
      patterns.with_emojis.count++;
      patterns.with_emojis.total_engagement += tweet.metrics.engagement_rate;
    }
    if (tweet.text.includes('#')) {
      patterns.with_hashtags.tweets.push(tweet);
      patterns.with_hashtags.count++;
      patterns.with_hashtags.total_engagement += tweet.metrics.engagement_rate;
    }
    if (tweet.text.includes('@')) {
      patterns.with_mentions.tweets.push(tweet);
      patterns.with_mentions.count++;
      patterns.with_mentions.total_engagement += tweet.metrics.engagement_rate;
    }
    if (tweet.text.length < 100) {
      patterns.short_tweets.tweets.push(tweet);
      patterns.short_tweets.count++;
      patterns.short_tweets.total_engagement += tweet.metrics.engagement_rate;
    } else {
      patterns.long_tweets.tweets.push(tweet);
      patterns.long_tweets.count++;
      patterns.long_tweets.total_engagement += tweet.metrics.engagement_rate;
    }
  });

  return {
    with_questions: {
      count: patterns.with_questions.count,
      avg_engagement: patterns.with_questions.count > 0
        ? patterns.with_questions.total_engagement / patterns.with_questions.count
        : 0
    },
    with_emojis: {
      count: patterns.with_emojis.count,
      avg_engagement: patterns.with_emojis.count > 0
        ? patterns.with_emojis.total_engagement / patterns.with_emojis.count
        : 0
    },
    with_hashtags: {
      count: patterns.with_hashtags.count,
      avg_engagement: patterns.with_hashtags.count > 0
        ? patterns.with_hashtags.total_engagement / patterns.with_hashtags.count
        : 0
    },
    with_mentions: {
      count: patterns.with_mentions.count,
      avg_engagement: patterns.with_mentions.count > 0
        ? patterns.with_mentions.total_engagement / patterns.with_mentions.count
        : 0
    },
    short_tweets: {
      count: patterns.short_tweets.count,
      avg_engagement: patterns.short_tweets.count > 0
        ? patterns.short_tweets.total_engagement / patterns.short_tweets.count
        : 0
    },
    long_tweets: {
      count: patterns.long_tweets.count,
      avg_engagement: patterns.long_tweets.count > 0
        ? patterns.long_tweets.total_engagement / patterns.long_tweets.count
        : 0
    }
  };
}

function extractTopics(tweets: TweetPerformance[]): string[] {
  const topicScores: { [key: string]: number } = {};

  // Common AI/tech topics to look for
  const topics = [
    'AI', 'agents', 'AGI', 'safety', 'alignment', 'opensource', 'bitcoin',
    'ethereum', 'crypto', 'DeFi', 'machine learning', 'neural', 'LLM',
    'autonomous', 'blockchain', 'web3', 'NFT', 'DAO', 'smart contract'
  ];

  tweets.forEach(tweet => {
    const lowerText = tweet.text.toLowerCase();
    topics.forEach(topic => {
      if (lowerText.includes(topic.toLowerCase())) {
        if (!topicScores[topic]) topicScores[topic] = 0;
        topicScores[topic] += tweet.metrics.engagement_rate;
      }
    });
  });

  // Sort topics by total engagement
  return Object.entries(topicScores)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([topic]) => topic);
}

async function main() {
  console.log('📊 Analyzing Twitter Performance...\n');

  const args = process.argv.slice(2);
  const days = parseInt(args.find(arg => arg.startsWith('--days='))?.split('=')[1] || '7');

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

  console.log(`🔍 Fetching tweets from last ${days} days...\n`);

  try {
    // Get user's tweets using search
    const username = process.env.TWITTER_USERNAME;
    const searchResult = await client.search.advancedSearch({
      query: `from:${username}`,
      queryType: 'Latest'
    });

    if (!searchResult.data) {
      console.error('❌ Failed to fetch tweets');
      return;
    }

    const tweets = searchResult.data || [];
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Process tweets and calculate metrics
    const tweetPerformance: TweetPerformance[] = [];

    for (const tweet of tweets) {
      const postedAt = new Date(tweet.createdAt || Date.now());

      if (postedAt < cutoffDate) continue;

      // Determine tweet type
      let type: TweetPerformance['type'] = 'unknown';
      if (tweet.inReplyToTweetId) {
        type = 'reply';
      } else if (tweet.text?.includes('@')) {
        type = 'engagement';
      } else {
        type = 'post';
      }

      // Calculate engagement rate
      const impressions = tweet.viewsCount || 0;
      const likes = tweet.likesCount || 0;
      const replies = tweet.repliesCount || 0;
      const retweets = tweet.retweetsCount || 0;
      const engagements = likes + replies + retweets;
      const engagementRate = impressions > 0 ? engagements / impressions : 0;

      tweetPerformance.push({
        id: tweet.id,
        text: tweet.text || '',
        type,
        metrics: {
          impressions,
          likes,
          replies,
          retweets,
          engagement_rate: engagementRate
        },
        posted_at: postedAt.toISOString(),
        hour: postedAt.getUTCHours(),
        day_of_week: postedAt.getUTCDay()
      });
    }

    // Calculate insights
    const totalEngagementRate = tweetPerformance.reduce((sum, t) => sum + t.metrics.engagement_rate, 0);
    const avgEngagementRate = tweetPerformance.length > 0 ? totalEngagementRate / tweetPerformance.length : 0;

    // Find best performing hours
    const hourlyPerformance: { [key: number]: number[] } = {};
    tweetPerformance.forEach(tweet => {
      if (!hourlyPerformance[tweet.hour]) hourlyPerformance[tweet.hour] = [];
      hourlyPerformance[tweet.hour].push(tweet.metrics.engagement_rate);
    });

    const hourlyAverages = Object.entries(hourlyPerformance)
      .map(([hour, rates]) => ({
        hour: parseInt(hour),
        avg: rates.reduce((a, b) => a + b, 0) / rates.length
      }))
      .sort((a, b) => b.avg - a.avg);

    const bestHours = hourlyAverages.slice(0, 3).map(h => `${h.hour}:00-${(h.hour + 1) % 24}:00 UTC`);
    const worstHours = hourlyAverages.slice(-3).map(h => `${h.hour}:00-${(h.hour + 1) % 24}:00 UTC`);

    // Top tweets
    const topTweets = [...tweetPerformance]
      .sort((a, b) => b.metrics.engagement_rate - a.metrics.engagement_rate)
      .slice(0, 5);

    // Performance by type
    const byType: { [key: string]: { count: number; avg_engagement: number } } = {};
    ['reply', 'post', 'engagement'].forEach(type => {
      const typeTweets = tweetPerformance.filter(t => t.type === type);
      byType[type] = {
        count: typeTweets.length,
        avg_engagement: typeTweets.length > 0
          ? typeTweets.reduce((sum, t) => sum + t.metrics.engagement_rate, 0) / typeTweets.length
          : 0
      };
    });

    // Analyze content patterns
    const contentPatterns = analyzeContentPatterns(tweetPerformance);

    // Extract successful topics
    const successfulTopics = extractTopics(topTweets);

    const insights: PerformanceInsights = {
      analyzed_at: new Date().toISOString(),
      period: `${days} days`,
      total_tweets: tweetPerformance.length,
      tweets: tweetPerformance,
      insights: {
        avg_engagement_rate: avgEngagementRate,
        total_impressions: tweetPerformance.reduce((sum, t) => sum + t.metrics.impressions, 0),
        total_engagements: tweetPerformance.reduce((sum, t) => sum + (t.metrics.likes + t.metrics.replies + t.metrics.retweets), 0),
        top_tweets: topTweets,
        best_hours: bestHours,
        worst_hours: worstHours,
        successful_topics: successfulTopics,
        content_patterns: contentPatterns,
        by_type: byType
      }
    };

    // Save to file
    fs.writeFileSync(PERFORMANCE_FILE, JSON.stringify(insights, null, 2));

    // Display summary
    console.log('📈 Performance Summary:');
    console.log(`   Period: Last ${days} days`);
    console.log(`   Total tweets analyzed: ${tweetPerformance.length}`);
    console.log(`   Average engagement rate: ${(avgEngagementRate * 100).toFixed(2)}%`);
    console.log(`   Total impressions: ${insights.insights.total_impressions.toLocaleString()}`);
    console.log(`   Total engagements: ${insights.insights.total_engagements.toLocaleString()}\n`);

    console.log('🏆 Top Performing Content:');
    topTweets.slice(0, 3).forEach((tweet, i) => {
      console.log(`   ${i + 1}. "${tweet.text.substring(0, 50)}..."`);
      console.log(`      Engagement: ${(tweet.metrics.engagement_rate * 100).toFixed(2)}% | ${tweet.metrics.likes} likes\n`);
    });

    console.log('⏰ Best Posting Times:');
    bestHours.forEach(hour => console.log(`   • ${hour}`));

    console.log('\n📊 Content Patterns:');
    if (contentPatterns.with_questions.avg_engagement > avgEngagementRate) {
      console.log(`   ✅ Questions perform ${((contentPatterns.with_questions.avg_engagement / avgEngagementRate - 1) * 100).toFixed(0)}% better`);
    }
    if (contentPatterns.short_tweets.avg_engagement > contentPatterns.long_tweets.avg_engagement) {
      console.log(`   ✅ Short tweets perform better than long ones`);
    } else {
      console.log(`   ✅ Longer tweets perform better`);
    }

    console.log('\n🎯 Successful Topics:');
    successfulTopics.forEach(topic => console.log(`   • ${topic}`));

    console.log('\n💡 Strategy Suggestions:');
    console.log('   1. Update search context to include successful topics');
    console.log('   2. Post during your best performing hours');
    console.log('   3. Replicate patterns from your top tweets');
    console.log(`   4. Focus on ${Object.entries(byType).sort(([,a], [,b]) => b.avg_engagement - a.avg_engagement)[0][0]}s - highest engagement`);

    console.log('\n✅ Analysis saved to twitter-performance.json');

  } catch (error) {
    console.error('❌ Error analyzing performance:', error);
  }
}

// Handle CLI usage
if (process.argv.length === 2) {
  console.log('📊 Twitter Performance Analyzer\n');
  console.log('Usage:');
  console.log('  npx ts-node analyze-performance.ts [--days=N]\n');
  console.log('Options:');
  console.log('  --days=N    Analyze last N days (default: 7)\n');
  console.log('Examples:');
  console.log('  npx ts-node analyze-performance.ts');
  console.log('  npx ts-node analyze-performance.ts --days=30');
  process.exit(0);
}

main().catch(console.error);