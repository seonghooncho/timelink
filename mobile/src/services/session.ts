import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

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
  const raw = await readSessionValue();
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
  await writeSessionValue(JSON.stringify(session));
  notifySessionListeners(session);
}

export async function clearStoredSession() {
  await deleteSessionValue();
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

async function readSessionValue() {
  if (Platform.OS === 'web') {
    return globalThis.localStorage?.getItem(SESSION_STORAGE_KEY) ?? null;
  }
  return SecureStore.getItemAsync(SESSION_STORAGE_KEY);
}

async function writeSessionValue(value: string) {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(SESSION_STORAGE_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(SESSION_STORAGE_KEY, value);
}

async function deleteSessionValue() {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(SESSION_STORAGE_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
}
