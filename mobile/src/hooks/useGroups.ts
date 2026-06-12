import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { groupApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function useGroups() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['groups'],
    queryFn: groupApi.getAll,
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
    mutationFn: (data: { name: string; description?: string; imageUrl?: string; imageId?: string }) => groupApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}
