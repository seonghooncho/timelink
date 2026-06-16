import { afterEach, describe, expect, it, vi } from 'vitest';

const loadProductAnalytics = async () => {
  vi.resetModules();
  return import('@/lib/productAnalytics');
};

describe('productAnalytics', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it('sends sanitized route templates without raw invite code or url', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const { trackProductEvent } = await loadProductAnalytics();

    trackProductEvent('link_opened', {
      route: '/invite/ABC123?redirect=/groups/group-1',
      feature: 'groups',
      link_type: 'group_invite',
      url: 'https://timelink.cloud/invite/ABC123',
      userId: 'raw-user',
    } as Record<string, string>);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);

    expect(body.eventName).toBe('link_opened');
    expect(body.properties).toMatchObject({
      route: '/invite/:inviteCode',
      feature: 'groups',
      link_type: 'group_invite',
    });
    expect(body.properties).not.toHaveProperty('url');
    expect(body.properties).not.toHaveProperty('userId');
  });

  it('can be disabled by env flag', async () => {
    vi.stubEnv('VITE_PRODUCT_ANALYTICS_ENABLED', 'false');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { trackProductPageView } = await loadProductAnalytics();

    trackProductPageView('/groups/group-1');

    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });
});
