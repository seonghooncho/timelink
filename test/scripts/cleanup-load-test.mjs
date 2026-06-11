#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const runId = process.argv[2];
const tableName = process.env.TIMELINK_TABLE_NAME || 'planner_prod_main';
const schedulerGroup = process.env.TIMELINK_SCHEDULER_GROUP || 'planner-prod-notification-reminders';

if (!runId) {
  console.error('Usage: node test/scripts/cleanup-load-test.mjs <runId>');
  process.exit(1);
}

function aws(args, options = {}) {
  const output = execFileSync('aws', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });
  return output.trim();
}

function scanAll() {
  const items = [];
  let lastKey = null;
  do {
    const args = ['dynamodb', 'scan', '--table-name', tableName, '--output', 'json'];
    if (lastKey) {
      args.push('--exclusive-start-key', JSON.stringify(lastKey));
    }
    const result = JSON.parse(aws(args));
    items.push(...(result.Items || []));
    lastKey = result.LastEvaluatedKey || null;
  } while (lastKey);
  return items;
}

function s(attr) {
  return attr && typeof attr.S === 'string' ? attr.S : '';
}

function itemStrings(item) {
  return Object.values(item)
    .map((value) => s(value))
    .filter(Boolean);
}

function keyOf(item) {
  return {
    PK: { S: s(item.PK) },
    SK: { S: s(item.SK) },
  };
}

function batchDelete(keys) {
  for (let start = 0; start < keys.length; start += 25) {
    const chunk = keys.slice(start, start + 25);
    const requestItems = {
      [tableName]: chunk.map((Key) => ({ DeleteRequest: { Key } })),
    };
    aws(['dynamodb', 'batch-write-item', '--request-items', JSON.stringify(requestItems), '--output', 'json']);
  }
}

function deleteScheduler(name) {
  if (!name) return false;
  try {
    aws([
      'scheduler',
      'delete-schedule',
      '--group-name',
      schedulerGroup,
      '--name',
      name,
      '--output',
      'json',
    ]);
    return true;
  } catch (error) {
    const stderr = String(error.stderr || '');
    if (stderr.includes('ResourceNotFoundException')) {
      return false;
    }
    throw error;
  }
}

const allItems = scanAll();
const groupIds = new Set();
const coordIds = new Set();
const schedulerNames = new Set();

for (const item of allItems) {
  const strings = itemStrings(item);
  const matches = strings.some((value) => value.includes(runId));
  const pk = s(item.PK);
  const sk = s(item.SK);

  if (matches && pk.startsWith('GROUP#') && sk === 'METADATA') {
    groupIds.add(pk.replace('GROUP#', ''));
  }
  if (matches && pk.startsWith('GROUP#') && sk.startsWith('COORD#')) {
    coordIds.add(sk.replace('COORD#', ''));
  }
  if (matches && pk.startsWith('COORD#')) {
    coordIds.add(pk.replace('COORD#', ''));
  }
  if (matches && s(item.schedulerName)) {
    schedulerNames.add(s(item.schedulerName));
  }
}

const keys = [];
for (const item of allItems) {
  const pk = s(item.PK);
  const sk = s(item.SK);
  const strings = itemStrings(item);
  const directMatch = strings.some((value) => value.includes(runId));
  const groupMatch = pk.startsWith('GROUP#') && groupIds.has(pk.replace('GROUP#', ''));
  const coordMatch = pk.startsWith('COORD#') && coordIds.has(pk.replace('COORD#', ''));

  if (directMatch || groupMatch || coordMatch) {
    keys.push(keyOf(item));
    if (s(item.schedulerName)) {
      schedulerNames.add(s(item.schedulerName));
    }
  }
}

let deletedSchedulers = 0;
for (const name of schedulerNames) {
  if (deleteScheduler(name)) deletedSchedulers += 1;
}

batchDelete(keys);

console.log(JSON.stringify({
  runId,
  scannedItems: allItems.length,
  deletedItems: keys.length,
  groupIds: groupIds.size,
  coordinationIds: coordIds.size,
  deletedSchedulers,
}, null, 2));
