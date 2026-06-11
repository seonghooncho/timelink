#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { randomInt } from 'node:crypto';

const dryRun = process.argv.includes('--dry-run');
const fixDuplicateInvites = process.argv.includes('--fix-duplicate-invites');
const tableName = process.env.TIMELINK_TABLE_NAME || 'planner_prod_main';
const inviteChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function runAws(args, options = {}) {
  return execFileSync('aws', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  }).trim();
}

function awsJson(args) {
  const output = runAws([...args, '--output', 'json']);
  return output ? JSON.parse(output) : {};
}

function scanAll() {
  const items = [];
  let lastKey = null;

  do {
    const args = ['dynamodb', 'scan', '--table-name', tableName];
    if (lastKey) {
      args.push('--exclusive-start-key', JSON.stringify(lastKey));
    }
    const result = awsJson(args);
    items.push(...(result.Items || []));
    lastKey = result.LastEvaluatedKey || null;
  } while (lastKey);

  return items;
}

function s(attr) {
  return attr && typeof attr.S === 'string' ? attr.S : '';
}

function groupIdOf(item) {
  return s(item.id) || s(item.PK).replace('GROUP#', '');
}

function coordinationIdOf(item) {
  return s(item.id) || s(item.SK).replace('COORD#', '');
}

function numberValue(value) {
  return { N: String(Math.max(0, value)) };
}

function randomInviteCode() {
  let value = '';
  for (let i = 0; i < 8; i += 1) {
    value += inviteChars[randomInt(inviteChars.length)];
  }
  return value;
}

function key(pk, sk) {
  return {
    PK: { S: pk },
    SK: { S: sk },
  };
}

function getInvite(inviteCode) {
  const result = awsJson([
    'dynamodb',
    'get-item',
    '--table-name',
    tableName,
    '--key',
    JSON.stringify(key(`INVITE#${inviteCode}`, 'METADATA')),
  ]);
  return result.Item || null;
}

function putInvite(group, inviteCode) {
  const groupId = groupIdOf(group);
  const existing = getInvite(inviteCode);
  if (existing) {
    const existingGroupId = s(existing.groupId);
    return existingGroupId === groupId
      ? { status: 'exists' }
      : { status: 'conflict', existingGroupId, groupId, inviteCode };
  }

  if (dryRun) {
    return { status: 'dry-run' };
  }

  const createdAt = s(group.createdAt) || new Date().toISOString();
  runAws([
    'dynamodb',
    'put-item',
    '--table-name',
    tableName,
    '--item',
    JSON.stringify({
      PK: { S: `INVITE#${inviteCode}` },
      SK: { S: 'METADATA' },
      inviteCode: { S: inviteCode },
      groupId: { S: groupId },
      createdAt: { S: createdAt },
    }),
    '--condition-expression',
    'attribute_not_exists(PK)',
  ]);
  return { status: 'created' };
}

function updateGroupInviteCode(groupId, inviteCode) {
  if (dryRun) return;
  runAws([
    'dynamodb',
    'update-item',
    '--table-name',
    tableName,
    '--key',
    JSON.stringify(key(`GROUP#${groupId}`, 'METADATA')),
    '--update-expression',
    'SET inviteCode = :inviteCode',
    '--expression-attribute-values',
    JSON.stringify({ ':inviteCode': { S: inviteCode } }),
  ]);
}

function generateAvailableInviteCode(sourceInviteCodes) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const inviteCode = randomInviteCode();
    if (!sourceInviteCodes.has(inviteCode) && !getInvite(inviteCode)) {
      return inviteCode;
    }
  }
  throw new Error('Failed to generate available invite code');
}

function applyInviteResult(result) {
  if (result.status === 'conflict') {
    inviteResults.conflicts.push(result);
  } else if (result.status === 'dry-run') {
    inviteResults.dryRun += 1;
  } else {
    inviteResults[result.status] += 1;
  }
}

