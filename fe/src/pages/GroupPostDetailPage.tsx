import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PostDetailView from '@/components/community/PostDetailView';
import GroupMemberProfileSheet from '@/components/group/GroupMemberProfileSheet';
import {
  useCreateGroupPostComment,
  useDeleteGroupPost,
  useDeleteGroupPostComment,
  useGroupPost,
  useGroupPostComments,
  useToggleGroupPostLike,
  useUpdateGroupPost,
  useUpdateGroupPostComment,
} from '@/hooks/useCommunity';
import { groupApi, GroupMemberProfileResponse } from '@/services/api';
import { appToast } from '@/lib/appToast';

const GroupPostDetailPage: React.FC = () => {
  const { id, postId } = useParams<{ id: string; postId: string }>();
  const navigate = useNavigate();
  const { data: post, isLoading } = useGroupPost(id, postId);
  const {
    data: comments = [],
    isLoading: isCommentsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGroupPostComments(id, postId);
  const toggleLike = useToggleGroupPostLike(id || '', postId || '');
  const updatePost = useUpdateGroupPost(id || '', postId || '');
  const deletePost = useDeleteGroupPost(id || '');
  const createComment = useCreateGroupPostComment(id || '', postId || '');
  const updateComment = useUpdateGroupPostComment(id || '', postId || '');
  const deleteComment = useDeleteGroupPostComment(id || '', postId || '');
  const [profileTarget, setProfileTarget] = useState<GroupMemberProfileResponse | null>(null);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  const backTo = id ? `/groups/${id}` : '/groups';

  const openMemberProfile = async (memberUserId?: string) => {
    if (!id || !memberUserId) return;
    setProfileTarget(null);
    setShowProfileSheet(true);
    setIsProfileLoading(true);
    try {
      setProfileTarget(await groupApi.getMemberProfile(id, memberUserId));
    } catch (error) {
      appToast.error('멤버 프로필을 불러오지 못했습니다', error);
      setShowProfileSheet(false);
    } finally {
      setIsProfileLoading(false);
    }
  };

  return (
    <PostDetailView
      headerTitle="모임 글"
      backTo={backTo}
      post={post}
      isLoading={isLoading}
      comments={comments}
      isCommentsLoading={isCommentsLoading}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      isLikePending={toggleLike.isPending}
      isUpdatePostPending={updatePost.isPending}
      isCreateCommentPending={createComment.isPending}
      isUpdateCommentPending={updateComment.isPending}
      onFetchNextComments={() => fetchNextPage()}
      onAuthorClick={openMemberProfile}
      onToggleLike={() => toggleLike.mutateAsync(Boolean(post?.likedByMe)).then(() => undefined)}
      onUpdatePost={(data) => updatePost.mutateAsync(data).then(() => undefined)}
      onDeletePost={async () => {
        if (!postId) return;
        await deletePost.mutateAsync(postId);
        navigate(backTo, { replace: true });
      }}
      onCreateComment={(content) => createComment.mutateAsync(content).then(() => undefined)}
      onUpdateComment={(commentId, content) => updateComment.mutateAsync({ commentId, content }).then(() => undefined)}
      onDeleteComment={(commentId) => deleteComment.mutateAsync(commentId).then(() => undefined)}
    >
      <GroupMemberProfileSheet
        open={showProfileSheet}
        groupId={id || ''}
        profile={profileTarget}
        isLoading={isProfileLoading}
        onClose={() => setShowProfileSheet(false)}
      />
    </PostDetailView>
  );
};

export default GroupPostDetailPage;
