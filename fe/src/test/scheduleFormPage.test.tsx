import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ScheduleFormPage from '@/pages/ScheduleFormPage';

const mocks = vi.hoisted(() => ({
  createSchedule: vi.fn(),
  useCreateSchedule: vi.fn(),
  getMembers: vi.fn(),
  closeCoordination: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/hooks/useSchedules', () => ({
  useCreateSchedule: mocks.useCreateSchedule,
}));

vi.mock('@/services/api', async () => {
  const actual = await vi.importActual<typeof import('@/services/api')>('@/services/api');
  return {
    ...actual,
    aiApi: {
      ...actual.aiApi,
      extractSchedule: vi.fn(),
    },
    groupApi: {
      ...actual.groupApi,
      getMembers: mocks.getMembers,
    },
    coordinationApi: {
      ...actual.coordinationApi,
      update: mocks.closeCoordination,
    },
  };
});

vi.mock('@/lib/appToast', () => ({
  appToast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
    info: vi.fn(),
  },
  getErrorMessage: (_err: unknown, fallback: string) => fallback,
}));

function renderPage(stateOverrides: Record<string, unknown> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const state = {
    groupId: 'group-1',
    groupName: '스터디',
    coordinationId: 'coord-1',
    returnTo: '/groups/group-1',
    sourceLabel: '모두 가능한 시간',
    title: '스터디 확정',
    content: '시간 조율 결과에서 생성한 모임 일정입니다.',
    startDate: '2099-06-14',
    startTime: '18:00',
    duration: '1',
    ...stateOverrides,
  };

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[{
          pathname: '/schedule/new',
          state,
        }]}
      >
        <Routes>
          <Route path="/schedule/new" element={<ScheduleFormPage />} />
          <Route path="/groups/:id" element={<div>모임 상세</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ScheduleFormPage coordination flow', () => {
  const findLoadedMember = () => screen.findByText('민지', {}, { timeout: 5000 });

  beforeEach(() => {
    mocks.createSchedule.mockReset();
    mocks.useCreateSchedule.mockReset();
    mocks.getMembers.mockReset();
    mocks.closeCoordination.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.toastError.mockReset();

    mocks.createSchedule.mockResolvedValue({ id: 'schedule-1' });
    mocks.useCreateSchedule.mockReturnValue({
      mutateAsync: mocks.createSchedule,
      isPending: false,
    });
    mocks.getMembers.mockResolvedValue([
      { id: 'member-1', userId: 'user-1', nickname: '민지', avatarUrl: '', role: 'manager', joinedAt: '2026-06-13T00:00:00Z' },
    ]);
    mocks.closeCoordination.mockResolvedValue({ id: 'coord-1', status: 'closed' });
  });

  it('asks whether to close the coordination after creating a group schedule from coordination result', async () => {
    renderPage();

    expect(await findLoadedMember()).toBeInTheDocument();
    expect(screen.getAllByText('모임').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: '생성하기' }));

    await waitFor(() => expect(mocks.createSchedule).toHaveBeenCalledWith(expect.objectContaining({
      title: '스터디 확정',
      category: 'group',
      groupId: 'group-1',
      participantUserIds: ['user-1'],
    })));
    expect(await screen.findByText('시간 조율을 닫으시겠습니까?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '예, 닫기' }));

    await waitFor(() => expect(mocks.closeCoordination).toHaveBeenCalledWith(
      'group-1',
      'coord-1',
      { status: 'closed' },
    ));
    expect(await screen.findByText('모임 상세')).toBeInTheDocument();
  });

  it('toggles all participants off before submitting a meetup schedule', async () => {
    renderPage();

    expect(await findLoadedMember()).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '전체해제' }));
    expect(screen.getByText('0명 선택')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '생성하기' }));

    await waitFor(() => expect(mocks.createSchedule).toHaveBeenCalledWith(expect.objectContaining({
      category: 'group',
      groupId: 'group-1',
      participantUserIds: [],
    })));
  });

  it('hides the meetup category in regular schedule creation', async () => {
    renderPage({
      groupId: undefined,
      groupName: undefined,
      coordinationId: undefined,
      returnTo: undefined,
      sourceLabel: undefined,
    });

    expect(screen.getByRole('button', { name: '할일' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '약속' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '반복' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '모임' })).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: '생성하기' }));

    await waitFor(() => expect(mocks.createSchedule).toHaveBeenCalledWith(expect.objectContaining({
      category: 'task',
      groupId: undefined,
      participantUserIds: undefined,
    })));
  });

  it('confirms before creating a past schedule', async () => {
    renderPage({ startDate: '2020-06-14', coordinationId: undefined });

    expect(await findLoadedMember()).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '생성하기' }));

    expect(await screen.findByText('이미 지난 일정입니다')).toBeInTheDocument();
    expect(mocks.createSchedule).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '그래도 만들기' }));

    await waitFor(() => expect(mocks.createSchedule).toHaveBeenCalledWith(expect.objectContaining({
      startTime: '2020-06-14T18:00:00',
    })));
  });
});
