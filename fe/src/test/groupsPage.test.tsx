import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GroupsPage from '@/pages/GroupsPage';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  useGroupPages: vi.fn(),
  usePublicGroupPages: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

vi.mock('@/hooks/useGroups', () => ({
  useGroupPages: mocks.useGroupPages,
  usePublicGroupPages: mocks.usePublicGroupPages,
}));

function renderPage(initialEntries = ['/groups']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <GroupsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('GroupsPage', () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.useGroupPages.mockReset();
    mocks.usePublicGroupPages.mockReset();
    mocks.useGroupPages.mockReturnValue({
      data: [],
      isLoading: false,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
    mocks.usePublicGroupPages.mockReturnValue({
      data: [],
      isLoading: false,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
  });

  it('shows a creation and discovery placeholder when the user has no meetups', () => {
    renderPage();

    expect(screen.getByText('아직 참여한 모임이 없습니다')).toBeInTheDocument();
    expect(screen.getByText(/초대를 받았다면 공유받은 링크/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /모임 만들기/ }));

    expect(mocks.navigate).toHaveBeenCalledWith('/groups/new');
  });

  it('loads the next group page when more groups are available', () => {
    const fetchNextPage = vi.fn();
    mocks.useGroupPages.mockReturnValue({
      data: [
        {
          id: 'group-1',
          name: '스터디',
          description: '',
          memberCount: 3,
          schedules: [],
        },
      ],
      isLoading: false,
      fetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: false,
    });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: '모임 더보기' }));

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('shows next schedule summary on my meetup card', () => {
    mocks.useGroupPages.mockReturnValue({
      data: [
        {
          id: 'group-1',
          name: '스터디',
          description: '',
          memberCount: 3,
          nextSchedule: {
            id: 'schedule-1',
            title: '주말 회고',
            startTime: new Date().toISOString(),
            duration: 1,
          },
          schedules: [],
        },
      ],
      isLoading: false,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    renderPage();

    expect(screen.getByText('주말 회고')).toBeInTheDocument();
    expect(screen.getByText('D-Day')).toBeInTheDocument();
  });

  it('does not show an empty next schedule placeholder on my meetup card', () => {
    mocks.useGroupPages.mockReturnValue({
      data: [
        {
          id: 'group-1',
          name: '스터디',
          description: '',
          memberCount: 3,
          schedules: [],
        },
      ],
      isLoading: false,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    renderPage();

    expect(screen.getByText('스터디')).toBeInTheDocument();
    expect(screen.queryByText('예정된 모임 일정이 없습니다')).not.toBeInTheDocument();
  });

  it('opens public meetup intro from query tab', () => {
    mocks.usePublicGroupPages.mockReturnValue({
      data: [{
        id: 'group-2',
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

    renderPage(['/groups?tab=discover']);

    expect(screen.getByText('공개 모임 찾아보기')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /소개 보기/ }));

    expect(mocks.navigate).toHaveBeenCalledWith('/groups/group-2/intro');
  });
});
