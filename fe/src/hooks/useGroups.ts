import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groupApi } from '@/services/api';
import { Group } from '@/types/types';
import { useAuth } from '@/context/AuthContext';

export function useGroups() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const data = await groupApi.getAll();
      return data.map(g => ({
        id: g.id,
        name: g.name,
        description: g.description || '',
        image: g.imageUrl,
        members: [],
        schedules: [],
      } as Group));
    },
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
