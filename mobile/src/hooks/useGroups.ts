import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { groupApi, GroupListResponse, ScheduleResponse } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Group, Schedule } from '../types';

const GROUP_PAGE_LIMIT = 20;

function mapGroup(g: GroupListResponse): Group {
  return {
    ...g,
    description: g.description || '',
    imageUrl: g.imageUrl,
    thumbnailUrl: g.thumbnailUrl,
    visibility: g.visibility ?? 'PRIVATE',
    upcomingScheduleCount: g.upcomingScheduleCount ?? (g.nextSchedule ? 1 : 0),
    activeCoordination: g.activeCoordination ? {
      ...g.activeCoordination,
      createdBy: '',
    } : null,
  };
}

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
    groupScheduleId: response.groupScheduleId,
    groupScheduleCreatedBy: response.groupScheduleCreatedBy,
    groupScheduleOwner: response.groupScheduleOwner,
    groupScheduleParticipant: response.groupScheduleParticipant,
    imageUrl: response.imageUrl,
    imageId: response.imageId,
    imageStatus: response.imageStatus,
    participants: response.participants?.map((participant) => ({
      userId: participant.userId,
      nickname: participant.nickname,
      avatarUrl: participant.avatarUrl,
      thumbnailUrl: participant.thumbnailUrl,
      imageId: participant.imageId,
      imageStatus: participant.imageStatus,
    })),
  };
}

export function useGroups() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const page = await groupApi.getPage({ limit: GROUP_PAGE_LIMIT });
      return page.data.map(mapGroup);
    },
    enabled: isAuthenticated,
  });
}

export function useGroupPages() {
  const { isAuthenticated } = useAuth();

  return useInfiniteQuery({
    queryKey: ['groups', 'paged', GROUP_PAGE_LIMIT],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const page = await groupApi.getPage({ limit: GROUP_PAGE_LIMIT, cursor: pageParam });
      return {
        ...page,
        data: page.data.map(mapGroup),
      };
    },
    getNextPageParam: (lastPage) => lastPage.meta?.nextCursor ?? undefined,
    select: (data) => data.pages.flatMap((page) => page.data),
    enabled: isAuthenticated,
  });
}

export function usePublicGroups(query?: string) {
  const { isAuthenticated } = useAuth();
  const trimmedQuery = query?.trim() || undefined;

  return useQuery({
    queryKey: ['groups', 'public', trimmedQuery ?? ''],
    queryFn: async () => {
      const page = await groupApi.getPublicPage({ limit: GROUP_PAGE_LIMIT, q: trimmedQuery });
      return page.data.map(mapGroup);
    },
    enabled: isAuthenticated,
  });
}

export function useGroupDetail(id?: string) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['groups', id],
    queryFn: () => groupApi.getById(id as string),
    enabled: isAuthenticated && Boolean(id),
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; imageUrl?: string; imageId?: string; visibility?: 'PRIVATE' | 'PUBLIC' }) => groupApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useGroupSchedules(groupId?: string, showPast = false) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['groups', groupId, 'schedules', showPast],
    queryFn: async () => {
      const page = await groupApi.getSchedules(groupId as string, { limit: 100 });
      const now = Date.now();
      return page.data
        .map(mapSchedule)
        .filter((schedule) => showPast || new Date(schedule.startTime).getTime() >= now)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    },
    enabled: isAuthenticated && Boolean(groupId),
  });
}

export function useUpdateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string; imageUrl?: string; imageId?: string; visibility?: 'PRIVATE' | 'PUBLIC' } }) =>
      groupApi.update(id, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      qc.invalidateQueries({ queryKey: ['groups', variables.id] });
      qc.invalidateQueries({ queryKey: ['groups', variables.id, 'intro'] });
    },
  });
}
