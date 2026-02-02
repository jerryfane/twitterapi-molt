#!/bin/bash

# Twitter Viral Mode Bot - Phobos
# Sharp, direct, substantive engagement

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BOT_SCRIPT="$SCRIPT_DIR/twitter-viral-bot.ts"
STATE_FILE="$SCRIPT_DIR/twitter-viral-state.json"
LOG_FILE="$SCRIPT_DIR/twitter-viral.log"

# Functions
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

# Check dependencies
check_deps() {
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
    fi

    if ! command -v npx &> /dev/null; then
        error "npx is not installed"
    fi

    if [ ! -f "$SCRIPT_DIR/../.env" ]; then
        error ".env file not found. Please create it with your Twitter API credentials"
    fi

    if [ ! -f "$SCRIPT_DIR/../package.json" ]; then
        error "package.json not found. Please run npm install first"
    fi
}

# Run the bot
run_bot() {
    log "🚀 Starting Twitter Viral Bot - Phobos Mode"

    cd "$SCRIPT_DIR/.."

    # Build TypeScript if needed
    if [ ! -d "$SCRIPT_DIR/../dist" ]; then
        info "Building TypeScript..."
        npm run build
    fi

    # Run the bot
    npx ts-node "$BOT_SCRIPT"

    log "✅ Bot cycle completed"
}

# Continuous mode (runs every 10 minutes)
continuous_mode() {
    log "🔄 Starting continuous mode (runs every 10 minutes)"

    while true; do
        run_bot

        info "Sleeping for 10 minutes..."
        sleep 600
    done
}

# Show state
show_state() {
    if [ -f "$STATE_FILE" ]; then
        echo -e "${YELLOW}Current Bot State:${NC}"
        cat "$STATE_FILE" | jq '.' 2>/dev/null || cat "$STATE_FILE"
    else
        info "No state file found. Run the bot first."
    fi
}

# Clean state (reset)
clean_state() {
    read -p "Are you sure you want to reset the bot state? [y/N]: " confirm

    if [[ $confirm == [yY] ]]; then
        rm -f "$STATE_FILE"
        log "State reset successfully"
    else
        info "State reset cancelled"
    fi
}

# Show stats
show_stats() {
    if [ -f "$STATE_FILE" ]; then
        echo -e "${YELLOW}📊 Bot Statistics:${NC}"

        local state=$(cat "$STATE_FILE")

        echo "Replied Mentions: $(echo "$state" | jq '.repliedMentions | length')"
        echo "Daily Likes: $(echo "$state" | jq '.dailyLikes.count')/30"
        echo "Daily Follows: $(echo "$state" | jq '.dailyFollows.count')/20"
        echo "Engaged Tweets: $(echo "$state" | jq '.engagedTweets | length')"
        echo "Last Post: $(echo "$state" | jq -r '.lastPostTime')"
    else
        info "No statistics available. Run the bot first."
    fi
}

# Main menu
main() {
    case "${1:-}" in
        run)
            check_deps
            run_bot
            ;;
        continuous)
            check_deps
            continuous_mode
            ;;
        state)
            show_state
            ;;
        stats)
            show_stats
            ;;
        clean)
            clean_state
            ;;
        help)
            echo "Twitter Viral Bot - Phobos"
            echo ""
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  run         Run the bot once"
            echo "  continuous  Run continuously (every 10 minutes)"
            echo "  state       Show current bot state"
            echo "  stats       Show bot statistics"
            echo "  clean       Reset bot state"
            echo "  help        Show this help message"
            echo ""
            echo "Configuration:"
            echo "  Edit .env file for API credentials"
            echo "  State tracked in twitter-viral-state.json"
            echo "  Logs saved to twitter-viral.log"
            ;;
        *)
            check_deps
            run_bot
            ;;
    esac
}

# Run main
main "$@"