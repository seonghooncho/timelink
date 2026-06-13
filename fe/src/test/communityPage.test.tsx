import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CommunityPage from '@/pages/CommunityPage';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  usePublicGroupPages: vi.fn(),
  getMe: vi.fn(),
  requestToJoin: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

vi.mock('@/hooks/useGroups', () => ({
  usePublicGroupPages: mocks.usePublicGroupPages,
}));

vi.mock('@/services/api', () => ({
  profileApi: {
    getMe: mocks.getMe,
  },
  groupApi: {
    requestToJoin: mocks.requestToJoin,
  },
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CommunityPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CommunityPage', () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.usePublicGroupPages.mockReset();
    mocks.getMe.mockReset();
    mocks.requestToJoin.mockReset();
    mocks.getMe.mockResolvedValue({ nickname: '민지', avatarUrl: '' });
    mocks.usePublicGroupPages.mockReturnValue({
      data: [],
      isLoading: false,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
  });

  it('shows public meetup discovery empty state', () => {
    renderPage();

    expect(screen.getByText('공개 모임 찾아보기')).toBeInTheDocument();
    expect(screen.getByText('아직 공개 모임이 없습니다')).toBeInTheDocument();
  });

  it('opens join request modal for public meetups', () => {
    mocks.usePublicGroupPages.mockReturnValue({
      data: [{
        id: 'group-1',
        name: '주말 러닝',
        description: '가볍게 뛰는 모임',
        visibility: 'PUBLIC',
        memberCount: 4,
        schedules: [],
      }],
      isLoading: false,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /가입 요청/ }));

    expect(screen.getByText('가입요청 보내기')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('어떤 모임을 기대하는지 짧게 남겨보세요.')).toBeInTheDocument();
  });
});
