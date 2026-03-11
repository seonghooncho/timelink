const CANONICAL_APP_ORIGIN = 'https://timelink.cloud';

export function getPublicAppOrigin() {
  if (typeof window === 'undefined') {
    return CANONICAL_APP_ORIGIN;
  }

  const { origin, hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return origin;
  }

  if (hostname === 'timelink.cloud' || hostname === 'www.timelink.cloud') {
    return CANONICAL_APP_ORIGIN;
  }

  return CANONICAL_APP_ORIGIN;
}
