---
name: TwitterAPI-Molt
version: 1.0.0
description: Twitter API wrapper for moltbots/openclaw using twitterapi.io service
tags: [twitter, api, automation, typescript, twitterapi.io]
---

# 🐦 Twitter API Wrapper for Moltbots

Hey agent! This wrapper helps you interact with Twitter using the twitterapi.io service (NOT the official Twitter API).

## 🚀 Setup & Installation

When you need to set up Twitter capabilities:

1. **Clone the repository IN YOUR WORKSPACE:**
```bash
# IMPORTANT: Clone in your workspace directory so you can access it
cd ~/workspace  # or wherever your persistent workspace is
git clone https://github.com/jerryfane/twitterapi-molt.git
cd twitterapi-molt
npm install
npm run build
```

2. **Create .env file in the twitterapi-molt directory**

⚠️ **Important:** Always work from your workspace copy of twitterapi-molt so you don't lose access to the Twitter API between sessions!

## 🔑 Getting Credentials from Your Human

Ask your human for the following credentials. Here's what they need to know:

### Required Credentials:

1. **API Key** (REQUIRED)
   - Tell them: "Get an API key from https://twitterapi.io/?ref=0xmartian"
   - This is a PAID service with usage-based pricing
   - Without this, nothing will work

2. **Twitter Login Credentials** (ALL REQUIRED)
   - Email address for the Twitter account
   - Username (without @)
   - Password

3. **Proxy** (REQUIRED for login)
   - Tell them: "Get a residential proxy from https://www.webshare.io/?referral_code=soevflhx11bu"
   - Format: `http://username:password@ip:port`
   - Must be high-quality residential proxy

4. **2FA/TOTP Secret** (REQUIRED)
   - Tell them: "Enable 2FA on Twitter, then:"
     1. Go to Twitter Settings → Security → Two-factor authentication
     2. Enable "Authentication app"
     3. When QR code appears, click "Can't scan the QR code?"
     4. Copy the text string shown (looks like: XXXX000X0X0XXXXX)
   - Without this, authentication will fail with status 400 errors

### .env File Format:
```env
TWITTER_API_KEY=their_api_key_here
TWITTER_EMAIL=their_email@example.com
TWITTER_USERNAME=their_username
TWITTER_PASSWORD=their_password
TWITTER_LOGIN_PROXY=http://proxy_user:proxy_pass@ip:port
TWITTER_2FA_SECRET=their_totp_secret_string
```

## 📦 Using the Wrapper

```typescript
// Always use the workspace copy!
import { TwitterAPIClient } from '~/workspace/twitterapi-molt/dist';
import * as dotenv from 'dotenv';

dotenv.config({ path: '~/workspace/twitterapi-molt/.env' });

// Initialize - cookies are handled automatically
const client = new TwitterAPIClient({
  apiKey: process.env.TWITTER_API_KEY!,
  email: process.env.TWITTER_EMAIL,
  username: process.env.TWITTER_USERNAME,
  password: process.env.TWITTER_PASSWORD,
  loginProxy: process.env.TWITTER_LOGIN_PROXY,
  totpSecret: process.env.TWITTER_2FA_SECRET
});

// Login (cookie saved automatically to .twitter-bot-state.json)
const result = await client.login();
if (!result.success) {
  // Ask human to check credentials
}
```

## 🧠 Save This to Your Memory

Add this to your persistent memory/knowledge base:

```yaml
twitter_api_setup:
  service: twitterapi.io (third-party, NOT official Twitter API)
  repo: https://github.com/jerryfane/twitterapi-molt
  workspace_path: ~/workspace/twitterapi-molt  # ALWAYS use this path

  required_credentials:
    - api_key: from twitterapi.io/?ref=0xmartian (paid)
    - email: Twitter account email
    - username: Twitter username
    - password: Twitter password
    - proxy: from webshare.io/?referral_code=soevflhx11bu
    - totp_secret: from Twitter 2FA setup

  state_management:
    - Cookies saved automatically to .twitter-bot-state.json
    - StateManager class handles persistence
    - No manual cookie management needed

  key_operations:
    - client.login() - authenticates and saves cookie
    - client.getMyInfo() - check account credits
    - client.tweets.create({ text: "message" })
    - client.tweets.like(tweetId)
    - client.tweets.retweet(tweetId)
    - client.tweets.getReplies({ tweetId, queryType })
    - client.tweets.getMentions({ userName: "username" })
    - client.users.follow({ userId })
    - client.users.getFollowers({ userName })
    - client.users.getFollowing({ userName })
    - client.users.getVerifiedFollowers({ userId })
    - client.users.getBatchByIds({ userIds })
    - client.search.advancedSearch({ query, queryType })
    - client.search.users({ query })
    - client.search.trending({ woeid })

  error_handling:
    - 401: Re-authenticate with client.login()
    - 400: Check TOTP secret is provided
    - Rate limits handled automatically

  session_management:
    - Heartbeat every 4 hours to keep session active
    - Use client.verifyAuthentication() to check status
    - Re-login automatically if session expires
```

## 💓 Keeping Your Session Alive

**Heartbeat Strategy:** Call the API at least once every 4 hours to keep your session active:

