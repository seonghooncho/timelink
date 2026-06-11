import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groupApi, type GroupListResponse } from '@/services/api';
import { Group } from '@/types/types';
import { useAuth } from '@/context/AuthContext';

export const GROUP_PAGE_LIMIT = 20;

function mapGroup(g: GroupListResponse): Group {
  return {
    id: g.id,
    name: g.name,
    description: g.description || '',
    image: g.imageUrl,
    inviteCode: g.inviteCode,
    memberCount: g.memberCount,
    myRole: g.myRole,
    schedules: [],
  };
}

export function useGroups() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['groups', 'all'],
    queryFn: async () => {
      const data = await groupApi.getAll();
      return data.map(mapGroup);
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
      const page = await groupApi.getPage({
        limit: GROUP_PAGE_LIMIT,
        cursor: pageParam,
      });
      return {
        ...page,
        data: page.data.map(mapGroup),
      };
    },
    getNextPageParam: (lastPage) => lastPage.meta?.nextCursor ?? undefined,
    select: (data) => data.pages.flatMap(page => page.data),
    enabled: isAuthenticated,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; imageUrl?: string }) => groupApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['groups'] }); },
  });
}
