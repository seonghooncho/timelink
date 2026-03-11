import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { AuthLoginRequest, AuthSessionResponse, authApi } from '../services/api';
import { clearStoredSession, getStoredSession, setStoredSession } from '../services/session';

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  signIn: (credentials: AuthLoginRequest) => Promise<void>;
  completeSession: (session: AuthSessionResponse) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      const storedSession = await getStoredSession();
      if (!storedSession) {
        if (mounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const session = await authApi.getMe();
        await setStoredSession(session);
        if (mounted) {
          setIsAuthenticated(true);
          setUserId(session.userId);
        }
      } catch {
        await clearStoredSession();
        if (mounted) {
          setIsAuthenticated(false);
          setUserId(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    isAuthenticated,
    isLoading,
    userId,
    signIn: async (credentials) => {
      const session = await authApi.login(credentials);
      await setStoredSession(session);
      setIsAuthenticated(true);
      setUserId(session.userId);
    },
    completeSession: async (session) => {
      await setStoredSession(session);
      setIsAuthenticated(true);
      setUserId(session.userId);
      setIsLoading(false);
    },
    signOut: async () => {
      await clearStoredSession();
      setIsAuthenticated(false);
      setUserId(null);
    },
  }), [isAuthenticated, isLoading, userId]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
