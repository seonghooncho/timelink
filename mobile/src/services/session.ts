import * as SecureStore from 'expo-secure-store';

export interface AuthSession {
  accessToken: string;
  userId: string;
}

const SESSION_STORAGE_KEY = 'planner.auth.session';
const sessionListeners = new Set<(session: AuthSession | null) => void>();

function notifySessionListeners(session: AuthSession | null) {
  sessionListeners.forEach((listener) => listener(session));
}

export async function getStoredSession() {
  const raw = await SecureStore.getItemAsync(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    await clearStoredSession();
    return null;
  }
}

export async function setStoredSession(session: AuthSession) {
  await SecureStore.setItemAsync(SESSION_STORAGE_KEY, JSON.stringify(session));
  notifySessionListeners(session);
}

export async function clearStoredSession() {
  await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
  notifySessionListeners(null);
}

export async function getAccessToken() {
  const session = await getStoredSession();
  return session?.accessToken ?? null;
}

export function subscribeSession(listener: (session: AuthSession | null) => void) {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}
