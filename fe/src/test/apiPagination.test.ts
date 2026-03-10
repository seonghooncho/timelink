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

  it('scheduleApi.getAll merges paged schedule responses', async () => {
    fetchMock
      .mockResolvedValueOnce(
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
              duration: 60,
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
      )
      .mockResolvedValueOnce(
        mockJsonResponse({
          data: [
            {
              id: 'schedule-2',
              title: '둘째 일정',
              content: '',
              category: 'group',
              isImportant: true,
              startTime: '2026-03-10T09:00:00',
              endTime: '2026-03-10T10:00:00',
              duration: 60,
              isCompleted: false,
              hasAlarm: true,
              createdAt: '2026-03-09T00:00:00',
              updatedAt: '2026-03-09T00:00:00',
            },
          ],
          meta: {
            perPage: 20,
            nextCursor: null,
          },
        }),
      );

    const result = await scheduleApi.getAll();

    expect(result.map(item => item.id)).toEqual(['schedule-1', 'schedule-2']);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/planner/v1/schedules',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/planner/v1/schedules?cursor=cursor-1',
      expect.objectContaining({
        method: 'GET',
      }),
    );
  });

  it('notificationApi.getAll keeps fetching when filtered page is empty', async () => {
    fetchMock
      .mockResolvedValueOnce(
        mockJsonResponse({
          data: [],
          meta: {
            perPage: 20,
            nextCursor: 'cursor-2',
          },
        }),
      )
      .mockResolvedValueOnce(
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
            nextCursor: null,
          },
        }),
      );

    const result = await notificationApi.getAll({ type: 'schedule' });

    expect(result).toHaveLength(1);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/planner/v1/notifications?type=schedule',
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/planner/v1/notifications?type=schedule&cursor=cursor-2',
      expect.any(Object),
    );
  });

  it('coordinationApi.getAll preserves existing query params while appending cursor', async () => {
    fetchMock
      .mockResolvedValueOnce(
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
      )
      .mockResolvedValueOnce(
        mockJsonResponse({
          data: [
            {
              id: 'coord-2',
              title: '조율 2',
              mode: 'one-time',
              dates: ['2026-03-11'],
              startHour: 9,
              endHour: 18,
              status: 'active',
              responseCount: 2,
              createdBy: 'user-1',
              createdAt: '2026-03-09T00:00:00',
            },
          ],
          meta: {
            perPage: 20,
            nextCursor: null,
          },
        }),
      );

    const result = await coordinationApi.getAll('group-1', 'active');

    expect(result.map(item => item.id)).toEqual(['coord-1', 'coord-2']);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/planner/v1/groups/group-1/coordinations?status=active',
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/planner/v1/groups/group-1/coordinations?status=active&cursor=cursor-3',
      expect.any(Object),
    );
  });
});
