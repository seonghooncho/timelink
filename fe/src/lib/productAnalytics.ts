import { getAccessToken } from '@/services/session';

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

const isBrowser = () => typeof window !== 'undefined';

const isEnabled = () => import.meta.env.VITE_PRODUCT_ANALYTICS_ENABLED !== 'false';

export function routeToTemplate(path: string) {
  const route = path.trim().split(/[?#]/, 1)[0] || '/';
  if (/^\/groups\/[^/]+\/coordination\/[^/]+\/timetable$/.test(route)) return '/groups/:id/coordination/:coordId/timetable';
  if (/^\/groups\/[^/]+\/coordination$/.test(route)) return '/groups/:id/coordination';
  if (/^\/groups\/[^/]+\/posts\/[^/]+$/.test(route)) return '/groups/:id/posts/:postId';
  if (/^\/groups\/[^/]+\/intro$/.test(route)) return '/groups/:id/intro';
  if (/^\/groups\/join\/[^/]+$/.test(route)) return '/groups/join/:inviteCode';
  if (/^\/groups\/[^/]+$/.test(route)) return '/groups/:id';
  if (/^\/community\/posts\/[^/]+$/.test(route)) return '/community/posts/:postId';
  if (/^\/invite\/[^/]+$/.test(route)) return '/invite/:inviteCode';
  return route;
}

export function trackProductPageView(path: string) {
  trackProductEvent('page_view', {
    route: routeToTemplate(path),
    feature: featureFromRoute(path),
    page_type: pageTypeFromRoute(path),
  });
}

export function trackProductEvent(eventName: ProductAnalyticsEventName, properties: ProductAnalyticsProperties = {}) {
  if (!isBrowser() || !isEnabled()) return;

  const body = JSON.stringify({
    eventName,
    properties: sanitizeProperties({
      surface: 'web',
      platform: 'web',
      ...properties,
    }),
  });
  const token = getAccessToken();

  void fetch('/api/planner/v1/analytics/track', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

function sanitizeProperties(properties: ProductAnalyticsProperties) {
  const sanitized: ProductAnalyticsProperties = {};
  Object.entries(properties).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (ALLOWED_STRING_PROPERTIES.has(key) && typeof value === 'string') {
      const normalized = key === 'route' ? routeToTemplate(value) : value.trim().toLowerCase();
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

function featureFromRoute(path: string) {
  if (path.startsWith('/calendar') || path.startsWith('/schedule')) return 'schedule';
  if (path.startsWith('/groups') || path.startsWith('/invite')) return 'groups';
  if (path.startsWith('/community')) return 'community';
  if (path.startsWith('/mypage') || path.startsWith('/settings')) return 'settings';
  if (path.startsWith('/login') || path.startsWith('/auth')) return 'auth';
  if (path.startsWith('/demo')) return 'demo';
  return 'home';
}

function pageTypeFromRoute(path: string) {
  if (path === '/') return 'home';
  const firstSegment = path.split('/').filter(Boolean)[0];
  return firstSegment || 'home';
}
