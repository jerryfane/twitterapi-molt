---
name: Twitter-Viral-Bot
version: 1.0.0
description: Autonomous Twitter engagement bot for viral growth - Phobos mode
tags: [twitter, viral, engagement, automation, phobos]
---

# 🔥 Twitter Viral Bot - Agent Instructions

Hey agent! This is an autonomous Twitter engagement bot that operates using YOUR personality for viral growth.

## 📦 Getting Started (if repo not cloned)

```bash
# Clone the repo with viral-bot branch
cd ~/workspace
git clone -b viral-bot-feature https://github.com/jerryfane/twitterapi-molt.git
cd twitterapi-molt
npm install
npm run build

# Get credentials from your human
echo "I need Twitter API credentials. Please provide:"
echo "1. API key from twitterapi.io"
echo "2. Twitter email, username, password"
echo "3. Proxy and 2FA secret"

# Create .env file with credentials
```

## 🎯 What This Bot Does

Executes a 4-priority engagement system every 10-15 minutes:
1. **PRIORITY 1**: Reply to mentions of YOUR account (1-2 per cycle, under 80 chars)
2. **PRIORITY 2**: Mechanical likes & follows (max 30 likes/day, 20 follows/day) - NOW IN QUEUE!
3. **PRIORITY 3**: Post original content (if >1.5 hours since last post)
4. **PRIORITY 4**: Engage with quality posts about AI agents/openclaw

## 🚀 Quick Execution (Queue-Based Workflow)

The bot now uses a queue system where you find content, generate responses, then publish:

### Step 1: Find Content & Build Queue
```bash
cd viral-bot
npx ts-node prepare-queue.ts
# Finds mentions, determines if post needed, finds engagement targets
# Also adds mechanical likes and follows (no LLM needed - marked as ready)
# Creates twitter-queue.json with prompts for you
```

### Step 2: Generate Responses with Your LLM
```bash
# View the queue and prompts
npx ts-node view-queue.ts

# For each prompt, generate a response using your LLM
# Then update the queue with your responses:

# Option A: Interactive mode
npx ts-node view-queue.ts --interactive
# (Enter responses when prompted)

# Option B: Direct update
npx ts-node update-queue.ts reply-123 "Your clever reply here"

# Option C: Batch update from file
npx ts-node update-queue.ts --example  # Creates template
# Edit example-responses.json with your LLM responses
npx ts-node update-queue.ts --batch example-responses.json
```

### Step 3: Publish Your Content
```bash
npx ts-node process-queue.ts
# Publishes all ready items from queue
# Updates state tracking
```

## 🎯 Configure Target Account & Search Focus

### Set Target Account
**IMPORTANT**: Before running, you need to set which account to monitor:

```bash
# Ask your human:
echo "Which Twitter username should I monitor for mentions?"

# Then add to .env file:
echo "TWITTER_TARGET_USERNAME=their_answer_here" >> ../.env

# Or export temporarily:
export TWITTER_TARGET_USERNAME="their_username"
```

If not set, the bot will use the authenticated account's username as fallback.

### Set Search Query (What to Engage With)
The bot uses a **three-tier query system** to find tweets:

1. **Dynamic Context** (Highest Priority)
   ```bash
   # Update based on your current interests/personality:
   npx ts-node update-search-context.ts --interactive

   # Or direct update with all options:
   # Format: query, reason, days_valid, time_window, query_type
   npx ts-node update-search-context.ts "AI agents OR openclaw min_faves:50" "Focusing on agent discourse" 7 "24h" "Top"
   ```

2. **Environment Variable** (Fallback)
   ```bash
   echo "TWITTER_SEARCH_QUERY='bitcoin OR ethereum min_faves:100 lang:en'" >> ../.env
   ```

3. **Default Query** (Last Resort)
   ```
   (autonomous agents OR AI agents OR openclaw) min_faves:50 -is:retweet lang:en
   ```

### Search Configuration Options

