import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/api';

const mocks = vi.hoisted(() => ({
  getMe: vi.fn(),
  getStoredSession: vi.fn(),
  setStoredSession: vi.fn(),
  clearStoredSession: vi.fn(),
}));

vi.mock('@/services/api', async () => {
  const actual = await vi.importActual<typeof import('@/services/api')>('@/services/api');
  return {
    ...actual,
    authApi: {
      ...actual.authApi,
      getMe: mocks.getMe,
    },
  };
});

vi.mock('@/services/session', () => ({
  getStoredSession: mocks.getStoredSession,
  setStoredSession: mocks.setStoredSession,
  clearStoredSession: mocks.clearStoredSession,
}));

function AuthStateProbe() {
  const { isAuthenticated, isLoading, userId } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="userId">{userId ?? ''}</span>
    </div>
  );
}

describe('AuthProvider bootstrap', () => {
  beforeEach(() => {
    mocks.getMe.mockReset();
    mocks.getStoredSession.mockReset();
    mocks.setStoredSession.mockReset();
    mocks.clearStoredSession.mockReset();
  });

  it('keeps the stored session on transient server errors', async () => {
    mocks.getStoredSession.mockReturnValue({
      accessToken: 'stale-token',
      userId: 'user-500',
    });
    mocks.getMe.mockRejectedValue(new ApiError(500, 'server error'));

    render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    expect(screen.getByTestId('userId')).toHaveTextContent('user-500');
    expect(mocks.clearStoredSession).not.toHaveBeenCalled();
  });

  it('clears the stored session on unauthorized responses', async () => {
    mocks.getStoredSession.mockReturnValue({
      accessToken: 'expired-token',
      userId: 'user-401',
    });
    mocks.getMe.mockRejectedValue(new ApiError(401, 'expired'));

    render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('userId')).toHaveTextContent('');
    expect(mocks.clearStoredSession).toHaveBeenCalledTimes(1);
  });
});
