import { pushApi, PushSubscriptionRequest } from '@/services/api';

const urlBase64ToUint8Array = (base64String: string) => {
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

  return null;
};

export const ensurePushSubscription = async () => {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
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
