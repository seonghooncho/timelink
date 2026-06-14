import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GroupIntroPage from '@/pages/GroupIntroPage';

const mocks = vi.hoisted(() => ({
  getIntro: vi.fn(),
  requestToJoin: vi.fn(),
  updateIntro: vi.fn(),
  update: vi.fn(),
  createNotice: vi.fn(),
  getIntroPosts: vi.fn(),
  getMemberProfile: vi.fn(),
}));

vi.mock('@/services/api', async () => {
  const actual = await vi.importActual<typeof import('@/services/api')>('@/services/api');
  return {
    ...actual,
    groupApi: {
      ...actual.groupApi,
      getIntro: mocks.getIntro,
      requestToJoin: mocks.requestToJoin,
      updateIntro: mocks.updateIntro,
      update: mocks.update,
      createNotice: mocks.createNotice,
      getIntroPosts: mocks.getIntroPosts,
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
      <MemoryRouter initialEntries={['/groups/group-1/intro']}>
        <Routes>
          <Route path="/groups/:id/intro" element={<GroupIntroPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('GroupIntroPage', () => {
  beforeEach(() => {
    mocks.getIntro.mockReset();
    mocks.requestToJoin.mockReset();
    mocks.updateIntro.mockReset();
    mocks.update.mockReset();
    mocks.createNotice.mockReset();
    mocks.getIntroPosts.mockReset();
    mocks.getMemberProfile.mockReset();
    mocks.update.mockResolvedValue({});
    mocks.getMemberProfile.mockResolvedValue({
      id: 'member-1',
      userId: 'user-2',
      role: 'member',
      nickname: '러닝민지',
      avatarUrl: '',
      joinedAt: '2026-06-01T00:00:00Z',
      recentActivities: [],
    });

    mocks.getIntro.mockResolvedValue({
      id: 'group-1',
      name: '주말 러닝',
      description: '한강 러닝',
      imageUrl: '',
      imageStatus: undefined,
      visibility: 'PUBLIC',
      memberCount: 12,
      myRole: null,
      joinRequestStatus: null,
      introText: '천천히 함께 달립니다.',
      images: [],
      notices: [],
      postPreviews: [{
        id: 'post-1',
        title: '지난주 후기',
        contentSnippet: '처음 온 분들도 편하게 달렸어요.',
        authorNickname: '민지',
        createdAt: '2026-06-13T00:00:00Z',
      }],
      memberPreviews: [
        { id: 'member-1', userId: 'user-2', role: 'member', nickname: '러닝민지', avatarUrl: '', joinedAt: '2026-06-01T00:00:00Z' },
      ],
      member: false,
      canEditIntro: false,
      canWriteNotice: false,
    });
    mocks.getIntroPosts.mockResolvedValue({
      data: [{
        id: 'post-1',
        title: '지난주 후기',
        content: '처음 온 분들도 편하게 달렸어요.',
        contentSnippet: '처음 온 분들도 편하게 달렸어요.',
        authorUserId: 'user-2',
        authorNickname: '민지',
        authorAvatarUrl: '',
        likeCount: 2,
        commentCount: 1,
        likedByMe: false,
        mine: false,
        memberOnly: false,
        locked: false,
        createdAt: '2026-06-13T00:00:00Z',
        updatedAt: '2026-06-13T00:00:00Z',
      }],
      meta: { perPage: 3, nextCursor: null },
    });
  });

  it('shows public preview and nudges non-members to request joining', async () => {
    renderPage();

    expect(await screen.findByText('주말 러닝')).toBeInTheDocument();
    expect(screen.getByText('공개 모임')).toBeInTheDocument();
    expect(screen.getByText('천천히 함께 달립니다.')).toBeInTheDocument();
    expect(screen.getByText('함께하는 멤버')).toBeInTheDocument();
    expect(screen.getByText('러닝민지')).toBeInTheDocument();
    expect(await screen.findByText('지난주 후기')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /지난주 후기/ }));

    expect(screen.getByText('가입 후 글 전체와 댓글을 볼 수 있어요.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '가입 요청하기' }).length).toBeGreaterThan(0);
  });

  it('nudges non-members to join when opening a post author profile', async () => {
    renderPage();

    await screen.findByText('지난주 후기');
    fireEvent.click(await screen.findByRole('button', { name: '민지 프로필 보기' }));

    expect(screen.getByText('가입 후 글 전체와 댓글을 볼 수 있어요.')).toBeInTheDocument();
    expect(mocks.getMemberProfile).not.toHaveBeenCalled();
  });

  it('shows member-only intro posts as locked for non-members', async () => {
    mocks.getIntroPosts.mockResolvedValue({
      data: [{
        id: 'post-private',
        title: undefined,
        content: undefined,
        contentSnippet: undefined,
        authorUserId: 'user-2',
        authorNickname: '민지',
        authorAvatarUrl: '',
        likeCount: 0,
        commentCount: 0,
        likedByMe: false,
        mine: false,
        memberOnly: true,
        locked: true,
        createdAt: '2026-06-13T00:00:00Z',
        updatedAt: '2026-06-13T00:00:00Z',
      }],
      meta: { perPage: 3, nextCursor: null },
    });

    renderPage();

    expect(await screen.findByText('모임에만 공개된 게시물이에요.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /모임에만 공개된 게시물이에요/ }));

    expect(screen.getByText('가입 후 글 전체와 댓글을 볼 수 있어요.')).toBeInTheDocument();
  });

  it('opens group info editing from intro page and uses the meetup description when introText is empty', async () => {
    mocks.getIntro.mockResolvedValue({
      id: 'group-1',
      name: '주말 러닝',
      description: '한강 러닝',
      imageUrl: '',
      imageStatus: undefined,
      visibility: 'PUBLIC',
      memberCount: 12,
      myRole: 'manager',
      joinRequestStatus: null,
      introText: '',
      images: [],
      notices: [],
      postPreviews: [],
      memberPreviews: [],
      member: true,
      canEditIntro: true,
      canWriteNotice: true,
    });

    renderPage();

    expect(await screen.findByText('주말 러닝')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: '정보수정' }));

    expect(screen.getByDisplayValue('주말 러닝')).toBeInTheDocument();
    expect(screen.getByDisplayValue('한강 러닝')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '공개' })).toBeInTheDocument();
  });

  it('opens the meetup member profile for members from intro posts', async () => {
    mocks.getIntro.mockResolvedValue({
      id: 'group-1',
      name: '주말 러닝',
      description: '한강 러닝',
      imageUrl: '',
      imageStatus: undefined,
      visibility: 'PUBLIC',
      memberCount: 12,
      myRole: 'member',
      joinRequestStatus: null,
      introText: '천천히 함께 달립니다.',
      images: [],
      notices: [],
      postPreviews: [],
      memberPreviews: [
        { id: 'member-1', userId: 'user-2', role: 'member', nickname: '러닝민지', avatarUrl: '', joinedAt: '2026-06-01T00:00:00Z' },
      ],
      member: true,
      canEditIntro: false,
      canWriteNotice: false,
    });

    renderPage();

    await screen.findByText('지난주 후기');
    fireEvent.click(await screen.findByRole('button', { name: '민지 프로필 보기' }));

    expect(await screen.findByText('멤버 프로필')).toBeInTheDocument();
    expect(mocks.getMemberProfile).toHaveBeenCalledWith('group-1', 'user-2');
  });
});
