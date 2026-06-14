import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { communityApi, groupPostApi, type PaginationParams } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const POST_PAGE_LIMIT = 20;
export const COMMENT_PAGE_LIMIT = 20;

export function useCommunityPosts() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['community', 'posts'],
    queryFn: async () => {
      const page = await communityApi.getPosts({ limit: POST_PAGE_LIMIT });
      return page.data;
    },
    enabled: isAuthenticated,
  });
}

export function useCommunityPost(postId?: string) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['community', 'posts', postId],
    queryFn: () => communityApi.getPost(postId as string),
    enabled: isAuthenticated && Boolean(postId),
  });
}

export function useGroupPosts(groupId?: string, params?: PaginationParams) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['groups', groupId, 'posts', params?.cursor ?? null, params?.limit ?? POST_PAGE_LIMIT],
    queryFn: async () => {
      const page = await groupPostApi.getPosts(groupId as string, { limit: POST_PAGE_LIMIT, ...params });
      return page.data;
    },
    enabled: isAuthenticated && Boolean(groupId),
  });
}

export function useCommunityComments(postId?: string) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['community', 'posts', postId, 'comments'],
    queryFn: async () => {
      const page = await communityApi.getComments(postId as string, { limit: COMMENT_PAGE_LIMIT });
      return page.data;
    },
    enabled: isAuthenticated && Boolean(postId),
  });
}

export function useGroupPostComments(groupId?: string, postId?: string) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['groups', groupId, 'posts', postId, 'comments'],
    queryFn: async () => {
      const page = await groupPostApi.getComments(groupId as string, postId as string, { limit: COMMENT_PAGE_LIMIT });
      return page.data;
    },
    enabled: isAuthenticated && Boolean(groupId) && Boolean(postId),
  });
}

export function useCreateCommunityPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; content: string; anonymous?: boolean }) => communityApi.createPost(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community', 'posts'] }),
  });
}

export function useCreateGroupPost(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; content: string; memberOnly?: boolean }) => groupPostApi.createPost(groupId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups', groupId, 'posts'] }),
  });
}

export function useUpdateCommunityPost(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title?: string; content?: string; imageId?: string }) => communityApi.updatePost(postId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community', 'posts'] });
      qc.invalidateQueries({ queryKey: ['community', 'posts', postId] });
    },
  });
}

export function useUpdateGroupPost(groupId: string, postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title?: string; content?: string; imageId?: string }) => groupPostApi.updatePost(groupId, postId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups', groupId, 'posts'] });
      qc.invalidateQueries({ queryKey: ['groups', groupId, 'posts', postId] });
    },
  });
}

export function useToggleCommunityLike(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (liked: boolean) => liked ? communityApi.unlikePost(postId) : communityApi.likePost(postId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community', 'posts'] });
      qc.invalidateQueries({ queryKey: ['community', 'posts', postId] });
    },
  });
}

export function useToggleGroupPostLike(groupId: string, postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (liked: boolean) => liked ? groupPostApi.unlikePost(groupId, postId) : groupPostApi.likePost(groupId, postId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups', groupId, 'posts'] });
      qc.invalidateQueries({ queryKey: ['groups', groupId, 'posts', postId] });
    },
  });
}

export function useCreateCommunityComment(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => communityApi.createComment(postId, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community', 'posts'] });
      qc.invalidateQueries({ queryKey: ['community', 'posts', postId] });
      qc.invalidateQueries({ queryKey: ['community', 'posts', postId, 'comments'] });
    },
  });
}

export function useCreateGroupPostComment(groupId: string, postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => groupPostApi.createComment(groupId, postId, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups', groupId, 'posts'] });
      qc.invalidateQueries({ queryKey: ['groups', groupId, 'posts', postId, 'comments'] });
    },
  });
}
