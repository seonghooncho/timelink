import Constants from 'expo-constants';

interface AppExtra {
  plannerApiBaseUrl?: string;
  aiApiBaseUrl?: string;
  webAppOrigin?: string;
  mobileAppOrigin?: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as AppExtra;

export const env = {
  plannerApiBaseUrl: extra.plannerApiBaseUrl ?? 'https://timelink.cloud/api/planner/v1',
  aiApiBaseUrl: extra.aiApiBaseUrl ?? 'https://timelink.cloud/api/ai/v1',
  webAppOrigin: extra.webAppOrigin ?? 'https://timelink.cloud',
  mobileAppOrigin: extra.mobileAppOrigin ?? 'timelink://app',
};
