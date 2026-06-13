import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MainPage from '@/pages/MainPage';
import GroupsPage from '@/pages/GroupsPage';
import CommunityPage from '@/pages/CommunityPage';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  useSchedules: vi.fn(),
  useUpdateSchedule: vi.fn(),
  useDeleteSchedule: vi.fn(),
  useLeaveGroupSchedule: vi.fn(),
  useGroupPages: vi.fn(),
  usePublicGroupPages: vi.fn(),
  useCommunityPosts: vi.fn(),
  useCreateCommunityPost: vi.fn(),
  setSelectedSchedule: vi.fn(),
  setShowScheduleDetail: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

vi.mock('@/context/AppContext', () => ({
  useApp: () => ({
    selectedSchedule: null,
    setSelectedSchedule: mocks.setSelectedSchedule,
    showScheduleDetail: false,
    setShowScheduleDetail: mocks.setShowScheduleDetail,
  }),
}));

vi.mock('@/hooks/useSchedules', () => ({
  useSchedules: mocks.useSchedules,
  useUpdateSchedule: mocks.useUpdateSchedule,
  useDeleteSchedule: mocks.useDeleteSchedule,
  useLeaveGroupSchedule: mocks.useLeaveGroupSchedule,
}));

vi.mock('@/hooks/useGroups', () => ({
  useGroupPages: mocks.useGroupPages,
  usePublicGroupPages: mocks.usePublicGroupPages,
}));

vi.mock('@/hooks/useCommunity', () => ({
  useCommunityPosts: mocks.useCommunityPosts,
  useCreateCommunityPost: mocks.useCreateCommunityPost,
}));

function renderWithProviders(ui: React.ReactNode, initialEntries = ['/']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('loading empty state boundaries', () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.setSelectedSchedule.mockReset();
    mocks.setShowScheduleDetail.mockReset();
    mocks.useSchedules.mockReset();
    mocks.useUpdateSchedule.mockReturnValue({ mutate: vi.fn() });
    mocks.useDeleteSchedule.mockReturnValue({ mutate: vi.fn() });
    mocks.useLeaveGroupSchedule.mockReturnValue({ mutate: vi.fn() });
    mocks.useGroupPages.mockReset();
    mocks.usePublicGroupPages.mockReset();
    mocks.useCommunityPosts.mockReset();
    mocks.useCreateCommunityPost.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  });

  it('does not show the home empty schedule placeholder during initial schedule loading', () => {
    mocks.useSchedules.mockReturnValue({
      data: [],
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isPending: true,
    });

    renderWithProviders(<MainPage />);

    expect(screen.queryByText('일정이 없어요')).not.toBeInTheDocument();
  });

  it('does not show the meetup empty placeholder during initial group loading', () => {
    mocks.useGroupPages.mockReturnValue({
      data: [],
      isLoading: false,
      isPending: true,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
    mocks.usePublicGroupPages.mockReturnValue({
      data: [],
      isLoading: false,
      isPending: false,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    renderWithProviders(<GroupsPage />, ['/groups']);

    expect(screen.queryByText('아직 참여한 모임이 없습니다')).not.toBeInTheDocument();
  });

  it('does not show the community empty placeholder during initial post loading', () => {
    mocks.useCommunityPosts.mockReturnValue({
      data: [],
      isLoading: false,
      isPending: true,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    renderWithProviders(<CommunityPage />, ['/community']);

    expect(screen.queryByText('아직 게시물이 없습니다')).not.toBeInTheDocument();
  });
});