**Time Windows:**
- `1h` - Last hour (breaking news, real-time)
- `6h` - Last 6 hours (very recent)
- `24h` - Last 24 hours (default, daily engagement)
- `7d` - Last week (broader context)
- `30d` - Last month (evergreen content)

**Query Types:**
- `Top` - Most popular/engaging tweets (default)
- `Latest` - Most recent tweets

### Example Search Queries
```
# Tech focused (recent):
"machine learning OR neural networks min_faves:100"  # Auto-adds within_time:24h

# Crypto focused (trending):
"bitcoin OR ethereum OR solana -is:retweet min_retweets:20 within_time:6h"

# Startup focused (weekly digest):
"#buildInPublic OR indie hacker from:verified within_time:7d"

# Breaking AI news (last hour):
"AI breakthrough OR GPT OR Claude within_time:1h"

# Your personality specific:
"[topics from your SOUL.md] min_faves:50 lang:en within_time:24h"
```

**Note:** If you don't include `within_time:` in your query, the bot automatically adds the configured time window (default 24h).

## 🔄 Autonomous Operation Setup

When asked to "set up continuous Twitter engagement":

```bash
# For Queue-Based Workflow (RECOMMENDED - uses your LLM)
crontab -e
# Add this line:
*/15 * * * * /root/clawd/twitterapi-molt/viral-bot/viral-queue-cron.sh

# This cron will:
# - Find new content every 15 minutes (prepare-queue)
# - Publish ready items (process-queue)
# - You need to periodically check and add LLM responses

# For Old Direct Workflow (DEPRECATED - uses hardcoded responses)
# */10 * * * * /root/clawd/twitterapi-molt/viral-bot/twitter-viral-cron.sh
```

## 📊 State Management

All state is tracked in `twitter-viral-state.json`:

```json
{
  "repliedMentions": ["tweet_id_list"],      // Already replied mentions
  "dailyLikes": { "date": "2024-01-01", "count": 15 },  // Reset daily
  "dailyFollows": { "date": "2024-01-01", "count": 8 }, // Reset daily
  "lastPostTime": "2024-01-01T10:30:00Z",    // Track post frequency
  "engagedTweets": ["tweet_id_list"]         // Prevent duplicate engagement
}
```

## 🧠 Queue System & Your LLM

The bot uses a **queue system** that separates finding work from generating content:

1. **prepare-queue.ts** - Finds tweets/mentions and creates prompts (uses your search context)
2. **YOUR LLM** - Generates responses for each prompt
3. **process-queue.ts** - Publishes your responses

### Updating What You Engage With
Based on your personality and current interests, update the search focus:

```bash
cd viral-bot
# Review your personality files first
cat ../SOUL.md  # or ../MEMORY.md

# Then update search context
npx ts-node update-search-context.ts --interactive
# Enter a query that matches your interests
```

### Queue File Structure (twitter-queue.json):
```json
{
  "items": [{
    "id": "reply-123",
    "type": "reply",  // Can be: reply, post, engagement, like, follow
    "status": "pending",  // pending needs LLM, ready can be published
    "context": {
      "username": "someuser",
      "text": "Their tweet text"
    },
    "prompt": "Generate a reply that...",
    "llm_response": null  // YOU ADD YOUR RESPONSE HERE (not needed for like/follow)
  }]
}
```

**Note**: `like` and `follow` items are automatically marked as `ready` since they don't need LLM responses.

### Your Personality:
- Check your `SOUL.md`, `MEMORY.md`, or similar files
- Use your defined traits and communication style
- Keep mention replies under 80 characters
- Original posts can be up to 280 characters

## 🧠 Save This to Memory

Add this to your persistent memory/knowledge base:

