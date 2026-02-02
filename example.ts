import { TwitterAPIClient } from './src';
import * as dotenv from 'dotenv';

dotenv.config();

async function example() {
  // Validate required API key
  if (!process.env.TWITTER_API_KEY) {
    throw new Error('TWITTER_API_KEY environment variable is required. Get one from https://twitterapi.io/?ref=0xmartian');
  }

  // Initialize the client with configuration
  const client = new TwitterAPIClient({
    baseUrl: process.env.TWITTER_API_BASE_URL,
    apiKey: process.env.TWITTER_API_KEY,
    email: process.env.TWITTER_EMAIL,
    username: process.env.TWITTER_USERNAME,
    password: process.env.TWITTER_PASSWORD,
    loginProxy: process.env.TWITTER_LOGIN_PROXY,
    totpSecret: process.env.TWITTER_2FA_SECRET,
    maxQPS: parseInt(process.env.TWITTER_MAX_QPS || '200'),
    timeout: parseInt(process.env.TWITTER_TIMEOUT || '30000')
  });

  try {
    // Login (will use saved cookie if available, otherwise login with credentials)
    console.log('Authenticating...');
    const loginResult = await client.login();

    if (loginResult.success) {
      console.log('Authentication successful!');
    } else {
      console.error('Authentication failed:', loginResult.message);
      return;
    }

    // Verify authentication
    const isValid = await client.verifyAuthentication();
    console.log('Authentication valid:', isValid);

    // Example: Create a tweet
    console.log('\nCreating a tweet...');
    const tweetResult = await client.tweets.create({
      text: 'Hello from Twitter API wrapper! 🚀'
    });
    console.log('Tweet created:', tweetResult);

    // Example: Search for tweets
    console.log('\nSearching for tweets...');
    const searchResults = await client.search.tweets({
      query: 'TypeScript programming',
      limit: 5,
      filter: {
        minLikes: 10,
        isVerified: true
      }
    });
    console.log(`Found ${searchResults.data.length} tweets`);
    searchResults.data.forEach(tweet => {
      console.log(`- @${tweet.username}: ${tweet.text.substring(0, 50)}...`);
    });

    // Example: Get user information
    console.log('\nGetting user information...');
    const user = await client.users.getByUsername('twitter');
    console.log('User info:', {
      name: user.name,
      username: user.username,
      followers: user.followersCount,
      verified: user.isVerified
    });

    // Example: Get home timeline
    console.log('\nGetting home timeline...');
    const timeline = await client.tweets.getHomeTimeline({
      limit: 3
    });
    console.log(`Timeline has ${timeline.data.length} tweets`);

    // Example: Follow a user
    console.log('\nFollowing a user...');
    const followResult = await client.users.follow({
      userId: user.id,
      notifications: false
    });
    console.log('Follow result:', followResult);

    // Check rate limit info
    const rateLimitInfo = client.getRateLimitInfo('/twitter/tweet/create');
    if (rateLimitInfo) {
      console.log('\nRate limit info:', rateLimitInfo);
    }

    // Monitor queue
    console.log('\nQueue status:');
    console.log('Queue size:', client.queueSize);
    console.log('Pending requests:', client.pendingRequests);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Wait for all pending requests to complete
    await client.waitForIdle();
    console.log('\nAll requests completed');
  }
}

// Run the example
if (require.main === module) {
  example().catch(console.error);
}