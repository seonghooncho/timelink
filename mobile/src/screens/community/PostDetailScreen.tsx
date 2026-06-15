import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { EllipsisVertical, Heart, MessageCircle, Pencil, Send, Trash2, X } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/layout/Screen';
import { PageHeader } from '../../components/layout/PageHeader';
import { AppTextInput } from '../../components/common/AppTextInput';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { PersonAvatar } from '../../components/common/GroupAvatar';
import { colors, radius } from '../../constants/theme';
import {
  COMMENT_MAX_LENGTH,
  COMMUNITY_POST_CONTENT_MAX_LENGTH,
  COMMUNITY_POST_TITLE_MAX_LENGTH,
} from '../../constants/textLimits';
import { RootStackParamList } from '../../navigation/types';
import {
  useCommunityComments,
  useCommunityPost,
  useCreateCommunityComment,
  useCreateGroupPostComment,
  useDeleteCommunityComment,
  useDeleteCommunityPost,
  useDeleteGroupPost,
  useDeleteGroupPostComment,
  useGroupPost,
  useGroupPostComments,
  useToggleCommunityLike,
  useToggleGroupPostLike,
  useUpdateCommunityComment,
  useUpdateCommunityPost,
  useUpdateGroupPost,
  useUpdateGroupPostComment,
} from '../../hooks/useCommunity';
import { CommunityCommentResponse, communityApi, groupApi } from '../../services/api';
import { timeAgoLabel } from '../../utils/date';
import { processingImageLabel } from '../../utils/images';

type Props = NativeStackScreenProps<RootStackParamList, 'CommunityPostDetail'>;

