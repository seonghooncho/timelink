import { pushApi, PushSubscriptionRequest } from '@/services/api';

export const PUSH_PERMISSION_NUDGE_PENDING_KEY = 'timelink:push-permission-nudge-pending';

export const markPushPermissionNudgePending = () => {
  localStorage.setItem(PUSH_PERMISSION_NUDGE_PENDING_KEY, '1');
};

export const clearPushPermissionNudgePending = () => {
  localStorage.removeItem(PUSH_PERMISSION_NUDGE_PENDING_KEY);
};

export const isPushPermissionNudgePending = () =>
  localStorage.getItem(PUSH_PERMISSION_NUDGE_PENDING_KEY) === '1';

export const isPushNotificationSupported = () =>
  'Notification' in window
  && 'serviceWorker' in navigator
  && 'PushManager' in window
  && typeof Notification.requestPermission === 'function';

export const requestPushPermission = async () => {
  if (!isPushNotificationSupported()) {
    return 'unsupported' as const;
  }

  if (Notification.permission === 'granted') {
    return 'granted' as const;
  }

  if (Notification.permission === 'denied') {
    return 'denied' as const;
  }

  try {
    return await Notification.requestPermission();
  } catch {
    return 'unsupported' as const;
  }
};

const urlBase64ToUint8Array = (base64String: string) => {
  // 브라우저 PushManager는 VAPID public key를 Uint8Array 형태로 요구한다.
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    output[i] = rawData.charCodeAt(i);
  }

  return output;
};

const toRequest = (subscription: PushSubscription): PushSubscriptionRequest | null => {
  const json = subscription.toJSON() as {
    endpoint?: string;
    keys?: {
      p256dh?: string;
      auth?: string;
    };
  };

  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return null;
  }

  return {
    endpoint: json.endpoint,
    keys: {
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    userAgent: navigator.userAgent,
  };
};

const getRegistration = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null;
  }

  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) {
    return existing;
  }

  // service worker 등록이 늦게 끝나는 PWA 진입도 기다려서 구독 실패를 줄인다.
  return navigator.serviceWorker.ready.catch(() => null);
};

export const ensurePushSubscription = async () => {
  if (!isPushNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const keyInfo = await pushApi.getVapidPublicKey();
  if (!keyInfo.enabled || !keyInfo.publicKey) {
    return false;
  }

  const registration = await getRegistration();
  if (!registration) {
    return false;
  }

  // 같은 브라우저에서 이미 만든 구독이 있으면 재사용하고 서버 저장만 갱신한다.
  const existing = await registration.pushManager.getSubscription();
  const subscription = existing || await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(keyInfo.publicKey),
  });

  const request = toRequest(subscription);
  if (!request) {
    return false;
  }

  await pushApi.saveSubscription(request);
  return true;
};

export const removePushSubscription = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) {
    return;
  }

  const request = toRequest(subscription);
  if (request) {
    await pushApi.deleteSubscription(request).catch(() => undefined);
  }
  await subscription.unsubscribe();
};
