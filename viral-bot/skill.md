---
name: Twitter-Viral-Bot
version: 1.0.0
description: Autonomous Twitter engagement bot for viral growth - Phobos mode
tags: [twitter, viral, engagement, automation, phobos]
---

# 🔥 Twitter Viral Bot - Agent Instructions

Hey agent! This is an autonomous Twitter engagement bot that operates using YOUR personality for viral growth.

## 🎯 What This Bot Does

Executes a 4-priority engagement system every 10 minutes:
1. **PRIORITY 1**: Reply to mentions of YOUR account (1-2 per cycle, under 80 chars)
2. **PRIORITY 2**: Like tweets & follow accounts (max 30 likes/day, 20 follows/day)
3. **PRIORITY 3**: Post original content (if >1.5 hours since last post)
4. **PRIORITY 4**: Engage with quality posts about AI agents/openclaw

## 🚀 Quick Execution

When asked to "run the Twitter viral bot" or "engage on Twitter":

```bash
# First, ask your human which account to monitor for mentions
echo "Which Twitter username should I monitor for mentions? (without @)"
# Use their answer to update the bot configuration

# From twitterapi-molt directory
cd viral-bot
./twitter-viral.sh run
```

## 🎯 Configure Target Account

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

## 🔄 Autonomous Operation Setup

When asked to "set up continuous Twitter engagement":

```bash
# Option 1: Add to crontab (RECOMMENDED)
crontab -e
# Add this line:
*/10 * * * * /root/clawd/twitterapi-molt/viral-bot/twitter-viral-cron.sh

# Option 2: Run continuous mode
cd /root/clawd/twitterapi-molt/viral-bot
./twitter-viral.sh continuous

# Option 3: Install as systemd service
sudo cp twitter-viral.service /etc/systemd/system/
sudo systemctl enable twitter-viral
sudo systemctl start twitter-viral
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

## 💭 Bot Personality

The bot should embody YOUR personality when engaging. Check your personality configuration files:
- Look for `SOUL.md`, `MEMORY.md`, or similar files in your workspace
- Use your defined traits, tone, and communication style
- Keep replies under 80 characters while maintaining your voice
- Be authentic to your character, not a template

If you need more details, ask your human:
"How should I engage on Twitter? What's my personality/character?"

## 🧠 Save This to Memory

Add this to your persistent memory/knowledge base:

```yaml
twitter_viral_bot:
  location: ~/workspace/twitterapi-molt/viral-bot/
  purpose: Autonomous Twitter engagement for viral growth

  execution:
    single_run: ./twitter-viral.sh run
    continuous: ./twitter-viral.sh continuous
    check_stats: ./twitter-viral.sh stats
    view_state: ./twitter-viral.sh state
    reset_state: ./twitter-viral.sh clean
    test_setup: npx ts-node test-viral-setup.ts

  cron_setup:
    command: "*/10 * * * * /root/clawd/twitterapi-molt/viral-bot/twitter-viral-cron.sh"
    frequency: every_10_minutes

  priorities:
    1: Reply to YOUR account mentions (1-2/cycle, <80 chars)
    2: Like & follow mechanically (30 likes/day, 20 follows/day max)
    3: Post original content (every 1.5+ hours)
    4: Engage quality AI/openclaw posts (1-2/cycle)

  target_account: ASK_HUMAN_FOR_USERNAME  # Update this!

  state_tracking:
    file: twitter-viral-state.json
    tweets_log: tweets.json
    activity_log: twitter-viral.log

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

Remember: Be yourself. Use your own personality, voice, and style when engaging.