export function PostDetailScreen({ navigation, route }: Props) {
  const { postId, groupId } = route.params;
  const isGroupPost = Boolean(groupId);
  const communityPostQuery = useCommunityPost(isGroupPost ? undefined : postId);
  const groupPostQuery = useGroupPost(groupId, isGroupPost ? postId : undefined);
  const communityComments = useCommunityComments(isGroupPost ? undefined : postId);
  const groupComments = useGroupPostComments(groupId, isGroupPost ? postId : undefined);
  const toggleCommunityLike = useToggleCommunityLike(postId);
  const toggleGroupLike = useToggleGroupPostLike(groupId || '', postId);
  const updateCommunityPost = useUpdateCommunityPost(postId);
  const updateGroupPost = useUpdateGroupPost(groupId || '', postId);
  const deleteCommunityPost = useDeleteCommunityPost();
  const deleteGroupPost = useDeleteGroupPost(groupId || '');
  const createCommunityComment = useCreateCommunityComment(postId);
  const createGroupComment = useCreateGroupPostComment(groupId || '', postId);
  const updateCommunityComment = useUpdateCommunityComment(postId);
  const updateGroupComment = useUpdateGroupPostComment(groupId || '', postId);
  const deleteCommunityComment = useDeleteCommunityComment(postId);
  const deleteGroupComment = useDeleteGroupPostComment(groupId || '', postId);
  const [comment, setComment] = useState('');
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');

  const post = isGroupPost ? groupPostQuery.data : communityPostQuery.data;
  const comments = isGroupPost ? (groupComments.data || []) : (communityComments.data || []);
  const isLoading = isGroupPost ? groupPostQuery.isLoading : communityPostQuery.isLoading;
  const isCommentPending = createCommunityComment.isPending || createGroupComment.isPending;
  const isPostSaving = updateCommunityPost.isPending || updateGroupPost.isPending;
  const isCommentSaving = updateCommunityComment.isPending || updateGroupComment.isPending;

  useEffect(() => {
    if (!post) return;
    setEditTitle(post.title);
    setEditContent(post.content);
  }, [post?.content, post?.id, post?.title]);

  const openAuthorProfile = async (userId?: string) => {
    if (!userId) return;
    try {
      if (isGroupPost && groupId) {
        const profile = await groupApi.getMemberProfile(groupId, userId);
        const activities = profile.recentActivities.length;
        Alert.alert(profile.nickname || '멤버', `${profile.role === 'manager' ? '관리자' : '멤버'} · 최근 활동 ${activities}개`);
        return;
      }
      const profile = await communityApi.getPublicProfile(userId);
      Alert.alert(profile.nickname || '사용자', `공개 모임 ${profile.publicGroups.length}개 · 최근 활동 ${profile.recentActivities.length}개`);
    } catch {
      Alert.alert('프로필 오류', '프로필을 불러오지 못했습니다.');
    }
  };

  const handleLike = async () => {
    if (!post || post.locked) return;
    try {
      if (isGroupPost && groupId) {
        await toggleGroupLike.mutateAsync(Boolean(post.likedByMe));
      } else {
        await toggleCommunityLike.mutateAsync(Boolean(post.likedByMe));
      }
    } catch {
      Alert.alert('처리 실패', '좋아요 처리에 실패했습니다.');
    }
  };

  const handlePostUpdate = async () => {
    const title = editTitle.trim();
    const content = editContent.trim();
    if (!title) {
      Alert.alert('입력 필요', '제목을 입력해주세요.');
      return;
    }
    if (!content) {
      Alert.alert('입력 필요', '본문을 입력해주세요.');
      return;
    }

    try {
      if (isGroupPost) {
        await updateGroupPost.mutateAsync({ title, content });
      } else {
        await updateCommunityPost.mutateAsync({ title, content });
      }
      setIsEditingPost(false);
    } catch {
      Alert.alert('수정 실패', '게시글을 수정하지 못했습니다.');
    }
  };

  const confirmPostDelete = () => {
    Alert.alert('게시글을 삭제할까요?', '삭제한 게시글과 댓글은 다시 복구할 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            if (isGroupPost) {
              await deleteGroupPost.mutateAsync(postId);
            } else {
              await deleteCommunityPost.mutateAsync(postId);
            }
            navigation.goBack();
          } catch {
            Alert.alert('삭제 실패', '게시글을 삭제하지 못했습니다.');
          }
        },
      },
    ]);
  };

  const openPostMenu = () => {
    Alert.alert('게시글 관리', undefined, [
      { text: '수정', onPress: () => setIsEditingPost(true) },
      { text: '삭제', style: 'destructive', onPress: confirmPostDelete },
      { text: '취소', style: 'cancel' },
    ]);
  };

  const handleCommentSubmit = async () => {
    const trimmed = comment.trim();
    if (!trimmed) {
      Alert.alert('입력 필요', '댓글을 입력해주세요.');
      return;
    }
    try {
      if (isGroupPost && groupId) {
        await createGroupComment.mutateAsync(trimmed);
      } else {
        await createCommunityComment.mutateAsync(trimmed);
      }
      setComment('');
    } catch {
      Alert.alert('댓글 실패', '댓글 작성에 실패했습니다.');
    }
  };

  const handleCommentUpdate = async () => {
    if (!editingCommentId) return;
    const trimmed = editingCommentContent.trim();
    if (!trimmed) {
      Alert.alert('입력 필요', '댓글을 입력해주세요.');
      return;
    }

    try {
      if (isGroupPost) {
        await updateGroupComment.mutateAsync({ commentId: editingCommentId, content: trimmed });
      } else {
        await updateCommunityComment.mutateAsync({ commentId: editingCommentId, content: trimmed });
      }
      setEditingCommentId(null);
      setEditingCommentContent('');
    } catch {
      Alert.alert('수정 실패', '댓글을 수정하지 못했습니다.');
    }
  };

  const confirmCommentDelete = (target: CommunityCommentResponse) => {
    Alert.alert('댓글을 삭제할까요?', '삭제한 댓글은 다시 복구할 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            if (isGroupPost) {
              await deleteGroupComment.mutateAsync(target.id);
            } else {
              await deleteCommunityComment.mutateAsync(target.id);
            }
          } catch {
            Alert.alert('삭제 실패', '댓글을 삭제하지 못했습니다.');
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <Screen>
        <PageHeader title={isGroupPost ? '모임 글' : '커뮤니티 글'} showBack />
        <LoadingState />
      </Screen>
    );
  }

  if (!post) {
    return (
      <Screen>
        <PageHeader title={isGroupPost ? '모임 글' : '커뮤니티 글'} showBack />
        <EmptyState title="게시글을 찾을 수 없습니다" />
      </Screen>
    );
  }

  const authorName = post.anonymous ? '익명' : (post.authorNickname || '사용자');
  const locked = Boolean(post.locked);
  const canOpenAuthor = Boolean(!post.anonymous && post.authorUserId);
  const imageStatusLabel = processingImageLabel(post.imageStatus);

  return (
    <Screen>
      <PageHeader
        title={isGroupPost ? '모임 글' : '커뮤니티 글'}
        showBack
        rightElement={post.mine && !locked ? (
          <Pressable onPress={openPostMenu} style={styles.headerButton}>
            <EllipsisVertical size={20} color={colors.foreground} />
          </Pressable>
        ) : undefined}
      />
      <View style={styles.content}>
        <View style={styles.postCard}>
          {isEditingPost ? (
            <View style={styles.editor}>
              <AppTextInput
                label="제목"
                value={editTitle}
                onChangeText={setEditTitle}
                maxLength={COMMUNITY_POST_TITLE_MAX_LENGTH}
                hint={`${editTitle.length}/${COMMUNITY_POST_TITLE_MAX_LENGTH}`}
              />
              <AppTextInput
                label="본문"
                value={editContent}
                onChangeText={setEditContent}
                maxLength={COMMUNITY_POST_CONTENT_MAX_LENGTH}
                multiline
                hint={`${editContent.length}/${COMMUNITY_POST_CONTENT_MAX_LENGTH}`}
              />
              <View style={styles.editorActions}>
                <Pressable onPress={() => setIsEditingPost(false)} style={styles.secondaryButton}>
                  <X size={15} color={colors.foreground} />
                  <Text style={styles.secondaryButtonText}>취소</Text>
                </Pressable>
                <Pressable onPress={handlePostUpdate} disabled={isPostSaving} style={[styles.primaryButton, isPostSaving ? styles.disabled : null]}>
                  <Text style={styles.primaryButtonText}>{isPostSaving ? '저장 중...' : '저장'}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <Pressable disabled={!canOpenAuthor} onPress={() => openAuthorProfile(post.authorUserId)} style={styles.authorRow}>
                <PersonAvatar image={post.anonymous ? undefined : post.authorAvatarUrl} name={authorName} size={36} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={styles.authorName}>{authorName}</Text>
                  <Text style={styles.time}>{timeAgoLabel(post.createdAt)}</Text>
                </View>
              </Pressable>

              <Text style={styles.title}>{locked ? '모임에만 공개된 게시물이에요' : post.title}</Text>
              <Text style={styles.body}>{locked ? '가입하면 내용을 확인하고 댓글을 남길 수 있어요.' : post.content}</Text>

              {post.imageUrl && !locked ? (
                <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
              ) : imageStatusLabel && !locked ? (
                <Text style={styles.processingText}>{imageStatusLabel}</Text>
              ) : null}

              <View style={styles.actionRow}>
                <Pressable onPress={handleLike} disabled={locked} style={[styles.actionButton, post.likedByMe ? styles.actionButtonActive : null]}>
                  <Heart size={17} color={post.likedByMe ? colors.primary : colors.mutedForeground} fill={post.likedByMe ? colors.primary : 'transparent'} />
                  <Text style={[styles.actionLabel, post.likedByMe ? styles.actionLabelActive : null]}>{post.likeCount ?? 0}</Text>
                </Pressable>
                <View style={styles.actionButton}>
                  <MessageCircle size={17} color={colors.mutedForeground} />
                  <Text style={styles.actionLabel}>댓글 {post.commentCount ?? 0}개</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {!locked ? (
          <View style={styles.commentInputRow}>
            <AppTextInput
              value={comment}
              onChangeText={setComment}
              maxLength={COMMENT_MAX_LENGTH}
              placeholder="댓글을 입력하세요"
              style={styles.commentInput}
            />
            <Pressable onPress={handleCommentSubmit} disabled={isCommentPending} style={[styles.sendButton, isCommentPending ? styles.disabled : null]}>
              <Send size={18} color={colors.primaryForeground} />
            </Pressable>
          </View>
        ) : null}

        <View style={styles.comments}>
          <Text style={styles.commentSectionTitle}>댓글</Text>
          {comments.length === 0 ? (
            <Text style={styles.emptyComment}>댓글이 없습니다</Text>
          ) : comments.map((item) => (
            <View key={item.id} style={styles.commentItem}>
              <Pressable disabled={!item.authorUserId} onPress={() => openAuthorProfile(item.authorUserId)}>
                <PersonAvatar image={item.authorAvatarUrl} name={item.authorNickname || '사용자'} size={30} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <View style={styles.commentHeader}>
                  <Pressable disabled={!item.authorUserId} onPress={() => openAuthorProfile(item.authorUserId)} style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={styles.commentAuthor}>{item.authorNickname || '사용자'}</Text>
                  </Pressable>
                  <Text style={styles.commentTime}>{timeAgoLabel(item.createdAt)}</Text>
                  {item.mine && editingCommentId !== item.id ? (
                    <View style={styles.commentActions}>
                      <Pressable
                        onPress={() => {
                          setEditingCommentId(item.id);
                          setEditingCommentContent(item.content);
                        }}
                        style={styles.commentIconButton}
                      >
                        <Pencil size={13} color={colors.mutedForeground} />
                      </Pressable>
                      <Pressable onPress={() => confirmCommentDelete(item)} style={styles.commentIconButton}>
                        <Trash2 size={13} color={colors.destructive} />
                      </Pressable>
                    </View>
                  ) : null}
                </View>
                {editingCommentId === item.id ? (
                  <View style={styles.commentEditor}>
                    <AppTextInput
                      value={editingCommentContent}
                      onChangeText={setEditingCommentContent}
                      maxLength={COMMENT_MAX_LENGTH}
                      multiline
                      hint={`${editingCommentContent.length}/${COMMENT_MAX_LENGTH}`}
                    />
                    <View style={styles.commentEditorActions}>
                      <Pressable
                        onPress={() => {
                          setEditingCommentId(null);
                          setEditingCommentContent('');
                        }}
                        style={styles.commentCancelButton}
                      >
                        <Text style={styles.commentCancelText}>취소</Text>
                      </Pressable>
                      <Pressable
                        onPress={handleCommentUpdate}
                        disabled={isCommentSaving}
                        style={[styles.commentSaveButton, isCommentSaving ? styles.disabled : null]}
                      >
                        <Text style={styles.commentSaveText}>{isCommentSaving ? '저장 중...' : '저장'}</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.commentText}>{item.content}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    padding: 8,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  postCard: {
    gap: 14,
    paddingBottom: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  editor: {
    gap: 12,
  },
  editorActions: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryForeground,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.foreground,
  },
  disabled: {
    opacity: 0.55,
  },
  authorRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  authorName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.foreground,
  },
  time: {
    marginTop: 2,
    fontSize: 11,
    color: colors.mutedForeground,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.foreground,
    lineHeight: 27,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.foreground,
  },
  postImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.lg,
  },
  processingText: {
    borderRadius: radius.md,
    backgroundColor: colors.muted,
    padding: 12,
    fontSize: 12,
    fontWeight: '700',
    color: colors.mutedForeground,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionButtonActive: {
    borderColor: colors.primary + '44',
    backgroundColor: colors.primary + '12',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.mutedForeground,
  },
  actionLabelActive: {
    color: colors.primary,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  commentInput: {
    minHeight: 40,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comments: {
    gap: 12,
  },
  commentSectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.foreground,
  },
  emptyComment: {
    textAlign: 'center',
    color: colors.mutedForeground,
    fontSize: 12,
    paddingVertical: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  commentItem: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.foreground,
  },
  commentTime: {
    fontSize: 10,
    color: colors.mutedForeground,
  },
  commentActions: {
    flexDirection: 'row',
    gap: 2,
  },
  commentIconButton: {
    padding: 5,
  },
  commentText: {
    marginTop: 4,
    fontSize: 13,
    color: colors.foreground,
    lineHeight: 19,
  },
  commentEditor: {
    marginTop: 8,
    gap: 8,
  },
  commentEditorActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  commentCancelButton: {
    minHeight: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.muted,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentCancelText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.foreground,
  },
  commentSaveButton: {
    minHeight: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentSaveText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryForeground,
  },
});
