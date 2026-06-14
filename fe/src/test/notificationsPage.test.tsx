import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NotificationsPage from '@/pages/NotificationsPage';
import { notificationApi } from '@/services/api';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
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
    notificationApi: {
      getPage: vi.fn(),
      markRead: vi.fn(),
      markAllRead: vi.fn(),
      delete: vi.fn(),
    },
  };
});

describe('NotificationsPage', () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    vi.mocked(notificationApi.getPage).mockReset();
    vi.mocked(notificationApi.markRead).mockReset();
    vi.mocked(notificationApi.markRead).mockResolvedValue(undefined);
  });

  it('navigates to a resolved notification target after marking read', async () => {
    vi.mocked(notificationApi.getPage).mockResolvedValue({
      data: [{
        id: 'notification-1',
        type: 'group',
        title: '가입 요청',
        content: '새 가입 요청이 있습니다.',
        targetType: 'GROUP_JOIN_REQUEST',
        targetId: 'group-1',
        isRead: false,
        createdAt: new Date().toISOString(),
      }],
      meta: { perPage: 20, nextCursor: null },
    });

    render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /가입 요청/ }));

    await waitFor(() => {
      expect(notificationApi.markRead).toHaveBeenCalledWith('notification-1');
      expect(mocks.navigate).toHaveBeenCalledWith('/groups/group-1?panel=joinRequests');
    });
  });

  it('falls back to notifications for unsafe target URLs', async () => {
    vi.mocked(notificationApi.getPage).mockResolvedValue({
      data: [{
        id: 'notification-2',
        type: 'group',
        title: '이상한 링크',
        content: '외부 링크는 열지 않습니다.',
        targetUrl: 'https://evil.test',
        isRead: true,
        createdAt: new Date().toISOString(),
      }],
      meta: { perPage: 20, nextCursor: null },
    });

    render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /이상한 링크/ }));

    expect(mocks.navigate).toHaveBeenCalledWith('/notifications');
  });
});
