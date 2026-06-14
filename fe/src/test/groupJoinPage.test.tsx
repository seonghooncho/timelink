import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GroupJoinPage from '@/pages/GroupJoinPage';
import { groupApi } from '@/services/api';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

vi.mock('@/services/api', async () => {
  const actual = await vi.importActual<typeof import('@/services/api')>('@/services/api');
  return {
    ...actual,
    groupApi: {
      ...actual.groupApi,
      join: vi.fn(),
    },
  };
});

vi.mock('@/lib/appToast', () => ({
  appToast: {
    success: mocks.success,
    error: mocks.error,
  },
}));

describe('GroupJoinPage', () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.success.mockReset();
    mocks.error.mockReset();
    vi.mocked(groupApi.join).mockReset();
  });

  it('navigates to the shared coordination after joining through an invite link', async () => {
    vi.mocked(groupApi.join).mockResolvedValue({
      id: 'group-1',
      name: '스터디',
      description: '',
      inviteCode: 'ABC123',
      createdBy: 'user-1',
      members: [],
      createdAt: '2026-06-14T00:00:00Z',
    });

    render(
      <MemoryRouter initialEntries={['/groups/join/ABC123?coord=coord-1']}>
        <Routes>
          <Route path="/groups/join/:inviteCode" element={<GroupJoinPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('모임에 참여하는 중입니다')).toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/groups/group-1/coordination/coord-1/timetable', { replace: true });
    });
  });
});
