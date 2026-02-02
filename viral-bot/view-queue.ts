#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';

const QUEUE_FILE = 'twitter-queue.json';

interface QueueItem {
  id: string;
  type: 'reply' | 'post' | 'engagement';
  status: 'pending' | 'ready' | 'completed' | 'failed';
  context: {
    tweet?: any;
    username?: string;
    text?: string;
    tweetId?: string;
  };
  prompt: string;
  llm_response?: string;
  created_at: string;
  processed_at?: string;
}

interface Queue {
  items: QueueItem[];
  last_updated: string;
}

function loadQueue(): Queue {
  try {
    if (fs.existsSync(QUEUE_FILE)) {
      return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
    }
  } catch (e) {
    console.log('No queue file found. Run prepare-queue.ts first.');
    process.exit(1);
  }

  return {
    items: [],
    last_updated: new Date().toISOString()
  };
}

function saveQueue(queue: Queue): void {
  queue.last_updated = new Date().toISOString();
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
}

function displayQueue() {
  const queue = loadQueue();

  console.log('📋 Twitter Engagement Queue\n');
  console.log(`Last updated: ${queue.last_updated}`);
  console.log('=' .repeat(80) + '\n');

  // Group by status
  const pending = queue.items.filter(i => i.status === 'pending');
  const ready = queue.items.filter(i => i.status === 'ready');
  const recent = queue.items.filter(i => i.status === 'completed').slice(-5);

  if (pending.length > 0) {
    console.log('🔴 PENDING (Needs LLM Response)');
    console.log('-'.repeat(40));

    pending.forEach((item, index) => {
      console.log(`\n[${index + 1}] ${item.type.toUpperCase()} - ${item.id}`);

      if (item.type === 'reply' && item.context.username) {
        console.log(`    From: @${item.context.username}`);
        console.log(`    Tweet: "${item.context.text?.substring(0, 100)}..."`);
      } else if (item.type === 'engagement' && item.context.username) {
        console.log(`    Target: @${item.context.username}`);
        console.log(`    Tweet: "${item.context.text?.substring(0, 100)}..."`);
      }

      console.log('\n    PROMPT FOR LLM:');
      console.log('    ' + item.prompt.split('\n').join('\n    '));
      console.log('\n    To add response, update queue file with:');
      console.log(`    "llm_response": "YOUR_RESPONSE_HERE"`);
      console.log(`    "status": "ready"`);
    });
  }

  if (ready.length > 0) {
    console.log('\n\n🟡 READY TO PUBLISH');
    console.log('-'.repeat(40));

    ready.forEach((item) => {
      console.log(`\n• ${item.type.toUpperCase()}: "${item.llm_response?.substring(0, 100)}..."`);
    });
  }

  if (recent.length > 0) {
    console.log('\n\n🟢 RECENTLY COMPLETED');
    console.log('-'.repeat(40));

    recent.forEach((item) => {
      const processedTime = item.processed_at ? new Date(item.processed_at).toLocaleString() : 'Unknown';
      console.log(`\n• ${item.type.toUpperCase()} at ${processedTime}`);
      console.log(`  Response: "${item.llm_response?.substring(0, 80)}..."`);
    });
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY:');
  console.log(`  • ${pending.length} items need LLM response`);
  console.log(`  • ${ready.length} items ready to publish`);
  console.log(`  • ${queue.items.filter(i => i.status === 'completed').length} total completed`);

  if (pending.length > 0) {
    console.log('\n💡 TO PROCESS PENDING ITEMS:');
    console.log('   1. Generate responses using your LLM for each prompt');
    console.log('   2. Run: npx ts-node update-queue.ts');
    console.log('   3. Provide responses when prompted');
    console.log('\n   OR edit twitter-queue.json directly:');
    console.log('      - Add "llm_response" field');
    console.log('      - Change "status" to "ready"');
  }

  if (ready.length > 0) {
    console.log('\n🚀 TO PUBLISH READY ITEMS:');
    console.log('   Run: npx ts-node process-queue.ts');
  }
}

// Interactive mode to add responses
async function interactiveMode() {
  const queue = loadQueue();
  const pending = queue.items.filter(i => i.status === 'pending');

  if (pending.length === 0) {
    console.log('No pending items to process.');
    return;
  }

  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      readline.question(prompt, resolve);
    });
  };

  console.log('\n🤖 INTERACTIVE MODE: Add LLM Responses\n');

  for (const item of pending) {
    console.log('='.repeat(60));
    console.log(`\nType: ${item.type.toUpperCase()}`);

    if (item.context.username && item.context.text) {
      console.log(`Context: @${item.context.username}: "${item.context.text.substring(0, 150)}..."`);
    }

    console.log('\nPROMPT:');
    console.log(item.prompt);
    console.log('\n');

    const response = await question('Your LLM response (or "skip" to skip): ');

    if (response && response.toLowerCase() !== 'skip') {
      item.llm_response = response;
      item.status = 'ready';
      console.log('✅ Response added and marked as ready');
    } else {
      console.log('⏭️  Skipped');
    }
  }

  readline.close();

  // Save updated queue
  saveQueue(queue);

  const readyCount = queue.items.filter(i => i.status === 'ready').length;
  console.log(`\n✅ Queue updated. ${readyCount} items ready to publish.`);

  if (readyCount > 0) {
    console.log('Run: npx ts-node process-queue.ts');
  }
}

// Main
const args = process.argv.slice(2);

if (args.includes('--interactive') || args.includes('-i')) {
  interactiveMode().catch(console.error);
} else {
  displayQueue();
}