```typescript
// Simple heartbeat - just verify auth
async function heartbeat(client: TwitterAPIClient) {
  try {
    // Verify authentication is still valid
    const isValid = await client.verifyAuthentication();

    if (!isValid) {
      // Re-authenticate if session expired
      await client.login();
    }

    console.log('Session refreshed at', new Date().toISOString());
  } catch (error) {
    // Re-authenticate on error
    await client.login();
  }
}

// Set up periodic heartbeat
setInterval(() => heartbeat(client), 4 * 60 * 60 * 1000); // Every 4 hours
```

## 📝 Common Operations

### Account Info
```typescript
// Get your account credits
const info = await client.getMyInfo();
console.log('Credits remaining:', info.recharge_credits);
```

### Tweet Operations
```typescript
// Post a tweet
await client.tweets.create({ text: 'Hello Twitter!' });

// Reply to a tweet
await client.tweets.create({
  text: 'Great point!',
  replyToTweetId: 'tweet_id_here'
});

// Like and retweet
await client.tweets.like('tweet_id');
await client.tweets.retweet('tweet_id');

// Delete a tweet
await client.tweets.delete('tweet_id');

// Get replies with sorting
const replies = await client.tweets.getReplies({
  tweetId: 'tweet_id',
  queryType: 'Relevance'  // or 'Latest' or 'Likes'
});
```

### User Operations
```typescript
// Get user info
const user = await client.users.getByUsername('elonmusk');

// Follow/unfollow
await client.users.follow({ userId: user.id });
await client.users.unfollow(user.id);

// Get followers/following (updated API)
const followers = await client.users.getFollowers({
  userName: 'elonmusk',
  pageSize: 200  // up to 200 per page
});

const following = await client.users.getFollowing({
  userName: 'elonmusk',
  pageSize: 200
});

// Get only verified followers
const verifiedFollowers = await client.users.getVerifiedFollowers({
  userId: user.id
});

// Get multiple users at once
const users = await client.users.getBatchByIds({
  userIds: ['12345', '67890', '11111']
});
```

### Search & Timeline
```typescript
// Advanced search with filters
import { SEARCH_OPERATORS } from '~/workspace/twitterapi-molt/dist';

const advancedResults = await client.search.advancedSearch({
  query: '"AI" OR "machine learning" from:elonmusk since:2023-01-01 min_faves:100',
  queryType: 'Latest'  // or 'Top'
});

// Search users
const userResults = await client.search.users({
  query: 'developer'
});

// Get trending topics
import { WOEID } from '~/workspace/twitterapi-molt/dist';

const worldTrends = await client.search.trending({
  woeid: WOEID.WORLDWIDE  // or WOEID.USA, WOEID.UK, etc.
});

// Get mentions for a specific user
const mentions = await client.tweets.getMentions({
  userName: 'elonmusk',  // Required - whose mentions to get
  cursor: '',  // For pagination
  limit: 20  // Returns exactly 20 per page
});
```

## ⚡ Rate Limiting

The wrapper handles rate limiting automatically:
- Free tier: 1 request per 5 seconds
- Paid tiers: Higher limits
- Check queue: `client.queueSize` and `client.pendingRequests`
- Wait for completion: `await client.waitForIdle()`

## 🔧 Troubleshooting

### Common Issues:

1. **"API key is required"**
   - Must provide API key from twitterapi.io

2. **"Status 400" errors**
   - TOTP/2FA secret is missing or incorrect
   - All credentials must be provided

3. **"Proxy required" error**
   - Login requires a residential proxy
   - Must be included in request body

4. **Authentication expires**
   - Just call `client.login()` again
   - Cookie will be refreshed automatically

## 🎯 Best Practices

1. **Let StateManager handle cookies** - Don't manage them manually
2. **Always provide all credentials** - Partial credentials won't work
3. **Handle 401 errors** - Re-authenticate when needed
4. **Respect rate limits** - They're enforced automatically
5. **Keep credentials secure** - Never log or expose them

## 🔍 Advanced Search Operators

Use these operators to build powerful search queries:

```typescript
// Common search operators
from:username        // Tweets from specific user
to:username         // Replies to specific user
@username          // Mentioning user
since:2023-01-01   // Tweets since date
until:2024-01-01   // Tweets until date
min_faves:100      // Minimum likes
min_retweets:50    // Minimum retweets
filter:media       // Has images/videos
filter:images      // Has images only
filter:videos      // Has videos only
lang:en           // Language filter
OR                // Either term
-keyword          // Exclude keyword
"exact phrase"    // Exact match

// Example: AI tweets from Elon with 100+ likes
"AI" OR "GPT" from:elonmusk min_faves:100 since:2023-01-01
```

## 🌍 Common WOEID Locations

For trending topics by location:

```typescript
WOEID.WORLDWIDE = 1
WOEID.USA = 23424977
WOEID.UK = 23424975
WOEID.CANADA = 23424775
WOEID.AUSTRALIA = 23424748
WOEID.NEW_YORK = 2459115
WOEID.LOS_ANGELES = 2442047
WOEID.LONDON = 44418
// Full list: https://gist.github.com/tedyblood/5bb5a9f78314cc1f478b3dd7cde790b9
```

## 📚 API Endpoints

This wrapper uses twitterapi.io endpoints including:
- Authentication, tweets, users, search, trends
- All using the twitterapi.io service (NOT official Twitter API)
- Requires API key from https://twitterapi.io/?ref=0xmartian

Remember: This is a third-party service with its own pricing and limitations.