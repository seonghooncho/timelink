import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

export function useProfile() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['profile'],
    queryFn: profileApi.getMe,
    enabled: isAuthenticated,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { nickname?: string; avatarUrl?: string }) => profileApi.updateMe(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['profile'] }); },
  });
}
