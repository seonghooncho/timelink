import { Platform } from 'react-native';
import { env } from '../config/env';
import { getAccessToken } from './session';

export type ProductAnalyticsEventName =
  | 'page_view'
  | 'signup_completed'
  | 'login_completed'
  | 'link_created'
  | 'link_opened'
  | 'link_copied'
  | 'link_shared'
  | 'link_deleted'
  | 'settings_updated'
  | 'error_shown';

type ProductAnalyticsValue = string | number | boolean | null | undefined;
type ProductAnalyticsProperties = Record<string, ProductAnalyticsValue>;

const ALLOWED_STRING_PROPERTIES = new Set([
  'surface',
  'platform',
  'route',
  'feature',
  'source',
  'result',
  'page_type',
  'link_type',
  'settings_type',
  'error_code',
  'severity',
]);
const ALLOWED_NUMBER_PROPERTIES = new Set(['duration_ms', 'activity_seconds']);
const SAFE_TOKEN = /^[a-z0-9_.:-]{1,64}$/;

export async function trackProductEvent(eventName: ProductAnalyticsEventName, properties: ProductAnalyticsProperties = {}) {
  const body = JSON.stringify({
    eventName,
    properties: sanitizeProperties({
      surface: 'mobile',
      platform: Platform.OS,
      ...properties,
    }),
  });
  const token = await getAccessToken();

  fetch(`${env.plannerApiBaseUrl}/analytics/track`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body,
  }).catch(() => undefined);
}

export function trackMobilePageView(routeName?: string) {
  const route = mobileRouteToTemplate(routeName);
  void trackProductEvent('page_view', {
    route,
    feature: featureFromRoute(route),
    page_type: routeName?.toLowerCase() || 'unknown',
  });
}

export function trackMobileError(errorCode: string, feature = 'unknown') {
  void trackProductEvent('error_shown', {
    feature,
    error_code: errorCode,
    severity: 'error',
  });
}

function sanitizeProperties(properties: ProductAnalyticsProperties) {
  const sanitized: ProductAnalyticsProperties = {};
  Object.entries(properties).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (ALLOWED_STRING_PROPERTIES.has(key) && typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized && normalized.length <= 120 && (key === 'route' || SAFE_TOKEN.test(normalized))) {
        sanitized[key] = normalized;
      }
      return;
    }
    if (ALLOWED_NUMBER_PROPERTIES.has(key) && typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      sanitized[key] = value;
    }
  });
  return sanitized;
}

function mobileRouteToTemplate(routeName?: string) {
  switch (routeName) {
    case 'Home':
      return '/';
    case 'Calendar':
      return '/calendar';
    case 'Groups':
      return '/groups';
    case 'Community':
      return '/community';
    case 'MyPage':
      return '/mypage';
    case 'Login':
      return '/login';
    case 'OAuthCallback':
      return '/auth/callback';
    case 'ScheduleForm':
      return '/schedule/new';
    case 'GroupForm':
      return '/groups/new';
    case 'GroupDetail':
      return '/groups/:id';
    case 'GroupIntro':
      return '/groups/:id/intro';
    case 'GroupJoin':
    case 'InviteRedirect':
      return '/groups/join/:inviteCode';
    case 'TimeCoordination':
      return '/groups/:id/coordination';
    case 'CoordinationTimetable':
      return '/groups/:id/coordination/:coordId/timetable';
    case 'CommunityPostDetail':
      return '/community/posts/:postId';
    case 'Notifications':
      return '/notifications';
    default:
      return '/';
  }
}

function featureFromRoute(route: string) {
  if (route.startsWith('/calendar') || route.startsWith('/schedule')) return 'schedule';
  if (route.startsWith('/groups')) return 'groups';
  if (route.startsWith('/community')) return 'community';
  if (route.startsWith('/mypage')) return 'settings';
  if (route.startsWith('/login') || route.startsWith('/auth')) return 'auth';
  return 'home';
}
