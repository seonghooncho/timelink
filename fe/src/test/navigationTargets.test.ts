import { describe, expect, it } from 'vitest';
import {
  buildGroupJoinPath,
  isSafeInternalPath,
  resolveNotificationTarget,
} from '@/lib/navigationTargets';

describe('navigationTargets', () => {
  it('allows only safe internal paths', () => {
    expect(isSafeInternalPath('/groups/group-1')).toBe(true);
    expect(isSafeInternalPath('/groups/group-1?panel=joinRequests')).toBe(true);
    expect(isSafeInternalPath('https://evil.test/groups')).toBe(false);
    expect(isSafeInternalPath('//evil.test/groups')).toBe(false);
    expect(isSafeInternalPath('javascript:alert(1)')).toBe(false);
  });

  it('uses targetUrl first when resolving notification targets', () => {
    expect(resolveNotificationTarget({
      targetUrl: '/groups/group-1?panel=joinRequests',
      targetType: 'GROUP',
      targetId: 'group-2',
    })).toBe('/groups/group-1?panel=joinRequests');
  });

  it('falls back from targetType and targetId when targetUrl is missing or unsafe', () => {
    expect(resolveNotificationTarget({
      targetUrl: 'https://evil.test',
      targetType: 'GROUP_JOIN_REQUEST',
      targetId: 'group-1',
    })).toBe('/groups/group-1?panel=joinRequests');

    expect(resolveNotificationTarget({
      targetType: 'COMMUNITY_POST',
      targetId: 'post-1',
    })).toBe('/community/posts/post-1');
  });

  it('falls back to notifications for unknown targets', () => {
    expect(resolveNotificationTarget({ targetType: 'UNKNOWN', targetId: 'x' })).toBe('/notifications');
    expect(resolveNotificationTarget({})).toBe('/notifications');
  });

  it('preserves coordination and safe redirect query for invite links', () => {
    expect(buildGroupJoinPath('ABC123', '?coord=coord-1&redirect=/groups/group-1/intro'))
      .toBe('/groups/join/ABC123?coord=coord-1&redirect=%2Fgroups%2Fgroup-1%2Fintro');

    expect(buildGroupJoinPath('ABC123', '?redirect=https://evil.test'))
      .toBe('/groups/join/ABC123');
  });
});
