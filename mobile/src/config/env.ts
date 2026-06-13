import Constants from 'expo-constants';

interface AppExtra {
  plannerApiBaseUrl?: string;
  aiApiBaseUrl?: string;
  webAppOrigin?: string;
  mobileAppOrigin?: string;
  enableDevLogin?: boolean;
}

const extra = (Constants.expoConfig?.extra ?? {}) as AppExtra;

// Expo extra 값을 런타임 설정 진입점으로 모아 스토어 빌드와 개발 빌드의 차이를 관리한다.
export const env = {
  plannerApiBaseUrl: extra.plannerApiBaseUrl ?? 'https://timelink.cloud/api/planner/v1',
  aiApiBaseUrl: extra.aiApiBaseUrl ?? 'https://timelink.cloud/api/ai/v1',
  webAppOrigin: extra.webAppOrigin ?? 'https://timelink.cloud',
  mobileAppOrigin: extra.mobileAppOrigin ?? 'timelink://app',
  enableDevLogin: extra.enableDevLogin ?? false,
};
