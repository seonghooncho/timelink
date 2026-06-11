import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GroupsPage from '@/pages/GroupsPage';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  useGroups: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

vi.mock('@/hooks/useGroups', () => ({
  useGroupPages: mocks.useGroups,
}));

describe('GroupsPage', () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.useGroups.mockReset();
    mocks.useGroups.mockReturnValue({
      data: [],
      isLoading: false,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
  });

  it('shows a creation-focused placeholder when the user has no groups', () => {
    render(
      <MemoryRouter>
        <GroupsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('아직 참여한 그룹이 없습니다')).toBeInTheDocument();
    expect(screen.getByText(/초대를 받았다면 공유받은 링크/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /그룹 만들기/ }));

    expect(mocks.navigate).toHaveBeenCalledWith('/groups/new');
  });

  it('loads the next group page when more groups are available', () => {
    const fetchNextPage = vi.fn();
    mocks.useGroups.mockReturnValue({
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

    render(
      <MemoryRouter>
        <GroupsPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: '그룹 더보기' }));

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });
});
