import { beforeEach, describe, expect, it, vi } from 'vitest';
import { coordinationApi, notificationApi, scheduleApi } from '@/services/api';

const { clearStoredSession } = vi.hoisted(() => ({
  clearStoredSession: vi.fn(),
}));

vi.mock('@/services/session', () => ({
  clearStoredSession,
  getAccessToken: () => 'test-token',
}));

function mockJsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

describe('API cursor pagination', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    clearStoredSession.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('scheduleApi.getPage requests only the given cursor page', async () => {
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({
        data: [
          {
            id: 'schedule-1',
            title: '첫 일정',
            content: '',
            category: 'personal',
            isImportant: false,
            startTime: '2026-03-09T09:00:00',
            endTime: '2026-03-09T10:00:00',
            duration: 1,
            isCompleted: false,
            hasAlarm: true,
            createdAt: '2026-03-09T00:00:00',
            updatedAt: '2026-03-09T00:00:00',
          },
        ],
        meta: {
          perPage: 20,
          nextCursor: 'cursor-1',
        },
      }),
    );

    const result = await scheduleApi.getPage({
      startDate: '2026-03-01T00:00:00',
      endDate: '2026-03-31T23:59:59',
      limit: 20,
      cursor: 'cursor-0',
    });

    expect(result.data.map(item => item.id)).toEqual(['schedule-1']);
    expect(result.meta?.nextCursor).toBe('cursor-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/planner/v1/schedules?startDate=2026-03-01T00%3A00%3A00&endDate=2026-03-31T23%3A59%3A59&cursor=cursor-0&limit=20',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      }),
    );
  });

  it('notificationApi.getPage preserves filters while requesting one page', async () => {
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({
        data: [
          {
            id: 'notif-1',
            type: 'schedule',
            title: '알림',
            content: '내용',
            isRead: false,
            createdAt: '2026-03-09T00:00:00',
          },
        ],
        meta: {
          perPage: 20,
          nextCursor: 'cursor-2',
        },
      }),
    );

    const result = await notificationApi.getPage({ type: 'schedule', cursor: 'cursor-1', limit: 20 });

    expect(result.data).toHaveLength(1);
    expect(result.meta?.nextCursor).toBe('cursor-2');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/planner/v1/notifications?type=schedule&cursor=cursor-1&limit=20',
      expect.any(Object),
    );
  });

  it('coordinationApi.getPage preserves existing query params while appending cursor and limit', async () => {
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({
        data: [
          {
            id: 'coord-1',
            title: '조율 1',
            mode: 'one-time',
            dates: ['2026-03-10'],
            startHour: 9,
            endHour: 18,
            status: 'active',
            responseCount: 1,
            createdBy: 'user-1',
            createdAt: '2026-03-09T00:00:00',
          },
        ],
        meta: {
          perPage: 20,
          nextCursor: 'cursor-3',
        },
      }),
    );

    const result = await coordinationApi.getPage('group-1', { status: 'active', cursor: 'cursor-2', limit: 20 });

    expect(result.data.map(item => item.id)).toEqual(['coord-1']);
    expect(result.meta?.nextCursor).toBe('cursor-3');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/planner/v1/groups/group-1/coordinations?status=active&cursor=cursor-2&limit=20',
      expect.any(Object),
    );
  });
});
