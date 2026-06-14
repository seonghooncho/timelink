import type { NotificationResponse } from '@/services/api';

const DEFAULT_NOTIFICATION_TARGET = '/notifications';

const hasControlCharacter = (value: string) => {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || code === 127) return true;
  }
  return false;
};

export const isSafeInternalPath = (value?: string | null) => {
  if (!value) return false;
  const path = value.trim();
  if (!path.startsWith('/') || path.startsWith('//')) return false;
  if (hasControlCharacter(path)) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return false;
  return true;
};

export const normalizeInternalPath = (value?: string | null, fallback = DEFAULT_NOTIFICATION_TARGET) =>
  isSafeInternalPath(value) ? value!.trim() : fallback;

export const resolveNotificationTarget = (notification: Pick<NotificationResponse, 'targetUrl' | 'targetType' | 'targetId'>) => {
  if (isSafeInternalPath(notification.targetUrl)) {
    return notification.targetUrl!.trim();
  }

  const targetType = notification.targetType?.trim().toUpperCase();
  const targetId = notification.targetId?.trim();

  if (targetType && targetId) {
    const id = encodeURIComponent(targetId);
    if (targetType === 'GROUP_JOIN_REQUEST') return `/groups/${id}?panel=joinRequests`;
    if (targetType === 'GROUP') return `/groups/${id}`;
    if (targetType === 'COMMUNITY_POST' || targetType === 'POST') return `/community/posts/${id}`;
    if (targetType === 'SCHEDULE') return '/calendar';
  }

  return DEFAULT_NOTIFICATION_TARGET;
};

export const buildGroupJoinPath = (inviteCode: string, search: string) => {
  const params = new URLSearchParams(search);
  const next = new URLSearchParams();
  const coordId = params.get('coord');
  const redirect = params.get('redirect');

  if (coordId) next.set('coord', coordId);
  if (isSafeInternalPath(redirect)) next.set('redirect', redirect!.trim());

  const query = next.toString();
  return `/groups/join/${encodeURIComponent(inviteCode)}${query ? `?${query}` : ''}`;
};
