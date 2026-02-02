#!/bin/bash

# Queue-based Twitter Viral Bot - Cron Script
# This runs the complete queue workflow automatically

# Set working directory - UPDATE THIS PATH
WORK_DIR="/root/clawd/twitterapi-molt/viral-bot"

# Environment
export NODE_ENV=production
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"

# Lock file to prevent multiple instances
LOCK_FILE="/tmp/twitter-queue-bot.lock"
PID_FILE="/tmp/twitter-queue-bot.pid"

# Log file
LOG_FILE="$WORK_DIR/queue-bot.log"

# Check if already running
if [ -f "$LOCK_FILE" ]; then
    if [ -f "$PID_FILE" ]; then
        OLD_PID=$(cat "$PID_FILE")
        if ps -p "$OLD_PID" > /dev/null 2>&1; then
            echo "[$(date)] Bot already running (PID: $OLD_PID)" >> "$LOG_FILE"
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

# Function to log
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Run the bot workflow
cd "$WORK_DIR" || exit 1

log "Starting queue-based viral bot workflow"

# Step 1: Prepare queue (find content)
log "Step 1: Finding content to engage with..."
timeout 120 npx ts-node prepare-queue.ts >> "$LOG_FILE" 2>&1

# Step 2: Process any ready items in queue
log "Step 2: Processing ready items..."
timeout 300 npx ts-node process-queue.ts >> "$LOG_FILE" 2>&1

log "Workflow complete"

# Note: This cron job only handles finding and publishing.
# LLM response generation should be done separately by the agent
# when they review pending items with view-queue.ts

exit 0