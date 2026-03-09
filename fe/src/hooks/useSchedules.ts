import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scheduleApi, ScheduleCreateRequest, ScheduleUpdateRequest, ScheduleResponse } from '@/services/api';
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
  };
}

export function useSchedules(params?: { startDate?: string; endDate?: string }) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['schedules', params],
    queryFn: async () => {
      const data = await scheduleApi.getAll(params);
      return data.map(mapResponse);
    },
    enabled: isAuthenticated,
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
