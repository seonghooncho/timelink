import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scheduleApi, ScheduleCreateRequest, ScheduleListRequest, ScheduleUpdateRequest, ScheduleResponse } from '@/services/api';
import { Schedule } from '@/types/types';
import { useAuth } from '@/context/AuthContext';

function mapResponse(r: ScheduleResponse): Schedule {
  return {
    id: r.id,
    title: r.title,
    content: r.content || '',
    category: r.category as Schedule['category'],
    isImportant: r.isImportant,
    startTime: r.startTime,
    endTime: r.endTime,
    duration: r.duration || 0,
    isCompleted: r.isCompleted,
    hasAlarm: r.hasAlarm,
    groupId: r.groupId,
    imageUrl: r.imageUrl,
    imageId: r.imageId,
    imageStatus: r.imageStatus,
  };
}

interface UseSchedulesOptions {
  enabled?: boolean;
}

export function useSchedules(params?: ScheduleListRequest, options?: UseSchedulesOptions) {
  const { isAuthenticated } = useAuth();

  return useInfiniteQuery({
    queryKey: ['schedules', params],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const page = await scheduleApi.getPage({
        ...params,
        cursor: pageParam,
        limit: params?.limit ?? 50,
      });
      return {
        ...page,
        data: page.data.map(mapResponse),
      };
    },
    getNextPageParam: (lastPage) => lastPage.meta?.nextCursor ?? undefined,
    select: (data) => data.pages.flatMap(page => page.data),
    enabled: isAuthenticated && (options?.enabled ?? true),
  });
}

export function useCreateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ScheduleCreateRequest) => scheduleApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['schedules'] }); },
  });
}

export function useUpdateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ScheduleUpdateRequest }) => scheduleApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['schedules'] }); },
  });
}

export function useDeleteSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => scheduleApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['schedules'] }); },
  });
}
