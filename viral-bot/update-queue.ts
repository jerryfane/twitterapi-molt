#!/usr/bin/env ts-node

import * as fs from 'fs';

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
  error?: string;
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
    console.log('No queue file found.');
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

// Main function to update a specific item
function updateItem(itemId: string, response: string) {
  const queue = loadQueue();

  const item = queue.items.find(i => i.id === itemId);

  if (!item) {
    console.log(`❌ Item with ID "${itemId}" not found`);
    return false;
  }

  if (item.status !== 'pending') {
    console.log(`⚠️  Item "${itemId}" is not pending (status: ${item.status})`);
    return false;
  }

  item.llm_response = response;
  item.status = 'ready';

  saveQueue(queue);

  console.log(`✅ Updated item "${itemId}" with response and marked as ready`);
  return true;
}

// Batch update from JSON file
function batchUpdate(filePath: string) {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return;
  }

  const updates = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const queue = loadQueue();

  let updatedCount = 0;

  for (const [itemId, response] of Object.entries(updates)) {
    const item = queue.items.find(i => i.id === itemId);

    if (!item) {
      console.log(`⚠️  Skipping unknown item: ${itemId}`);
      continue;
    }

    if (item.status !== 'pending') {
      console.log(`⚠️  Skipping non-pending item: ${itemId} (${item.status})`);
      continue;
    }

    item.llm_response = response as string;
    item.status = 'ready';
    updatedCount++;
    console.log(`✅ Updated: ${itemId}`);
  }

  saveQueue(queue);

  console.log(`\n✅ Batch update complete: ${updatedCount} items updated`);
}

// CLI interface
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('📋 Update Queue - Add LLM responses to pending items\n');
  console.log('Usage:');
  console.log('  npx ts-node update-queue.ts <item-id> "<response>"');
  console.log('  npx ts-node update-queue.ts --batch responses.json');
  console.log('  npx ts-node update-queue.ts --example');
  console.log('\nExamples:');
  console.log('  npx ts-node update-queue.ts reply-123456 "Great point about AI agents!"');
  console.log('  npx ts-node update-queue.ts post-789012 "The future of agents is multimodal reasoning."');
  console.log('\nFor batch updates, create a JSON file like:');
  console.log('  {');
  console.log('    "reply-123456": "Your response here",');
  console.log('    "post-789012": "Another response"');
  console.log('  }');

} else if (args[0] === '--example') {
  // Generate example responses file
  const queue = loadQueue();
  const pending = queue.items.filter(i => i.status === 'pending');

  if (pending.length === 0) {
    console.log('No pending items to generate examples for.');
    process.exit(0);
  }

  const examples: any = {};

  pending.forEach(item => {
    examples[item.id] = `[ADD YOUR LLM RESPONSE HERE FOR: ${item.type}]`;
  });

  const exampleFile = 'example-responses.json';
  fs.writeFileSync(exampleFile, JSON.stringify(examples, null, 2));

  console.log(`✅ Generated example file: ${exampleFile}`);
  console.log('Edit this file and run:');
  console.log(`  npx ts-node update-queue.ts --batch ${exampleFile}`);

} else if (args[0] === '--batch' && args[1]) {
  batchUpdate(args[1]);

} else if (args.length >= 2) {
  const itemId = args[0];
  const response = args.slice(1).join(' ');

  updateItem(itemId, response);

} else {
  console.log('❌ Invalid arguments. Run without arguments to see usage.');
}