import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ConsentPage from '@/pages/ConsentPage';

const mocks = vi.hoisted(() => ({
  getMe: vi.fn(),
  agreeRequiredConsents: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastInfo: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  profileApi: {
    getMe: mocks.getMe,
    agreeRequiredConsents: mocks.agreeRequiredConsents,
  },
}));

vi.mock('@/lib/appToast', () => ({
  appToast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
    info: mocks.toastInfo,
  },
}));

const renderWithClient = (initialPath = '/consent?redirect=%2Fgroups') => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/consent" element={<ConsentPage />} />
          <Route path="/groups" element={<div>groups-page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('ConsentPage', () => {
  beforeEach(() => {
    mocks.getMe.mockReset();
    mocks.agreeRequiredConsents.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.toastError.mockReset();
    mocks.toastInfo.mockReset();
    mocks.getMe.mockResolvedValue({
      id: 'user-1',
      nickname: '사용자',
      avatarUrl: '',
      requiredConsentCompleted: false,
      createdAt: '2026-06-10T00:00:00Z',
      updatedAt: '2026-06-10T00:00:00Z',
    });
    mocks.agreeRequiredConsents.mockResolvedValue({
      id: 'user-1',
      nickname: '사용자',
      avatarUrl: '',
      requiredConsentCompleted: true,
      createdAt: '2026-06-10T00:00:00Z',
      updatedAt: '2026-06-10T00:00:00Z',
    });
  });

  it('requires both terms and privacy checks before saving consent', async () => {
    renderWithClient();

    const submitButton = screen.getByRole('button', { name: '동의하고 시작하기' });
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

    fireEvent.click(submitButton);

    expect(mocks.toastInfo).toHaveBeenCalledWith(
      '필수 항목을 확인해주세요',
      '이용약관과 개인정보 수집·이용 동의가 필요합니다.',
    );
    expect(mocks.agreeRequiredConsents).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('checkbox', { name: '이용약관 동의' }));
    fireEvent.click(screen.getByRole('checkbox', { name: '개인정보 수집·이용 동의' }));
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mocks.agreeRequiredConsents).toHaveBeenCalled();
    });
    expect(await screen.findByText('groups-page')).toBeInTheDocument();
  });

  it('redirects immediately when the current consent is already complete', async () => {
    mocks.getMe.mockResolvedValueOnce({
      id: 'user-1',
      nickname: '사용자',
      avatarUrl: '',
      requiredConsentCompleted: true,
      createdAt: '2026-06-10T00:00:00Z',
      updatedAt: '2026-06-10T00:00:00Z',
    });

    renderWithClient();

    expect(await screen.findByText('groups-page')).toBeInTheDocument();
  });
});
