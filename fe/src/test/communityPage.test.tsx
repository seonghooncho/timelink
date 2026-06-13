import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CommunityPage from '@/pages/CommunityPage';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  useCommunityPosts: vi.fn(),
  useCreateCommunityPost: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

vi.mock('@/hooks/useCommunity', () => ({
  useCommunityPosts: mocks.useCommunityPosts,
  useCreateCommunityPost: mocks.useCreateCommunityPost,
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
    mocks.useCommunityPosts.mockReset();
    mocks.useCreateCommunityPost.mockReset();
    mocks.useCommunityPosts.mockReturnValue({
      data: [],
      isLoading: false,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
    mocks.useCreateCommunityPost.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  it('shows community post empty state', () => {
    renderPage();

    expect(screen.getAllByText('커뮤니티').length).toBeGreaterThan(0);
    expect(screen.getByText('아직 게시물이 없습니다')).toBeInTheDocument();
  });

  it('opens post creation modal', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /글쓰기/ }));

    expect(screen.getByText('게시물 작성')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('제목을 입력해주세요')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('나누고 싶은 이야기를 적어주세요.')).toBeInTheDocument();
  });

  it('renders post list item counts', () => {
    mocks.useCommunityPosts.mockReturnValue({
      data: [{
        id: 'post-1',
        title: '약속 잡는 팁',
        content: '시간 후보를 너무 많이 열지 않는 것이 좋아요.',
        authorNickname: '민지',
        authorUserId: 'user-1',
        likeCount: 3,
        commentCount: 2,
        likedByMe: true,
        mine: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }],
      isLoading: false,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    renderPage();

    expect(screen.getByText('약속 잡는 팁')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
