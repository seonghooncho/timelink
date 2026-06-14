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
  useUpdateSchedule: vi.fn(),
  useDeleteSchedule: vi.fn(),
  useLeaveGroupSchedule: vi.fn(),
  fetchScheduleDetail: vi.fn(),
  useGroupPosts: vi.fn(),
  useCreateGroupPost: vi.fn(),
  useGroupPostComments: vi.fn(),
  useCreateGroupPostComment: vi.fn(),
  useToggleGroupPostLike: vi.fn(),
  getMembers: vi.fn(),
  getMemberProfile: vi.fn(),
  updateMyMemberProfile: vi.fn(),
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
  useUpdateSchedule: mocks.useUpdateSchedule,
  useDeleteSchedule: mocks.useDeleteSchedule,
  useLeaveGroupSchedule: mocks.useLeaveGroupSchedule,
  fetchScheduleDetail: mocks.fetchScheduleDetail,
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
      getMemberProfile: mocks.getMemberProfile,
      updateMyMemberProfile: mocks.updateMyMemberProfile,
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

function makeGroupSchedule(overrides: Record<string, unknown>) {
  return {
    id: 'schedule-1',
    title: '모임 일정',
    content: '',
    category: 'group',
    isImportant: false,
    startTime: new Date(Date.now() + 86_400_000).toISOString(),
    duration: 1,
    isCompleted: false,
    hasAlarm: false,
    groupId: 'group-1',
    ...overrides,
  };
}