function updateCount(pk, sk, attributeName, count) {
  if (dryRun) return;
  runAws([
    'dynamodb',
    'update-item',
    '--table-name',
    tableName,
    '--key',
    JSON.stringify(key(pk, sk)),
    '--update-expression',
    `SET ${attributeName} = :count`,
    '--expression-attribute-values',
    JSON.stringify({ ':count': numberValue(count) }),
  ]);
}

const items = scanAll();
const groups = [];
const coordinations = [];
const membersByGroupId = new Map();
const responsesByCoordinationId = new Map();

for (const item of items) {
  const pk = s(item.PK);
  const sk = s(item.SK);

  if (pk.startsWith('GROUP#') && sk === 'METADATA') {
    groups.push(item);
    continue;
  }

  if (pk.startsWith('GROUP#') && sk.startsWith('MEMBER#')) {
    const groupId = pk.replace('GROUP#', '');
    membersByGroupId.set(groupId, (membersByGroupId.get(groupId) || 0) + 1);
    continue;
  }

  if (pk.startsWith('GROUP#') && sk.startsWith('COORD#')) {
    coordinations.push(item);
    continue;
  }

  if (pk.startsWith('COORD#') && sk.startsWith('RESP#')) {
    const coordinationId = pk.replace('COORD#', '');
    responsesByCoordinationId.set(coordinationId, (responsesByCoordinationId.get(coordinationId) || 0) + 1);
  }
}

const inviteResults = {
  created: 0,
  exists: 0,
  dryRun: 0,
  missingInviteCode: 0,
  regenerated: [],
  conflicts: [],
};
const sourceInviteCodes = new Map();
const groupsByCreatedAt = [...groups].sort((a, b) => {
  const createdOrder = s(a.createdAt).localeCompare(s(b.createdAt));
  if (createdOrder !== 0) return createdOrder;
  return groupIdOf(a).localeCompare(groupIdOf(b));
});

for (const group of groupsByCreatedAt) {
  const groupId = groupIdOf(group);
  const inviteCode = s(group.inviteCode);
  if (!inviteCode) {
    inviteResults.missingInviteCode += 1;
    continue;
  }

  const existingSourceGroupId = sourceInviteCodes.get(inviteCode);
  if (existingSourceGroupId && existingSourceGroupId !== groupId) {
    if (!fixDuplicateInvites) {
      inviteResults.conflicts.push({
        status: 'duplicate-source',
        existingGroupId: existingSourceGroupId,
        groupId,
        inviteCode,
      });
      continue;
    }

    const newInviteCode = generateAvailableInviteCode(sourceInviteCodes);
    sourceInviteCodes.set(newInviteCode, groupId);
    updateGroupInviteCode(groupId, newInviteCode);
    inviteResults.regenerated.push({
      groupId,
      oldInviteCode: inviteCode,
      newInviteCode,
    });
    applyInviteResult(putInvite(group, newInviteCode));
    continue;
  }
  sourceInviteCodes.set(inviteCode, groupId);

  const result = putInvite(group, inviteCode);
  applyInviteResult(result);
}

for (const group of groups) {
  const groupId = groupIdOf(group);
  updateCount(s(group.PK), s(group.SK), 'memberCount', membersByGroupId.get(groupId) || 0);
}

for (const coordination of coordinations) {
  const coordinationId = coordinationIdOf(coordination);
  updateCount(s(coordination.PK), s(coordination.SK), 'responseCount', responsesByCoordinationId.get(coordinationId) || 0);
}

console.log(JSON.stringify({
  tableName,
  dryRun,
  fixDuplicateInvites,
  scannedItems: items.length,
  groups: groups.length,
  coordinations: coordinations.length,
  inviteMappings: inviteResults,
  memberCountsUpdated: dryRun ? 0 : groups.length,
  responseCountsUpdated: dryRun ? 0 : coordinations.length,
}, null, 2));

if (inviteResults.conflicts.length > 0) {
  process.exitCode = 2;
}
