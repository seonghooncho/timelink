import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OAuthCallbackPage from '@/pages/OAuthCallbackPage';

const mocks = vi.hoisted(() => ({
  completeSession: vi.fn(),
  clearStoredSession: vi.fn(),
  getAccessToken: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    completeSession: mocks.completeSession,
  }),
}));

vi.mock('@/services/session', () => ({
  clearStoredSession: mocks.clearStoredSession,
  getAccessToken: mocks.getAccessToken,
}));

vi.mock('sonner', () => ({
  toast: {
    error: mocks.toastError,
  },
}));

describe('OAuthCallbackPage', () => {
  beforeEach(() => {
    mocks.completeSession.mockReset();
    mocks.clearStoredSession.mockReset();
    mocks.getAccessToken.mockReset();
    mocks.toastError.mockReset();
  });

  it('completes session from hash params and navigates to redirect target', async () => {
    window.history.replaceState({}, '', '/auth/callback#accessToken=test-token&userId=user-1&redirect=%2Fcalendar');

    render(
      <BrowserRouter>
        <Routes>
          <Route path="/auth/callback" element={<OAuthCallbackPage />} />
          <Route path="/calendar" element={<div>calendar-page</div>} />
        </Routes>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mocks.completeSession).toHaveBeenCalledWith({
        accessToken: 'test-token',
        userId: 'user-1',
      });
    });

    expect(screen.getByText('calendar-page')).toBeInTheDocument();
    expect(mocks.clearStoredSession).not.toHaveBeenCalled();
  });

  it('clears session and returns to login when hash params are missing', async () => {
    window.history.replaceState({}, '', '/auth/callback');

    render(
      <BrowserRouter>
        <Routes>
          <Route path="/auth/callback" element={<OAuthCallbackPage />} />
          <Route path="/login" element={<div>login-page</div>} />
        </Routes>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mocks.clearStoredSession).toHaveBeenCalled();
    });

    expect(mocks.completeSession).not.toHaveBeenCalled();
    expect(mocks.toastError).toHaveBeenCalledWith('로그인 결과를 확인할 수 없습니다');
    expect(screen.getByText('login-page')).toBeInTheDocument();
  });
});
