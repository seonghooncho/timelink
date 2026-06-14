import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Heart, Lock, MessageCircle } from 'lucide-react-native';
import { colors, radius } from '../../constants/theme';
import { CommunityPostResponse } from '../../services/api';
import { PersonAvatar } from '../common/GroupAvatar';
import { timeAgoLabel } from '../../utils/date';

interface PostListItemProps {
  post: CommunityPostResponse;
  onPress: () => void;
  onAuthorPress?: () => void;
}

export function PostListItem({ post, onPress, onAuthorPress }: PostListItemProps) {
  const display = getPostListDisplay(post);

  return (
    <Pressable onPress={onPress} style={styles.item}>
      <View style={styles.authorRow}>
        <Pressable disabled={post.anonymous || !onAuthorPress} onPress={onAuthorPress}>
          <PersonAvatar image={post.anonymous ? undefined : post.authorAvatarUrl} name={display.authorName} size={28} />
        </Pressable>
        <Text numberOfLines={1} style={styles.authorName}>{display.authorName}</Text>
        {post.memberOnly ? (
          <View style={styles.memberOnlyBadge}>
            <Lock size={10} color={colors.categoryGroupStrong} />
            <Text style={styles.memberOnlyLabel}>모임 공개</Text>
          </View>
        ) : null}
      </View>

      <Text numberOfLines={1} style={styles.title}>
        {display.title}
      </Text>
      {display.locked ? (
        <Text style={styles.content}>{display.content}</Text>
      ) : (
        <Text numberOfLines={2} style={styles.content}>{display.content}</Text>
      )}

      {post.imageUrl && !display.locked ? (
        <Image source={{ uri: post.imageUrl }} style={styles.previewImage} />
      ) : null}

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
  return {
    locked,
    authorName: post.anonymous ? '익명' : post.authorNickname,
    title: locked ? '모임에만 공개된 게시물이에요' : post.title,
    content: locked ? '가입하면 내용을 확인할 수 있어요.' : post.content,
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
  previewImage: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    marginTop: 4,
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