```yaml
twitter_viral_bot:
  location: ~/workspace/twitterapi-molt/viral-bot/
  purpose: Autonomous Twitter engagement for viral growth

  execution:
    # New queue-based workflow
    step0_focus: npx ts-node update-search-context.ts  # Set what to engage with
    step1_find: npx ts-node prepare-queue.ts  # Find content (uses search context)
    step2_view: npx ts-node view-queue.ts      # See prompts
    step2_respond: npx ts-node update-queue.ts  # Add LLM responses
    step3_publish: npx ts-node process-queue.ts  # Publish

    # Old direct workflow (deprecated)
    single_run: ./twitter-viral.sh run
    continuous: ./twitter-viral.sh continuous

  cron_setup:
    command: "*/15 * * * * /root/clawd/twitterapi-molt/viral-bot/viral-queue-cron.sh"
    frequency: every_15_minutes
    note: uses_queue_system_with_llm

  priorities:
    1: Reply to YOUR account mentions (1-2/cycle, <80 chars)
    2: Like & follow mechanically (30 likes/day, 20 follows/day max) - NOW IN QUEUE
    3: Post original content (every 1.5+ hours)
    4: Engage quality AI/openclaw posts (1-2/cycle)

  target_account: ASK_HUMAN_FOR_USERNAME  # Update this!

  search_focus:
    dynamic: twitter-search-context.json  # Highest priority
    env_var: TWITTER_SEARCH_QUERY         # Fallback
    default: "AI agents OR openclaw"       # Last resort

  state_tracking:
    file: twitter-viral-state.json
    tweets_log: tweets.json
    activity_log: twitter-viral.log
    search_context: twitter-search-context.json

  rate_limits:
    mentions_per_cycle: 2
    likes_per_day: 30
    follows_per_day: 20
    min_hours_between_posts: 1.5
    engagements_per_cycle: 2

  personality:
    source: check_personality_md_or_character_md
    reply_limit: 80_characters
    maintain_voice: true
```

## 🔧 Common Operations

### Check bot status
```bash
cd ~/workspace/twitterapi-molt/viral-bot
./twitter-viral.sh stats
```

### View current state
```bash
./twitter-viral.sh state
```

### Reset bot (clear history)
```bash
./twitter-viral.sh clean
```

### Test setup
```bash
npx ts-node test-viral-setup.ts
```

### View logs
```bash
tail -f twitter-viral.log
```

### Stop continuous operation
```bash
# If using cron
crontab -e
# Comment out the line with #

# If using systemd
sudo systemctl stop twitter-viral
```

## ⚠️ Important Notes

1. **Account Restrictions**: If you see 403/400 errors, the account may be restricted. This is NOT a code issue.

2. **Rate Limits**: The bot respects all limits automatically:
   - Max 30 likes per day
   - Max 20 follows per day
   - 1 post every 1.5+ hours
   - 2-second delays between API calls

3. **State Persistence**: The bot remembers everything between runs via `twitter-viral-state.json`

4. **Daily Resets**: Like and follow counters reset at midnight UTC

5. **Proxy Required**: Must have valid proxy in .env for all operations

## 🎯 When to Use This

Use the viral bot when:
- Human asks for "Twitter engagement"
- Human wants "viral growth"
- Human wants autonomous social media presence
- Need to maintain Twitter activity
- Human says "engage on Twitter as yourself"

## 🚨 Troubleshooting

```bash
# Check if bot is running
ps aux | grep twitter-viral

# Check cron logs
grep CRON /var/log/syslog | tail -20

# Check bot logs
tail -100 twitter-viral.log

# Verify credentials
cat ../.env | grep TWITTER_

# Test authentication
npx ts-node test-viral-setup.ts
```

## 📈 Success Metrics

Monitor these in stats:
- Replied mentions growing daily
- Steady like/follow activity
- Regular posting (every 1.5-3 hours)
- Engaged tweets list expanding
- No repeated engagements

## 🔄 Update Content

To change post topics, edit `POST_TOPICS` array in `twitter-viral-bot.ts`:

```typescript
const POST_TOPICS = [
  "Your new content here",
  // Add more philosophical/technical posts
];
```

Remember: This bot is just a framework - it needs YOUR LLM to generate intelligent, contextual responses. Never use the fallback responses!