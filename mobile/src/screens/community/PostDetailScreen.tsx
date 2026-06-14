import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Heart, MessageCircle, Send } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/layout/Screen';
import { PageHeader } from '../../components/layout/PageHeader';
import { AppTextInput } from '../../components/common/AppTextInput';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { PersonAvatar } from '../../components/common/GroupAvatar';
import { colors, radius } from '../../constants/theme';
import { COMMENT_MAX_LENGTH } from '../../constants/textLimits';
import { RootStackParamList } from '../../navigation/types';
import {
  useCommunityComments,
  useCommunityPost,
  useCreateCommunityComment,
  useCreateGroupPostComment,
  useGroupPostComments,
  useToggleCommunityLike,
  useToggleGroupPostLike,
} from '../../hooks/useCommunity';
import { groupPostApi } from '../../services/api';
import { timeAgoLabel } from '../../utils/date';

type Props = NativeStackScreenProps<RootStackParamList, 'CommunityPostDetail'>;

export function PostDetailScreen({ route }: Props) {
  const { postId, groupId } = route.params;
  const isGroupPost = Boolean(groupId);
  const communityPostQuery = useCommunityPost(isGroupPost ? undefined : postId);
  const [groupPost, setGroupPost] = useState(communityPostQuery.data);
  const [isGroupPostLoading, setIsGroupPostLoading] = useState(isGroupPost);
  const communityComments = useCommunityComments(isGroupPost ? undefined : postId);
  const groupComments = useGroupPostComments(groupId, isGroupPost ? postId : undefined);
  const toggleCommunityLike = useToggleCommunityLike(postId);
  const toggleGroupLike = useToggleGroupPostLike(groupId || '', postId);
  const createCommunityComment = useCreateCommunityComment(postId);
  const createGroupComment = useCreateGroupPostComment(groupId || '', postId);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!isGroupPost || !groupId) return;
    setIsGroupPostLoading(true);
    groupPostApi.getPost(groupId, postId)
      .then(setGroupPost)
      .catch(() => setGroupPost(undefined))
      .finally(() => setIsGroupPostLoading(false));
  }, [groupId, isGroupPost, postId]);

  const post = isGroupPost ? groupPost : communityPostQuery.data;
  const comments = isGroupPost ? (groupComments.data || []) : (communityComments.data || []);
  const isLoading = isGroupPost ? isGroupPostLoading : communityPostQuery.isLoading;

  const handleLike = async () => {
    if (!post) return;
    try {
      if (isGroupPost && groupId) {
        const updated = await toggleGroupLike.mutateAsync(Boolean(post.likedByMe));
        setGroupPost(updated);
      } else {
        await toggleCommunityLike.mutateAsync(Boolean(post.likedByMe));
      }
    } catch {
      Alert.alert('처리 실패', '좋아요 처리에 실패했습니다.');
    }
  };

  const handleCommentSubmit = async () => {
    const trimmed = comment.trim();
    if (!trimmed) return;
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

  const authorName = post.anonymous ? '익명' : post.authorNickname;
  const locked = Boolean(post.locked);

  return (
    <Screen>
      <PageHeader title={isGroupPost ? '모임 글' : '커뮤니티 글'} showBack />
      <View style={styles.content}>
        <View style={styles.authorRow}>
          <PersonAvatar image={post.anonymous ? undefined : post.authorAvatarUrl} name={authorName} size={36} />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={styles.authorName}>{authorName}</Text>
            <Text style={styles.time}>{timeAgoLabel(post.createdAt)}</Text>
          </View>
        </View>

        <Text style={styles.title}>{locked ? '모임에만 공개된 게시물이에요' : post.title}</Text>
        <Text style={styles.body}>{locked ? '가입하면 내용을 확인하고 댓글을 남길 수 있어요.' : post.content}</Text>

        {post.imageUrl && !locked ? <Image source={{ uri: post.imageUrl }} style={styles.postImage} /> : null}
        {post.imageStatus === 'PROCESSING' ? <Text style={styles.processingText}>이미지 처리 중입니다</Text> : null}

        <View style={styles.actionRow}>
          <Pressable onPress={handleLike} disabled={locked} style={styles.actionButton}>
            <Heart size={17} color={post.likedByMe ? colors.destructive : colors.mutedForeground} fill={post.likedByMe ? colors.destructive : 'transparent'} />
            <Text style={styles.actionLabel}>{post.likeCount}</Text>
          </Pressable>
          <View style={styles.actionButton}>
            <MessageCircle size={17} color={colors.mutedForeground} />
            <Text style={styles.actionLabel}>{post.commentCount}</Text>
          </View>
        </View>

        {!locked ? (
          <View style={styles.commentInputRow}>
            <AppTextInput
              value={comment}
              onChangeText={setComment}
              maxLength={COMMENT_MAX_LENGTH}
              placeholder="댓글을 입력하세요"
              style={{ minHeight: 40 }}
            />
            <Pressable onPress={handleCommentSubmit} style={styles.sendButton}>
              <Send size={18} color={colors.primaryForeground} />
            </Pressable>
          </View>
        ) : null}

        <View style={styles.comments}>
          {comments.length === 0 ? (
            <Text style={styles.emptyComment}>댓글이 없습니다</Text>
          ) : comments.map((item) => (
            <View key={item.id} style={styles.commentItem}>
              <PersonAvatar image={item.authorAvatarUrl} name={item.authorNickname} size={30} />
              <View style={{ flex: 1 }}>
                <View style={styles.commentHeader}>
                  <Text numberOfLines={1} style={styles.commentAuthor}>{item.authorNickname}</Text>
                  <Text style={styles.commentTime}>{timeAgoLabel(item.createdAt)}</Text>
                </View>
                <Text style={styles.commentText}>{item.content}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 14,
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
    aspectRatio: 1,
    borderRadius: radius.lg,
  },
  processingText: {
    fontSize: 12,
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
  actionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.mutedForeground,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comments: {
    gap: 12,
  },
  emptyComment: {
    textAlign: 'center',
    color: colors.mutedForeground,
    fontSize: 12,
    paddingVertical: 18,
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
    justifyContent: 'space-between',
    gap: 8,
  },
  commentAuthor: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    color: colors.foreground,
  },
  commentTime: {
    fontSize: 10,
    color: colors.mutedForeground,
  },
  commentText: {
    marginTop: 4,
    fontSize: 13,
    color: colors.foreground,
    lineHeight: 19,
  },
});
