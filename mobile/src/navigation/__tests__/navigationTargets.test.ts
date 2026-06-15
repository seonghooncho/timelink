import {
  isSafeInternalPath,
  normalizeInternalPath,
  resolveInternalPathTarget,
  resolveNotificationTarget,
} from '../navigationTargets';

describe('navigation target safety', () => {
  it('accepts only safe app-internal paths', () => {
    expect(isSafeInternalPath('/groups/group-1?panel=joinRequests')).toBe(true);
    expect(isSafeInternalPath(' /community/posts/post-1 ')).toBe(true);
    expect(isSafeInternalPath('https://evil.example/groups/group-1')).toBe(false);
    expect(isSafeInternalPath('//evil.example/groups/group-1')).toBe(false);
    expect(isSafeInternalPath('/groups/group-1\n/other')).toBe(false);
    expect(normalizeInternalPath('javascript:alert(1)', '/notifications')).toBe('/notifications');
  });

  it('maps web paths to mobile navigation targets', () => {
    expect(resolveInternalPathTarget('/groups/group-1?panel=joinRequests')).toEqual({
      screen: 'GroupDetail',
      params: { id: 'group-1' },
    });
    expect(resolveInternalPathTarget('/groups/group-1/posts/post-1')).toEqual({
      screen: 'CommunityPostDetail',
      params: { groupId: 'group-1', postId: 'post-1' },
    });
    expect(resolveInternalPathTarget('/groups/group-1/coordination/coord-1/timetable')).toEqual({
      screen: 'CoordinationTimetable',
      params: { groupId: 'group-1', coordId: 'coord-1' },
    });
    expect(resolveInternalPathTarget('/invite/abc123?coord=coord-1&redirect=/calendar')).toEqual({
      screen: 'GroupJoin',
      params: { inviteCode: 'abc123', coord: 'coord-1', redirect: '/calendar' },
    });
  });

  it('falls back from unsafe notification urls to structured target fields', () => {
    expect(resolveNotificationTarget({
      targetUrl: 'https://evil.example/post-1',
      targetType: 'COMMUNITY_POST',
      targetId: 'post-1',
    })).toEqual({
      screen: 'CommunityPostDetail',
      params: { postId: 'post-1' },
    });

    expect(resolveNotificationTarget({
      targetUrl: '/calendar',
      targetType: 'GROUP',
      targetId: 'group-1',
    })).toEqual({
      screen: 'MainTabs',
      params: { screen: 'Calendar' },
    });
  });
});
