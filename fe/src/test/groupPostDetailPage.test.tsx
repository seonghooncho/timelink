import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GroupPostDetailPage from '@/pages/GroupPostDetailPage';

const mocks = vi.hoisted(() => ({
  useGroupPost: vi.fn(),
  useGroupPostComments: vi.fn(),
  useToggleGroupPostLike: vi.fn(),
  useUpdateGroupPost: vi.fn(),
  useDeleteGroupPost: vi.fn(),
  useCreateGroupPostComment: vi.fn(),
  useUpdateGroupPostComment: vi.fn(),
  useDeleteGroupPostComment: vi.fn(),
  getMemberProfile: vi.fn(),
}));

vi.mock('@/hooks/useCommunity', () => ({
  useGroupPost: mocks.useGroupPost,
  useGroupPostComments: mocks.useGroupPostComments,
  useToggleGroupPostLike: mocks.useToggleGroupPostLike,
  useUpdateGroupPost: mocks.useUpdateGroupPost,
  useDeleteGroupPost: mocks.useDeleteGroupPost,
  useCreateGroupPostComment: mocks.useCreateGroupPostComment,
  useUpdateGroupPostComment: mocks.useUpdateGroupPostComment,
  useDeleteGroupPostComment: mocks.useDeleteGroupPostComment,
}));

vi.mock('@/services/api', async () => {
  const actual = await vi.importActual<typeof import('@/services/api')>('@/services/api');
  return {
    ...actual,
    groupApi: {
      ...actual.groupApi,
      getMemberProfile: mocks.getMemberProfile,
    },
  };
});

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/groups/group-1/posts/post-1']}>
        <Routes>
          <Route path="/groups/:id/posts/:postId" element={<GroupPostDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('GroupPostDetailPage', () => {
  beforeEach(() => {
    mocks.useGroupPost.mockReset();
    mocks.useGroupPostComments.mockReset();
    mocks.useToggleGroupPostLike.mockReset();
    mocks.useUpdateGroupPost.mockReset();
    mocks.useDeleteGroupPost.mockReset();
    mocks.useCreateGroupPostComment.mockReset();
    mocks.useUpdateGroupPostComment.mockReset();
    mocks.useDeleteGroupPostComment.mockReset();
    mocks.getMemberProfile.mockReset();

    mocks.useGroupPost.mockReturnValue({
      data: {
        id: 'post-1',
        groupId: 'group-1',
        title: '내일 준비물',
        content: '노트북 챙겨오세요.',
        authorUserId: 'user-2',
        authorNickname: '지훈',
        authorAvatarUrl: '',
        likeCount: 1,
        commentCount: 2,
        likedByMe: false,
        mine: false,
        createdAt: '2026-06-13T00:00:00Z',
        updatedAt: '2026-06-13T00:00:00Z',
      },
      isLoading: false,
    });
    mocks.useGroupPostComments.mockReturnValue({
      data: [{
        id: 'comment-1',
        postId: 'post-1',
        content: '확인했습니다.',
        authorUserId: 'user-1',
        authorNickname: '민지',
        mine: true,
        createdAt: '2026-06-13T00:10:00Z',
        updatedAt: '2026-06-13T00:10:00Z',
      }],
      isLoading: false,
      fetchNextPage: vi.fn(),
      hasNextPage: true,
      isFetchingNextPage: false,
    });
    mocks.useToggleGroupPostLike.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false });
    mocks.useUpdateGroupPost.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false });
    mocks.useDeleteGroupPost.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false });
    mocks.useCreateGroupPostComment.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false });
    mocks.useUpdateGroupPostComment.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false });
    mocks.useDeleteGroupPostComment.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false });
  });

  it('shows the shared detail view with cursor comments and comment creation', async () => {
    const fetchNextPage = vi.fn();
    const createComment = vi.fn().mockResolvedValue({});
    mocks.useGroupPostComments.mockReturnValue({
      data: [{
        id: 'comment-1',
        postId: 'post-1',
        content: '확인했습니다.',
        authorUserId: 'user-1',
        authorNickname: '민지',
        mine: true,
        createdAt: '2026-06-13T00:10:00Z',
        updatedAt: '2026-06-13T00:10:00Z',
      }],
      isLoading: false,
      fetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: false,
    });
    mocks.useCreateGroupPostComment.mockReturnValue({ mutateAsync: createComment, isPending: false });

    renderPage();

    expect(await screen.findByText('내일 준비물')).toBeInTheDocument();
    expect(screen.getByText('확인했습니다.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '댓글 더보기' }));
    expect(fetchNextPage).toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText('댓글을 입력해주세요'), { target: { value: '저도 확인했어요.' } });
    fireEvent.click(screen.getByRole('button', { name: '댓글 등록' }));

    await waitFor(() => expect(createComment).toHaveBeenCalledWith('저도 확인했어요.'));
  });
});
