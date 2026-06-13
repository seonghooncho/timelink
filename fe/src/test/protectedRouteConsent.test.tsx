import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProtectedRoute from '@/components/layout/ProtectedRoute';

const mocks = vi.hoisted(() => ({
  getMe: vi.fn(),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('@/services/api', () => ({
  profileApi: {
    getMe: mocks.getMe,
  },
}));

const renderRoute = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/calendar']}>
        <Routes>
          <Route path="/calendar" element={<ProtectedRoute><div>calendar-page</div></ProtectedRoute>} />
          <Route path="/consent" element={<div>consent-page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('ProtectedRoute consent gate', () => {
  beforeEach(() => {
    mocks.getMe.mockReset();
  });

  it('redirects authenticated users without required consent to the consent gate', async () => {
    mocks.getMe.mockResolvedValue({
      id: 'user-1',
      nickname: '사용자',
      avatarUrl: '',
      requiredConsentCompleted: false,
      createdAt: '2026-06-10T00:00:00Z',
      updatedAt: '2026-06-10T00:00:00Z',
    });

    renderRoute();

    expect(await screen.findByText('consent-page')).toBeInTheDocument();
  });

  it('renders protected content when required consent is complete', async () => {
    mocks.getMe.mockResolvedValue({
      id: 'user-1',
      nickname: '사용자',
      avatarUrl: '',
      requiredConsentCompleted: true,
      createdAt: '2026-06-10T00:00:00Z',
      updatedAt: '2026-06-10T00:00:00Z',
    });

    renderRoute();

    await waitFor(() => {
      expect(screen.getByText('calendar-page')).toBeInTheDocument();
    });
  });

  it('shows a retry path when profile loading fails', async () => {
    mocks.getMe.mockRejectedValue(new Error('temporary failure'));

    renderRoute();

    expect(await screen.findByText('사용자 정보를 불러오지 못했습니다')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument();
  });
});
