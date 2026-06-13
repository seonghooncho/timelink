import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GroupDetailPage from '@/pages/GroupDetailPage';

const mocks = vi.hoisted(() => ({
  setSelectedSchedule: vi.fn(),
  setShowScheduleDetail: vi.fn(),
  useGroups: vi.fn(),
  useSchedules: vi.fn(),
  useGroupPosts: vi.fn(),
  useCreateGroupPost: vi.fn(),
  useGroupPostComments: vi.fn(),
  useCreateGroupPostComment: vi.fn(),
  useToggleGroupPostLike: vi.fn(),
  getMembers: vi.fn(),
  getCoordinationPage: vi.fn(),
}));

vi.mock('@/context/AppContext', () => ({
  useApp: () => ({
    setSelectedSchedule: mocks.setSelectedSchedule,
    setShowScheduleDetail: mocks.setShowScheduleDetail,
  }),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ userId: 'user-1', isAuthenticated: true }),
}));

vi.mock('@/hooks/useGroups', () => ({
  useGroups: mocks.useGroups,
}));

vi.mock('@/hooks/useSchedules', () => ({
  useSchedules: mocks.useSchedules,
}));

vi.mock('@/hooks/useCommunity', () => ({
  useGroupPosts: mocks.useGroupPosts,
  useCreateGroupPost: mocks.useCreateGroupPost,
  useGroupPostComments: mocks.useGroupPostComments,
  useCreateGroupPostComment: mocks.useCreateGroupPostComment,
  useToggleGroupPostLike: mocks.useToggleGroupPostLike,
}));

vi.mock('@/services/api', async () => {
  const actual = await vi.importActual<typeof import('@/services/api')>('@/services/api');
  return {
    ...actual,
    groupApi: {
      getMembers: mocks.getMembers,
      update: vi.fn(),
      removeMember: vi.fn(),
      getJoinRequests: vi.fn(),
      decideJoinRequest: vi.fn(),
      leaveGroup: vi.fn(),
    },
    coordinationApi: {
      getPage: mocks.getCoordinationPage,
    },
  };
});

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/groups/group-1']}>
        <Routes>
          <Route path="/groups/:id" element={<GroupDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('GroupDetailPage group posts', () => {
  beforeEach(() => {
    mocks.setSelectedSchedule.mockReset();
    mocks.setShowScheduleDetail.mockReset();
    mocks.useGroups.mockReset();
    mocks.useSchedules.mockReset();
    mocks.useGroupPosts.mockReset();
    mocks.useCreateGroupPost.mockReset();
    mocks.useGroupPostComments.mockReset();
    mocks.useCreateGroupPostComment.mockReset();
    mocks.useToggleGroupPostLike.mockReset();
    mocks.getMembers.mockReset();
    mocks.getCoordinationPage.mockReset();

    mocks.useGroups.mockReturnValue({
      data: [{
        id: 'group-1',
        name: '스터디',
        description: '주간 스터디',
        memberCount: 2,
        myRole: 'manager',
        schedules: [],
      }],
    });
    mocks.useSchedules.mockReturnValue({
      data: [],
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
    mocks.useGroupPosts.mockReturnValue({
      data: [],
      isLoading: false,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
    mocks.useCreateGroupPost.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ id: 'post-new' }),
      isPending: false,
    });
    mocks.useGroupPostComments.mockReturnValue({
      data: [],
      isLoading: false,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
    mocks.useCreateGroupPostComment.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ id: 'comment-new' }),
      isPending: false,
    });
    mocks.useToggleGroupPostLike.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ id: 'post-1' }),
      isPending: false,
    });
    mocks.getMembers.mockResolvedValue([
      { id: 'member-1', userId: 'user-1', nickname: '민지', avatarUrl: '', role: 'manager', joinedAt: '2026-06-13T00:00:00Z' },
    ]);
    mocks.getCoordinationPage.mockResolvedValue({ data: [], meta: { perPage: 10, nextCursor: null } });
  });

  it('hides the meetup schedule section when no upcoming schedule exists', async () => {
    renderPage();

    expect(await screen.findByText('모임 게시판')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /모임 일정/ })).not.toBeInTheDocument();
  });

  it('creates a group post from the group detail page', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ id: 'post-new' });
    mocks.useCreateGroupPost.mockReturnValue({ mutateAsync, isPending: false });

    renderPage();

    await screen.findByText('모임 게시판');
    fireEvent.click(screen.getByRole('button', { name: '글쓰기' }));
    fireEvent.change(screen.getByPlaceholderText('게시물 제목'), { target: { value: '내일 준비물' } });
    fireEvent.change(screen.getByPlaceholderText('멤버들에게 공유할 내용을 적어주세요.'), { target: { value: '노트북 챙겨오세요.' } });
    fireEvent.click(screen.getByRole('button', { name: '게시물 등록' }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({
      title: '내일 준비물',
      content: '노트북 챙겨오세요.',
    }));
  });

  it('opens comments and creates a group post comment', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ id: 'comment-new' });
    mocks.useGroupPosts.mockReturnValue({
      data: [{
        id: 'post-1',
        groupId: 'group-1',
        title: '내일 준비물',
        content: '노트북 챙겨오세요.',
        authorUserId: 'user-2',
        authorNickname: '지훈',
        authorAvatarUrl: '',
        likeCount: 0,
        commentCount: 0,
        likedByMe: false,
        mine: false,
        createdAt: '2026-06-13T00:00:00Z',
        updatedAt: '2026-06-13T00:00:00Z',
      }],
      isLoading: false,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
    mocks.useCreateGroupPostComment.mockReturnValue({ mutateAsync, isPending: false });

    renderPage();

    await screen.findByText('내일 준비물');
    fireEvent.click(screen.getByRole('button', { name: '댓글 0' }));
    fireEvent.change(screen.getByPlaceholderText('댓글을 입력해주세요'), { target: { value: '확인했습니다.' } });
    fireEvent.click(screen.getByRole('button', { name: '댓글 등록' }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith('확인했습니다.'));
  });
});
