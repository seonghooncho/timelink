import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronLeft, ChevronRight, Lock, Megaphone, PenLine, Users } from 'lucide-react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Screen } from '../../components/layout/Screen';
import { PageHeader } from '../../components/layout/PageHeader';
import { AppButton } from '../../components/common/AppButton';
import { AppTextInput } from '../../components/common/AppTextInput';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';
import { GroupAvatar, PersonAvatar } from '../../components/common/GroupAvatar';
import { PostListItem } from '../../components/community/PostListItem';
import { colors, radius } from '../../constants/theme';
import { JOIN_REQUEST_MESSAGE_MAX_LENGTH } from '../../constants/textLimits';
import { RootStackParamList } from '../../navigation/types';
import { groupApi } from '../../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupIntro'>;

export function GroupIntroScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const queryClient = useQueryClient();
  const [imageIndex, setImageIndex] = useState(0);
  const [joinMessage, setJoinMessage] = useState('');
  const [feedMode, setFeedMode] = useState<'all' | 'notices'>('all');
  const [isRequesting, setIsRequesting] = useState(false);
  const introQuery = useQuery({
    queryKey: ['groups', id, 'intro'],
    queryFn: () => groupApi.getIntro(id),
  });
  const postsQuery = useQuery({
    queryKey: ['groups', id, 'intro', 'posts'],
    queryFn: async () => {
      const page = await groupApi.getIntroPosts(id, { limit: 20 });
      return page.data;
    },
    enabled: Boolean(introQuery.data),
  });

  useEffect(() => {
    setImageIndex(0);
  }, [id]);

  const intro = introQuery.data;
  const images = (intro?.images || []).filter((item) => item.status === 'COMPLETED' && item.url);
  const currentImage = images[imageIndex]?.url || intro?.imageUrl;

  const handleJoinRequest = async () => {
    if (!intro) return;
    try {
      setIsRequesting(true);
      await groupApi.requestToJoin(intro.id, joinMessage.trim() || undefined);
      setJoinMessage('');
      queryClient.invalidateQueries({ queryKey: ['groups', id, 'intro'] });
      queryClient.invalidateQueries({ queryKey: ['groups', 'public'] });
      Alert.alert('요청 완료', '모임 관리자에게 가입 요청을 보냈습니다.');
    } catch (error) {
      const message = error instanceof Error ? error.message : '가입 요청에 실패했습니다.';
      Alert.alert('요청 실패', message);
    } finally {
      setIsRequesting(false);
    }
  };

  const openMemberProfile = async (memberUserId?: string) => {
    if (!memberUserId) return;
    if (!intro?.member) {
      Alert.alert('가입이 필요합니다', '가입 후 멤버 프로필과 글 전체를 확인할 수 있습니다.');
      return;
    }
    try {
      const profile = await groupApi.getMemberProfile(id, memberUserId);
      Alert.alert(
        profile.nickname || '멤버',
        `${profile.role === 'manager' ? '관리자' : '멤버'} · 최근 활동 ${profile.recentActivities.length}개`,
      );
    } catch {
      Alert.alert('프로필 오류', '멤버 프로필을 불러오지 못했습니다.');
    }
  };

  if (introQuery.isLoading) {
    return (
      <Screen>
        <PageHeader title="모임 소개" showBack />
        <LoadingState />
      </Screen>
    );
  }

  if (!intro) {
    return (
      <Screen>
        <PageHeader title="모임 소개" showBack />
        <EmptyState title="모임 소개를 찾을 수 없습니다" />
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader
        title="모임 소개"
        showBack
        rightElement={intro.member ? (
          <Pressable onPress={() => navigation.navigate('GroupDetail', { id })} style={styles.headerAction}>
            <Text style={styles.headerActionText}>모임으로</Text>
          </Pressable>
        ) : null}
      />

      <View style={styles.content}>
        <View style={styles.hero}>
          {currentImage ? (
            <Image source={{ uri: currentImage }} style={styles.heroImage} />
          ) : (
            <View style={styles.heroFallback}>
              <GroupAvatar image={intro.imageUrl} thumbnail={intro.thumbnailUrl} name={intro.name} size="lg" />
            </View>
          )}
          {images.length > 1 ? (
            <View style={styles.imageControls}>
              <Pressable onPress={() => setImageIndex((prev) => Math.max(0, prev - 1))} style={styles.imageButton}>
                <ChevronLeft size={16} color={colors.card} />
              </Pressable>
              <Text style={styles.imageIndicator}>{imageIndex + 1}/{images.length}</Text>
              <Pressable onPress={() => setImageIndex((prev) => Math.min(images.length - 1, prev + 1))} style={styles.imageButton}>
                <ChevronRight size={16} color={colors.card} />
              </Pressable>
            </View>
          ) : null}
        </View>

        <View style={styles.titleRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={styles.groupName}>{intro.name}</Text>
            <View style={styles.metaRow}>
              <View style={[styles.visibilityBadge, intro.visibility === 'PUBLIC' ? styles.publicBadge : styles.privateBadge]}>
                <Text style={[styles.visibilityLabel, intro.visibility === 'PUBLIC' ? styles.publicLabel : styles.privateLabel]}>
                  {intro.visibility === 'PUBLIC' ? '공개 모임' : '비공개 모임'}
                </Text>
              </View>
              <Users size={13} color={colors.mutedForeground} />
              <Text style={styles.memberCount}>{intro.memberCount > 99 ? '99+' : intro.memberCount}명</Text>
            </View>
          </View>
          {intro.canEditIntro ? (
            <AppButton label="정보수정" variant="secondary" onPress={() => Alert.alert('준비 중', '모바일 정보수정은 다음 업데이트에서 상세 편집을 제공합니다.')} style={styles.smallButton} />
          ) : null}
        </View>

        <Text style={styles.introText}>{intro.introText || intro.description || '아직 모임 소개가 없습니다.'}</Text>

        {intro.memberPreviews?.length ? (
          <View style={styles.memberPreviewSection}>
            <Text style={styles.sectionTitle}>참여 중인 멤버</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.memberPreviewRow}>
              {intro.memberPreviews.slice(0, 8).map((member) => (
                <View key={member.id} style={styles.memberPreview}>
                  <PersonAvatar image={member.avatarUrl} thumbnail={member.thumbnailUrl} name={member.nickname || member.userId} size={42} />
                  <Text numberOfLines={1} style={styles.memberPreviewName}>{member.nickname || member.userId}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {!intro.member ? (
          <View style={styles.joinBox}>
            <Text style={styles.joinTitle}>함께하고 싶다면 가입 요청을 보내세요</Text>
            <AppTextInput
              value={joinMessage}
              onChangeText={setJoinMessage}
              maxLength={JOIN_REQUEST_MESSAGE_MAX_LENGTH}
              placeholder="짧은 인삿말"
              hint={`${joinMessage.length}/${JOIN_REQUEST_MESSAGE_MAX_LENGTH}`}
            />
            <AppButton
              label={intro.joinRequestStatus === 'PENDING' ? '가입요청 완료' : '가입 요청하기'}
              onPress={handleJoinRequest}
              disabled={intro.joinRequestStatus === 'PENDING'}
              loading={isRequesting}
            />
          </View>
        ) : null}

        <View style={styles.feedHeader}>
          <Text style={styles.sectionTitle}>모임 글</Text>
          <View style={styles.feedTabs}>
            <Pressable onPress={() => setFeedMode('all')} style={[styles.feedTab, feedMode === 'all' ? styles.feedTabActive : null]}>
              <Text style={[styles.feedTabLabel, feedMode === 'all' ? styles.feedTabLabelActive : null]}>전체</Text>
            </Pressable>
            <Pressable onPress={() => setFeedMode('notices')} style={[styles.feedTab, feedMode === 'notices' ? styles.feedTabActive : null]}>
              <Megaphone size={12} color={feedMode === 'notices' ? colors.foreground : colors.mutedForeground} />
              <Text style={[styles.feedTabLabel, feedMode === 'notices' ? styles.feedTabLabelActive : null]}>공지사항</Text>
            </Pressable>
          </View>
        </View>

        {feedMode === 'notices' ? (
          intro.notices.length === 0 ? <EmptyState title="공지사항이 없습니다" /> : intro.notices.map((notice) => (
            <View key={notice.id} style={styles.noticeItem}>
              <Text numberOfLines={1} style={styles.noticeTitle}>{notice.title}</Text>
              <Text numberOfLines={2} style={styles.noticeContent}>{notice.content}</Text>
            </View>
          ))
        ) : postsQuery.isLoading ? (
          <LoadingState />
        ) : (postsQuery.data || []).length === 0 ? (
          <EmptyState title="아직 모임 글이 없습니다" />
        ) : (
          (postsQuery.data || []).map((post) => (
            <PostListItem
              key={post.id}
              post={{
                id: post.id,
                title: post.title || '',
                content: post.content || post.contentSnippet || '',
                authorNickname: post.authorNickname || '모임 멤버',
                authorAvatarUrl: post.authorAvatarUrl,
                authorUserId: post.authorUserId,
                likeCount: post.likeCount,
                commentCount: post.commentCount,
                likedByMe: Boolean(post.likedByMe),
                mine: Boolean(post.mine),
                memberOnly: post.memberOnly,
                locked: post.locked,
                imageUrl: post.imageUrl,
                imageId: post.imageId,
                imageStatus: post.imageStatus,
                createdAt: post.createdAt,
                updatedAt: post.updatedAt || post.createdAt,
              }}
              onPress={() => {
                if (!intro.member) {
                  Alert.alert('가입이 필요합니다', '가입 후 글을 자세히 확인하고 댓글을 남길 수 있습니다.');
                  return;
                }
                navigation.navigate('CommunityPostDetail', { groupId: id, postId: post.id });
              }}
              onAuthorPress={() => openMemberProfile(post.authorUserId)}
            />
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerAction: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  headerActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  hero: {
    height: 210,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.categoryGroupLight,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageControls: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(27,32,48,0.42)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  imageButton: {
    padding: 3,
  },
  imageIndicator: {
    color: colors.card,
    fontSize: 11,
    fontWeight: '800',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  groupName: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.foreground,
  },
  metaRow: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  visibilityBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  publicBadge: {
    backgroundColor: colors.primary + '14',
  },
  privateBadge: {
    backgroundColor: colors.muted,
  },
  visibilityLabel: {
    fontSize: 10,
    fontWeight: '800',
  },
  publicLabel: {
    color: colors.primary,
  },
  privateLabel: {
    color: colors.mutedForeground,
  },
  memberCount: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.mutedForeground,
  },
  smallButton: {
    minHeight: 40,
    paddingHorizontal: 12,
  },
  introText: {
    fontSize: 14,
    color: colors.foreground,
    lineHeight: 22,
  },
  memberPreviewSection: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.foreground,
  },
  memberPreviewRow: {
    gap: 12,
  },
  memberPreview: {
    width: 56,
    alignItems: 'center',
    gap: 6,
  },
  memberPreviewName: {
    fontSize: 10,
    color: colors.mutedForeground,
  },
  joinBox: {
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: 14,
  },
  joinTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.foreground,
  },
  feedHeader: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  feedTabs: {
    flexDirection: 'row',
    gap: 6,
  },
  feedTab: {
    minHeight: 30,
    borderRadius: 999,
    backgroundColor: colors.muted,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  feedTabActive: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  feedTabLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.mutedForeground,
  },
  feedTabLabelActive: {
    color: colors.foreground,
  },
  noticeItem: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.foreground,
  },
  noticeContent: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    color: colors.mutedForeground,
  },
});