describe('GroupDetailPage group posts', () => {
  beforeEach(() => {
    mocks.setSelectedSchedule.mockReset();
    mocks.setShowScheduleDetail.mockReset();
    mocks.useGroups.mockReset();
    mocks.useSchedules.mockReset();
    mocks.useUpdateSchedule.mockReset();
    mocks.useDeleteSchedule.mockReset();
    mocks.useLeaveGroupSchedule.mockReset();
    mocks.fetchScheduleDetail.mockReset();
    mocks.useGroupPosts.mockReset();
    mocks.useCreateGroupPost.mockReset();
    mocks.useGroupPostComments.mockReset();
    mocks.useCreateGroupPostComment.mockReset();
    mocks.useToggleGroupPostLike.mockReset();
    mocks.getMembers.mockReset();
    mocks.getMemberProfile.mockReset();
    mocks.updateMyMemberProfile.mockReset();
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
    mocks.useUpdateSchedule.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mocks.useDeleteSchedule.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mocks.useLeaveGroupSchedule.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mocks.fetchScheduleDetail.mockImplementation(async (scheduleId: string) => makeGroupSchedule({
      id: scheduleId,
      groupScheduleId: 'group-schedule-1',
      participants: [],
    }));
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
    mocks.getMemberProfile.mockResolvedValue({
      id: 'member-1',
      userId: 'user-1',
      nickname: '민지',
      avatarUrl: '',
      role: 'manager',
      joinedAt: '2026-06-13T00:00:00Z',
      mine: true,
      recentActivities: [],
    });
    mocks.updateMyMemberProfile.mockResolvedValue({
      id: 'member-1',
      userId: 'user-1',
      nickname: '모임민지',
      avatarUrl: '',
      role: 'manager',
      joinedAt: '2026-06-13T00:00:00Z',
      mine: true,
      recentActivities: [],
    });
    mocks.getCoordinationPage.mockResolvedValue({ data: [], meta: { perPage: 10, nextCursor: null } });
  });

  it('shows compact empty schedule and coordination sections', async () => {
    renderPage();

    expect(await screen.findByText('모임 글')).toBeInTheDocument();
    expect(screen.getByText('스터디')).toBeInTheDocument();
    expect(screen.queryByText('주간 스터디')).not.toBeInTheDocument();
    expect(screen.queryByText('나의 모임')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '약속(0개)' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '시간 조율(0개)' })).toBeInTheDocument();
  });

  it('shows upcoming schedules and active coordinations as horizontal sections', async () => {
    const futureStart = new Date(Date.now() + 86_400_000).toISOString();
    mocks.useSchedules.mockReturnValue({
      data: [makeGroupSchedule({
        title: '정기 스터디',
        startTime: futureStart,
      })],
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
    mocks.getCoordinationPage.mockResolvedValue({
      data: [{
        id: 'coord-1',
        title: '회식 시간 조율',
        description: '상세 설명은 카드에서 숨깁니다',
        mode: 'one_time',
        dates: ['2026-06-14'],
        startHour: 18,
        endHour: 22,
        status: 'active',
        responseCount: 2,
        createdBy: 'user-1',
        createdAt: '2026-06-13T00:00:00Z',
      }],
      meta: { perPage: 10, nextCursor: null },
    });

    renderPage();

    expect(await screen.findByRole('heading', { name: /약속\(1개\)/ })).toBeInTheDocument();
    expect(screen.getByText('정기 스터디')).toBeInTheDocument();
    expect(await screen.findByText('회식 시간 조율')).toBeInTheDocument();
    expect(screen.queryByText('상세 설명은 카드에서 숨깁니다')).not.toBeInTheDocument();
  });

  it('hides past group schedules by default and reveals them with the past toggle', async () => {
    const pastStart = new Date(Date.now() - 86_400_000).toISOString();
    const futureStart = new Date(Date.now() + 86_400_000).toISOString();
    mocks.useSchedules.mockReturnValue({
      data: [
        makeGroupSchedule({ id: 'schedule-past', title: '지난 약속', startTime: pastStart }),
        makeGroupSchedule({ id: 'schedule-future', title: '예정 약속', startTime: futureStart }),
      ],
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    renderPage();

    expect(await screen.findByRole('heading', { name: '약속(1개)' })).toBeInTheDocument();
    expect(screen.getByText('예정 약속')).toBeInTheDocument();
    expect(screen.queryByText('지난 약속')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '지난 약속 보기' }));

    expect(screen.getByRole('heading', { name: '약속(2개)' })).toBeInTheDocument();
    expect(screen.getByText('지난 약속')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '지난 약속 숨기기' })).toBeInTheDocument();
  });

  it('opens the role based member panel from the header member count', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /멤버 관리 열기, 1명/ }));

    expect(screen.getByText('멤버 관리')).toBeInTheDocument();
  });

  it('shows the meetup intro action in the header menu', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: '모임 메뉴 열기' }));

    expect(screen.getByRole('button', { name: '모임 소개' })).toBeInTheDocument();
  });

  it('opens my meetup profile editor from the header menu', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: '모임 메뉴 열기' }));
    fireEvent.click(screen.getByRole('button', { name: '모임 프로필 수정' }));

    expect(await screen.findByText('모임 프로필 수정')).toBeInTheDocument();
    expect(screen.getByDisplayValue('민지')).toBeInTheDocument();
    expect(mocks.getMemberProfile).toHaveBeenCalledWith('group-1', 'user-1');
  });

  it('loads closed coordinations only after the closed coordination toggle is selected', async () => {
    mocks.getCoordinationPage.mockImplementation((_groupId: string, params?: { status?: string }) => {
      if (params?.status === 'closed') {
        return Promise.resolve({
          data: [{
            id: 'coord-closed',
            title: '닫힌 조율',
            mode: 'one_time',
            dates: ['2026-06-14'],
            startHour: 18,
            endHour: 22,
            status: 'closed',
            responseCount: 4,
            createdBy: 'user-1',
            createdAt: '2026-06-13T00:00:00Z',
          }],
          meta: { perPage: 10, nextCursor: null },
        });
      }

      return Promise.resolve({
        data: [{
          id: 'coord-active',
          title: '진행 중 조율',
          mode: 'one_time',
          dates: ['2026-06-14'],
          startHour: 18,
          endHour: 22,
          status: 'active',
          responseCount: 2,
          createdBy: 'user-1',
          createdAt: '2026-06-13T00:00:00Z',
        }],
        meta: { perPage: 10, nextCursor: null },
      });
    });

    renderPage();

    expect(await screen.findByText('진행 중 조율')).toBeInTheDocument();
    expect(mocks.getCoordinationPage).toHaveBeenLastCalledWith(
      'group-1',
      expect.objectContaining({ status: 'active', limit: 10 }),
    );

    fireEvent.click(screen.getByRole('button', { name: '닫힌 조율 보기' }));

    expect(await screen.findByText('닫힌 조율')).toBeInTheDocument();
    expect(mocks.getCoordinationPage).toHaveBeenLastCalledWith(
      'group-1',
      expect.objectContaining({ status: 'closed', limit: 10 }),
    );
  });

  it('creates a group post from the group detail page', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ id: 'post-new' });
    mocks.useCreateGroupPost.mockReturnValue({ mutateAsync, isPending: false });

    renderPage();

    await screen.findByText('모임 글');
    const writeButton = screen.getByRole('button', { name: '글쓰기' });
    expect(writeButton).toHaveClass('app-floating-action-above-group-actions');
    fireEvent.click(writeButton);
    const titleInput = screen.getByPlaceholderText('제목을 입력해주세요');
    const contentInput = screen.getByPlaceholderText('멤버들에게 공유할 내용을 적어주세요.');
    expect(titleInput).toHaveAttribute('maxLength', '40');
    expect(contentInput).toHaveAttribute('maxLength', '2000');
    fireEvent.change(titleInput, { target: { value: '내일 준비물' } });
    fireEvent.change(contentInput, { target: { value: '노트북 챙겨오세요.' } });
    fireEvent.click(screen.getByRole('button', { name: '게시물 등록' }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({
      title: '내일 준비물',
      content: '노트북 챙겨오세요.',
      memberOnly: false,
    }));
  });

  it('creates a member-only group post when the visibility toggle is selected', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ id: 'post-new' });
    mocks.useCreateGroupPost.mockReturnValue({ mutateAsync, isPending: false });

    renderPage();

    await screen.findByText('모임 글');
    fireEvent.click(screen.getByRole('button', { name: '글쓰기' }));
    fireEvent.change(screen.getByPlaceholderText('제목을 입력해주세요'), { target: { value: '멤버 공지' } });
    fireEvent.change(screen.getByPlaceholderText('멤버들에게 공유할 내용을 적어주세요.'), { target: { value: '멤버에게만 공유합니다.' } });
    fireEvent.click(screen.getByRole('button', { name: /모임에만 게시하기/ }));
    fireEvent.click(screen.getByRole('button', { name: '게시물 등록' }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({
      title: '멤버 공지',
      content: '멤버에게만 공유합니다.',
      memberOnly: true,
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
