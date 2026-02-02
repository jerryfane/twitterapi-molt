#!/bin/bash

# Cron-friendly version of Twitter Viral Bot
# Add to crontab: */10 * * * * /path/to/twitter-viral-cron.sh

# Set working directory - UPDATE THIS PATH
WORK_DIR="/root/clawd/twitterapi-molt/viral-bot"

# Environment
export NODE_ENV=production
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"

# Lock file to prevent multiple instances
LOCK_FILE="/tmp/twitter-viral-bot.lock"
PID_FILE="/tmp/twitter-viral-bot.pid"

# Check if already running
if [ -f "$LOCK_FILE" ]; then
    if [ -f "$PID_FILE" ]; then
        OLD_PID=$(cat "$PID_FILE")
        if ps -p "$OLD_PID" > /dev/null 2>&1; then
            echo "Bot already running (PID: $OLD_PID)"
            exit 0
        fi
    fi
    rm -f "$LOCK_FILE" "$PID_FILE"
fi

# Create lock file
echo $$ > "$PID_FILE"
touch "$LOCK_FILE"

# Cleanup on exit
cleanup() {
    rm -f "$LOCK_FILE" "$PID_FILE"
}
trap cleanup EXIT

# Run the bot
cd "$WORK_DIR" || exit 1

# Load NVM if available (for Node.js)
if [ -f "$HOME/.nvm/nvm.sh" ]; then
    source "$HOME/.nvm/nvm.sh"
fi

# Run with timeout (9 minutes max, giving time before next cron)
timeout 540 npx ts-node twitter-viral-bot.ts >> twitter-viral.log 2>&1

# Exit code
EXIT_CODE=$?

if [ $EXIT_CODE -eq 124 ]; then
    echo "Bot execution timed out (normal for long runs)" >> twitter-viral.log
fi

exit 0