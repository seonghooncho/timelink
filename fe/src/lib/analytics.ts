const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() || '';

type AnalyticsValue = string | number | boolean | null | undefined;
type AnalyticsParams = Record<string, AnalyticsValue>;
type GtagArguments =
  | ['js', Date]
  | ['config', string, AnalyticsParams?]
  | ['event', string, AnalyticsParams?]
  | ['set', string, AnalyticsValue | AnalyticsParams];

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: GtagArguments) => void;
  }
}

let initialized = false;

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined';

const respectsDoNotTrack = () => {
  if (!isBrowser()) return true;
  return navigator.doNotTrack === '1' || window.doNotTrack === '1';
};

export const isAnalyticsConfigured = () => GA_MEASUREMENT_ID.startsWith('G-');

export const isAnalyticsEnabled = () => isAnalyticsConfigured() && isBrowser() && !respectsDoNotTrack();

const appendGoogleTagScript = () => {
  const existing = document.querySelector<HTMLScriptElement>(`script[data-ga4-id="${GA_MEASUREMENT_ID}"]`);
  if (existing) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
  script.dataset.ga4Id = GA_MEASUREMENT_ID;
  document.head.appendChild(script);
};

export const initializeAnalytics = () => {
  if (initialized || !isAnalyticsEnabled()) return false;

  window.dataLayer = window.dataLayer || [];
  // GA 표준 스니펫과 같은 큐 형식으로 쌓아 gtag.js가 명령을 안정적으로 처리하게 함
  window.gtag = window.gtag || (function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments);
  } as (...args: GtagArguments) => void);

  appendGoogleTagScript();
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, { send_page_view: false });
  initialized = true;
  return true;
};

export const trackPageView = (path: string, title = document.title) => {
  if (!initializeAnalytics() || !window.gtag) return;

  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: path,
    page_title: title,
    page_location: `${window.location.origin}${path}`,
  });
};

export const trackEvent = (eventName: string, params: AnalyticsParams = {}) => {
  if (!initializeAnalytics() || !window.gtag) return;

  window.gtag('event', eventName, params);
};
