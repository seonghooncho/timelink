import type { NotificationResponse } from '../services/api';

const DEFAULT_NOTIFICATION_TARGET: MobileNavigationTarget = { screen: 'Notifications' };

export type MobileNavigationTarget =
  | { screen: 'Notifications' }
  | { screen: 'GroupDetail'; params: { id: string } }
  | { screen: 'GroupIntro'; params: { id: string } }
  | { screen: 'GroupJoin'; params: { inviteCode: string; coord?: string; redirect?: string } }
  | { screen: 'CommunityPostDetail'; params: { postId: string; groupId?: string } }
  | { screen: 'CoordinationTimetable'; params: { groupId: string; coordId: string } }
  | { screen: 'ScheduleForm'; params?: { groupId?: string; groupName?: string } }
  | { screen: 'GroupForm' }
  | { screen: 'MainTabs'; params?: { screen: 'Home' | 'Calendar' | 'Groups' | 'Community' | 'MyPage' } };

function hasControlCharacter(value: string) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || code === 127) return true;
  }
  return false;
}

export function isSafeInternalPath(value?: string | null) {
  if (!value) return false;
  const path = value.trim();
  if (!path.startsWith('/') || path.startsWith('//')) return false;
  if (hasControlCharacter(path)) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return false;
  return true;
}

export function normalizeInternalPath(value?: string | null, fallback = '/notifications') {
  return isSafeInternalPath(value) ? value!.trim() : fallback;
}

function decodeSegment(value?: string) {
  if (!value) return '';
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function splitPath(value: string) {
  const [withoutHash] = value.trim().split('#');
  const [pathname, search = ''] = withoutHash.split('?');
  const segments = pathname.split('/').filter(Boolean).map(decodeSegment);
  return { segments, params: new URLSearchParams(search) };
}

export function resolveInternalPathTarget(value?: string | null): MobileNavigationTarget {
  if (!isSafeInternalPath(value)) return DEFAULT_NOTIFICATION_TARGET;

  const { segments, params } = splitPath(value!);
  const [first, second, third, fourth, fifth] = segments;

  if (!first) return { screen: 'MainTabs', params: { screen: 'Home' } };
  if (first === 'notifications') return { screen: 'Notifications' };
  if (first === 'calendar') return { screen: 'MainTabs', params: { screen: 'Calendar' } };
  if (first === 'community' && !second) return { screen: 'MainTabs', params: { screen: 'Community' } };
  if (first === 'mypage') return { screen: 'MainTabs', params: { screen: 'MyPage' } };
  if (first === 'schedule' && second === 'new') return { screen: 'ScheduleForm' };

  if (first === 'invite' && second) {
    return {
      screen: 'GroupJoin',
      params: {
        inviteCode: second,
        coord: params.get('coord') || undefined,
        redirect: isSafeInternalPath(params.get('redirect')) ? params.get('redirect')!.trim() : undefined,
      },
    };
  }

  if (first === 'community' && second === 'posts' && third) {
    return { screen: 'CommunityPostDetail', params: { postId: third } };
  }

  if (first === 'groups') {
    if (!second) return { screen: 'MainTabs', params: { screen: 'Groups' } };
    if (second === 'new') return { screen: 'GroupForm' };
    if (second === 'join' && third) {
      return {
        screen: 'GroupJoin',
        params: {
          inviteCode: third,
          coord: params.get('coord') || undefined,
          redirect: isSafeInternalPath(params.get('redirect')) ? params.get('redirect')!.trim() : undefined,
        },
      };
    }
    if (third === 'intro') return { screen: 'GroupIntro', params: { id: second } };
    if (third === 'posts' && fourth) {
      return { screen: 'CommunityPostDetail', params: { groupId: second, postId: fourth } };
    }
    if (third === 'coordination' && fourth && fifth === 'timetable') {
      return { screen: 'CoordinationTimetable', params: { groupId: second, coordId: fourth } };
    }
    return { screen: 'GroupDetail', params: { id: second } };
  }

  return DEFAULT_NOTIFICATION_TARGET;
}

export function resolveNotificationTarget(
  notification: Pick<NotificationResponse, 'targetUrl' | 'targetType' | 'targetId'>,
): MobileNavigationTarget {
  if (isSafeInternalPath(notification.targetUrl)) {
    const target = resolveInternalPathTarget(notification.targetUrl);
    if (target.screen !== DEFAULT_NOTIFICATION_TARGET.screen || notification.targetUrl!.trim() === '/notifications') {
      return target;
    }
  }

  const targetType = notification.targetType?.trim().toUpperCase();
  const targetId = notification.targetId?.trim();

  if (targetType && targetId) {
    if (targetType === 'GROUP_JOIN_REQUEST' || targetType === 'GROUP') {
      return { screen: 'GroupDetail', params: { id: targetId } };
    }
    if (targetType === 'COMMUNITY_POST' || targetType === 'POST') {
      return { screen: 'CommunityPostDetail', params: { postId: targetId } };
    }
    if (targetType === 'SCHEDULE') {
      return { screen: 'MainTabs', params: { screen: 'Calendar' } };
    }
  }

  return DEFAULT_NOTIFICATION_TARGET;
}
