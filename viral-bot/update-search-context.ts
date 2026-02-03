#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as readline from 'readline';

const SEARCH_CONTEXT_FILE = 'twitter-search-context.json';

interface SearchContext {
  current_focus: {
    query: string;
    reason?: string;
    expires_at?: string;
    last_updated_by?: string;
    time_window?: string;
    query_type?: 'Top' | 'Latest';
  };
  suggested_queries?: string[];
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function loadSearchContext(): SearchContext | null {
  try {
    if (fs.existsSync(SEARCH_CONTEXT_FILE)) {
      return JSON.parse(fs.readFileSync(SEARCH_CONTEXT_FILE, 'utf-8'));
    }
  } catch (e) {}
  return null;
}

function saveSearchContext(context: SearchContext): void {
  fs.writeFileSync(SEARCH_CONTEXT_FILE, JSON.stringify(context, null, 2));
}

async function main() {
  console.log('🔍 Update Twitter Search Context\n');

  const args = process.argv.slice(2);

  // Non-interactive mode: direct update
  if (args.length >= 1 && args[0] !== '--interactive') {
    const query = args[0];
    const reason = args[1] || 'Updated by agent';
    const daysValid = parseInt(args[2] || '7');
    const timeWindow = args[3] || '24h';
    const queryType = (args[4] === 'Latest' ? 'Latest' : 'Top') as 'Top' | 'Latest';

    const context: SearchContext = {
      current_focus: {
        query: query,
        reason: reason,
        expires_at: new Date(Date.now() + daysValid * 24 * 60 * 60 * 1000).toISOString(),
        last_updated_by: process.env.USER || 'agent',
        time_window: timeWindow,
        query_type: queryType
      }
    };

    saveSearchContext(context);
    console.log('✅ Search context updated:');
    console.log(`   Query: "${query}"`);
    console.log(`   Reason: ${reason}`);
    console.log(`   Valid for: ${daysValid} days`);
    console.log(`   Time window: ${timeWindow}`);
    console.log(`   Query type: ${queryType}`);

    rl.close();
    return;
  }

  // Show current context
  const current = loadSearchContext();
  if (current?.current_focus) {
    console.log('📌 Current search context:');
    console.log(`   Query: "${current.current_focus.query}"`);
    if (current.current_focus.reason) {
      console.log(`   Reason: ${current.current_focus.reason}`);
    }
    if (current.current_focus.expires_at) {
      const expiry = new Date(current.current_focus.expires_at);
      const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      console.log(`   Expires: ${daysLeft > 0 ? `in ${daysLeft} days` : 'expired'}`);
    }
    console.log();
  }

  // Interactive mode
  console.log('💡 Generate a search query based on your personality and interests.\n');

  console.log('Example queries:');
  console.log('  • "AI agents OR autonomous systems min_faves:100 lang:en"');
  console.log('  • "bitcoin OR ethereum OR crypto min_retweets:50 -is:retweet"');
  console.log('  • "machine learning OR neural networks from:verified"');
  console.log('  • "#buildInPublic OR indie hacker min_faves:20 lang:en"\n');
  console.log('Time windows: 1h, 6h, 12h, 24h (default), 2d, 7d, 30d');
  console.log('Query types: Top (popular/quality), Latest (most recent)\n');

  const query = await question('Enter your search query: ');

  if (!query.trim()) {
    console.log('❌ No query provided');
    rl.close();
    return;
  }

  const reason = await question('Why this focus? (optional): ');
  const daysStr = await question('Valid for how many days? (default: 7): ');
  const daysValid = parseInt(daysStr) || 7;

  const timeWindow = await question('Time window for tweets (e.g., 24h, 7d, default: 24h): ') || '24h';
  const queryTypeStr = await question('Query type - Top or Latest? (default: Top): ');
  const queryType = (queryTypeStr === 'Latest' ? 'Latest' : 'Top') as 'Top' | 'Latest';

  // Ask for suggested alternatives
  const suggestionsStr = await question('Alternative queries (comma-separated, optional): ');
  const suggestions = suggestionsStr ? suggestionsStr.split(',').map(s => s.trim()).filter(s => s) : undefined;

  const context: SearchContext = {
    current_focus: {
      query: query.trim(),
      reason: reason.trim() || undefined,
      expires_at: new Date(Date.now() + daysValid * 24 * 60 * 60 * 1000).toISOString(),
      last_updated_by: process.env.USER || 'agent',
      time_window: timeWindow,
      query_type: queryType
    },
    suggested_queries: suggestions
  };

  saveSearchContext(context);

  console.log('\n✅ Search context updated successfully!');
  console.log(`   Will expire in ${daysValid} days`);
  console.log('\n🔄 Run prepare-queue.ts to use this new search focus');

  rl.close();
}

// Handle CLI usage
if (process.argv.length === 2) {
  console.log('🔍 Update Search Context - Set what tweets to engage with\n');
  console.log('Usage:');
  console.log('  Interactive mode:');
  console.log('    npx ts-node update-search-context.ts --interactive\n');
  console.log('  Direct update:');
  console.log('    npx ts-node update-search-context.ts "<query>" ["<reason>"] [days] [time_window] [type]\n');
  console.log('Examples:');
  console.log('  npx ts-node update-search-context.ts "AI safety OR alignment min_faves:50"');
  console.log('  npx ts-node update-search-context.ts "crypto OR web3" "Focusing on blockchain" 14 "7d" "Latest"');
  console.log('  npx ts-node update-search-context.ts "AI agents" "Agent discourse" 7 "24h" "Top"');
  process.exit(0);
}

main().catch(console.error);