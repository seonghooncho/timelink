import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { scheduleApi, ScheduleCreateRequest, ScheduleResponse, ScheduleUpdateRequest } from '../services/api';
import { Schedule } from '../types';
import { useAuth } from '../context/AuthContext';

function mapSchedule(response: ScheduleResponse): Schedule {
  return {
    id: response.id,
    title: response.title,
    content: response.content || '',
    category: response.category as Schedule['category'],
    isImportant: response.isImportant,
    startTime: response.startTime,
    endTime: response.endTime,
    duration: response.duration || 1,
    isCompleted: response.isCompleted,
    hasAlarm: response.hasAlarm,
    groupId: response.groupId,
    imageUrl: response.imageUrl,
    imageId: response.imageId,
    imageStatus: response.imageStatus,
  };
}

export function useSchedules(params?: { startDate?: string; endDate?: string }) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['schedules', params],
    queryFn: async () => {
      const data = await scheduleApi.getAll(params);
      return data.map(mapSchedule);
    },
    enabled: isAuthenticated,
  });
}

export function useCreateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ScheduleCreateRequest) => scheduleApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

export function useUpdateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ScheduleUpdateRequest }) => scheduleApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

export function useDeleteSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => scheduleApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}
