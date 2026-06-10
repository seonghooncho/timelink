import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  it('shows legal links and blocks login until required consent is checked', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: '이용약관' })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: '개인정보 수집·이용' })).toHaveAttribute('href', '/privacy');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /카카오로 시작하기/ })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /카카오로 시작하기/ }));

    expect(mocks.toastInfo).toHaveBeenCalledWith(
      '필수 약관에 동의해주세요',
      '서비스 이용약관과 개인정보 수집·이용 동의가 필요합니다.',
    );
    expect(mocks.getOAuthStartUrl).not.toHaveBeenCalled();
  });
});
