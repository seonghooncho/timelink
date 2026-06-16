import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminAnalyticsPage from '@/pages/AdminAnalyticsPage';

const mocks = vi.hoisted(() => ({
  getSummary: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  adminAnalyticsApi: {
    getSummary: mocks.getSummary,
  },
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AdminAnalyticsPage />
      </BrowserRouter>
    </QueryClientProvider>,
  );
}

describe('AdminAnalyticsPage', () => {
  beforeEach(() => {
    mocks.getSummary.mockReset();
  });

  it('renders slow API p50 p95 and error counts from admin summary', async () => {
    mocks.getSummary.mockResolvedValue({
      date: '2026-06-16',
      totalUsers: 10,
      todaySignups: 1,
      todayActiveUsers: 3,
      activeUsers7d: 5,
      activeUsers30d: 7,
      todayLinksCreated: 2,
      todayLinksOpened: 4,
      averageActivitySeconds: 90,
      topFeatures: [],
      apiPerformance: [
        {
          method: 'GET',
          route: '/api/planner/v1/groups/{id}',
          count: 12,
          averageMs: 780,
          p50Ms: 400,
          p95Ms: 3_200,
          clientErrorCount: 1,
          serverErrorCount: 2,
        },
      ],
      recentErrors: [],
    });

    renderPage();

    expect(await screen.findByText('느린 API')).toBeInTheDocument();
    expect(screen.getByText('/api/planner/v1/groups/{id}')).toBeInTheDocument();
    expect(screen.getByText('3.2s')).toBeInTheDocument();
    expect(screen.getByText('400ms')).toBeInTheDocument();
    expect(screen.getByText('4xx 1')).toBeInTheDocument();
    expect(screen.getByText('5xx 2')).toBeInTheDocument();
  });
});
