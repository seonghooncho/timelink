export interface AuthSession {
  accessToken: string;
  userId: string;
}

const SESSION_STORAGE_KEY = 'planner.auth.session';
let currentSession: AuthSession | null = null;

export function getStoredSession(): AuthSession | null {
  if (typeof window === 'undefined') {
    return currentSession;
  }

  if (currentSession) {
    return currentSession;
  }

  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    currentSession = JSON.parse(raw) as AuthSession;
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return currentSession;
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export function setStoredSession(session: AuthSession): void {
  currentSession = session;
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function clearStoredSession(): void {
  currentSession = null;
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function getAccessToken(): string | null {
  return getStoredSession()?.accessToken ?? null;
}
