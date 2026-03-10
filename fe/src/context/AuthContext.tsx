import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi, AuthLoginRequest, AuthSessionResponse } from '@/services/api';
import { clearStoredSession, getStoredSession, setStoredSession } from '@/services/session';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  signIn: (credentials: AuthLoginRequest) => Promise<void>;
  completeSession: (session: AuthSessionResponse) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const storedSession = getStoredSession();
    if (!storedSession) {
      setIsLoading(false);
      return;
    }

    authApi.getMe()
      .then((session) => {
        setStoredSession(session);
        setIsAuthenticated(true);
        setUserId(session.userId);
      })
      .catch(() => {
        clearStoredSession();
        setIsAuthenticated(false);
        setUserId(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const signIn = async (credentials: AuthLoginRequest) => {
    const session = await authApi.login(credentials);
    setStoredSession(session);
    setIsAuthenticated(true);
    setUserId(session.userId);
  };

  const completeSession = (session: AuthSessionResponse) => {
    setStoredSession(session);
    setIsAuthenticated(true);
    setUserId(session.userId);
    setIsLoading(false);
  };

  const signOut = async () => {
    clearStoredSession();
    setIsAuthenticated(false);
    setUserId(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, userId, signIn, completeSession, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
