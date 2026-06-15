import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Heart, ImageIcon, Lock, MessageCircle } from 'lucide-react-native';
import { colors, radius } from '../../constants/theme';
import { CommunityCommentResponse, CommunityPostResponse } from '../../services/api';
import { PersonAvatar } from '../common/GroupAvatar';
import { timeAgoLabel } from '../../utils/date';

interface PostListItemProps {
  post: CommunityPostResponse;
  onPress: () => void;
  onAuthorPress?: () => void;
}

export function PostListItem({ post, onPress, onAuthorPress }: PostListItemProps) {
  const display = getPostListDisplay(post);
  const handleAuthorPress = display.canOpenAuthor ? onAuthorPress : undefined;

  return (
    <Pressable onPress={onPress} style={styles.item}>
      <View style={styles.authorRow}>
        <Pressable disabled={!handleAuthorPress} onPress={handleAuthorPress}>
          <PersonAvatar image={post.anonymous ? undefined : post.authorAvatarUrl} name={display.authorName} size={28} />
        </Pressable>
        <Text numberOfLines={1} style={styles.authorName}>{display.authorName}</Text>
        {post.anonymous ? (
          <View style={styles.neutralBadge}>
            <Text style={styles.neutralBadgeLabel}>익명</Text>
          </View>
        ) : null}
        {post.mine ? (
          <View style={styles.mineBadge}>
            <Text style={styles.mineBadgeLabel}>내 글</Text>
          </View>
        ) : null}
        {post.memberOnly ? (
          <View style={styles.memberOnlyBadge}>
            <Lock size={10} color={colors.categoryGroupStrong} />
            <Text style={styles.memberOnlyLabel}>모임 공개</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.bodyRow}>
        <View style={styles.bodyText}>
          <Text numberOfLines={1} style={styles.title}>
            {display.title}
          </Text>
          {display.locked ? (
            <Text style={styles.content}>{display.content}</Text>
          ) : (
            <Text numberOfLines={1} style={styles.content}>{display.content}</Text>
          )}
          {display.previewComment ? (
            <View style={styles.previewCommentRow}>
              <Text style={styles.previewMarker}>ㄴ</Text>
              <Text numberOfLines={1} style={styles.previewComment}>
                <Text style={styles.previewAuthor}>{display.previewComment.authorName}</Text>
                {': '}
                {display.previewComment.content}
              </Text>
            </View>
          ) : null}
        </View>

        {post.imageUrl && !display.locked ? (
          <Image source={{ uri: post.imageUrl }} style={styles.previewImage} />
        ) : post.imageStatus === 'PROCESSING' && !display.locked ? (
          <View style={styles.processingImage}>
            <ImageIcon size={16} color={colors.primary} />
          </View>
        ) : null}
      </View>

      <View style={styles.metaRow}>
        <View style={styles.countRow}>
          <Heart size={13} color={post.likedByMe ? colors.destructive : colors.mutedForeground} fill={post.likedByMe ? colors.destructive : 'transparent'} />
          <Text style={styles.countText}>{post.likeCount}</Text>
          <MessageCircle size={13} color={colors.mutedForeground} />
          <Text style={styles.countText}>{post.commentCount}</Text>
        </View>
        <Text style={styles.time}>{timeAgoLabel(post.createdAt)}</Text>
      </View>
    </Pressable>
  );
}

export function getPostListDisplay(post: CommunityPostResponse) {
  const locked = Boolean(post.locked);
  const authorName = post.anonymous ? '익명' : (post.authorNickname?.trim() || '사용자');
  return {
    locked,
    authorName,
    canOpenAuthor: Boolean(!post.anonymous && post.authorUserId),
    title: locked ? '모임에만 공개된 게시물이에요' : post.title,
    content: locked ? '가입하면 내용을 확인할 수 있어요.' : post.content,
    previewComment: locked ? null : getPreviewCommentDisplay(post.previewComment),
  };
}

export function getPreviewCommentDisplay(comment?: CommunityCommentResponse | null) {
  const content = comment?.content?.trim();
  if (!content) return null;
  return {
    authorName: comment?.authorNickname?.trim() || '사용자',
    content,
  };
}

const styles = StyleSheet.create({
  item: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 5,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  authorName: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
    color: colors.mutedForeground,
  },
  memberOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 999,
    backgroundColor: colors.categoryGroupLight,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  memberOnlyLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.categoryGroupStrong,
  },
  neutralBadge: {
    borderRadius: 999,
    backgroundColor: colors.muted,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  neutralBadgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.mutedForeground,
  },
  mineBadge: {
    borderRadius: 999,
    backgroundColor: colors.primary + '14',
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  mineBadgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  bodyRow: {
    flexDirection: 'row',
    gap: 12,
    minWidth: 0,
  },
  bodyText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.foreground,
  },
  content: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.mutedForeground,
  },
  previewCommentRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minWidth: 0,
  },
  previewMarker: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.mutedForeground,
    opacity: 0.72,
  },
  previewComment: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    lineHeight: 17,
    color: colors.mutedForeground,
  },
  previewAuthor: {
    fontWeight: '800',
    color: colors.foreground,
  },
  previewImage: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
  },
  processingImage: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countText: {
    marginRight: 6,
    fontSize: 11,
    color: colors.mutedForeground,
  },
  time: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
});
