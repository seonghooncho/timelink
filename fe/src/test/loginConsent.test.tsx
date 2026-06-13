import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from '@/pages/LoginPage';

const mocks = vi.hoisted(() => ({
  getProviders: vi.fn(),
  getOAuthStartUrl: vi.fn(),
  signIn: vi.fn(),
  toastInfo: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    signIn: mocks.signIn,
  }),
}));

vi.mock('@/services/api', () => ({
  authApi: {
    getProviders: mocks.getProviders,
    getOAuthStartUrl: mocks.getOAuthStartUrl,
  },
}));

vi.mock('@/lib/appOrigin', () => ({
  getPublicAppOrigin: () => 'https://timelink.cloud',
}));

vi.mock('@/lib/appToast', () => ({
  appToast: {
    info: mocks.toastInfo,
    error: mocks.toastError,
  },
}));

describe('LoginPage consent', () => {
  beforeEach(() => {
    mocks.getProviders.mockReset();
    mocks.getOAuthStartUrl.mockReset();
    mocks.signIn.mockReset();
    mocks.toastInfo.mockReset();
    mocks.toastError.mockReset();
    mocks.getProviders.mockResolvedValue({ google: true, kakao: true });
  });

  it('shows post-login consent guidance without blocking social login on a checkbox', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mocks.getProviders).toHaveBeenCalled();
    });

    expect(screen.queryByRole('checkbox', { name: '필수 약관 동의' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '먼저 둘러보기' })).toHaveAttribute('href', '/demo');
    expect(screen.getByRole('link', { name: '이용약관' })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: '개인정보 안내' })).toHaveAttribute('href', '/privacy');
    expect(screen.getByText(/처음 시작할 때/)).toBeInTheDocument();
  });
});
