import { afterEach, describe, expect, it, vi } from 'vitest';

const loadAnalytics = async (measurementId?: string) => {
  vi.resetModules();
  if (measurementId) {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', measurementId);
  } else {
    vi.unstubAllEnvs();
  }
  document.head.innerHTML = '';
  delete window.dataLayer;
  delete window.gtag;
  return import('@/lib/analytics');
};

describe('analytics', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    document.head.innerHTML = '';
    delete window.dataLayer;
    delete window.gtag;
  });

  it('does not load GA when measurement id is missing', async () => {
    const { trackEvent, isAnalyticsConfigured } = await loadAnalytics();

    trackEvent('demo_view', { tab: 'home' });

    expect(isAnalyticsConfigured()).toBe(false);
    expect(document.querySelector('script[data-ga4-id]')).toBeNull();
    expect(window.dataLayer).toBeUndefined();
  });

  it('loads GA and sends page views when measurement id exists', async () => {
    const { trackPageView, isAnalyticsConfigured } = await loadAnalytics('G-TEST1234');

    trackPageView('/demo');
    const queuedCommands = window.dataLayer?.map((entry) => Array.from(entry as ArrayLike<unknown>));

    expect(isAnalyticsConfigured()).toBe(true);
    expect(document.querySelector('script[data-ga4-id="G-TEST1234"]')).toBeInTheDocument();
    expect(queuedCommands).toContainEqual(['js', expect.any(Date)]);
    expect(queuedCommands).toContainEqual(['config', 'G-TEST1234', { send_page_view: false }]);
    expect(queuedCommands).toContainEqual([
      'config',
      'G-TEST1234',
      expect.objectContaining({ page_path: '/demo' }),
    ]);
  });
});
