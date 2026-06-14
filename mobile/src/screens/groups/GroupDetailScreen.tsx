import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { CalendarDays, ChevronRight, Clock3, EllipsisVertical, PenLine, UserPlus, Users } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { Screen } from '../../components/layout/Screen';
import { PageHeader } from '../../components/layout/PageHeader';
import { AppButton } from '../../components/common/AppButton';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';
import { GroupAvatar, PersonAvatar } from '../../components/common/GroupAvatar';
import { ScheduleDetailSheet } from '../../components/schedule/ScheduleDetailSheet';
import { PostComposerModal } from '../../components/community/PostComposerModal';
import { PostListItem } from '../../components/community/PostListItem';
import { colors, radius, shadows } from '../../constants/theme';
import { RootStackParamList } from '../../navigation/types';
import { groupApi, groupPostApi } from '../../services/api';
import { useGroupDetail, useGroupSchedules } from '../../hooks/useGroups';
import { useCreateGroupPost, useGroupPosts } from '../../hooks/useCommunity';
import { useDeleteSchedule, useLeaveScheduleParticipation } from '../../hooks/useSchedules';
import { CoordinationSummary, GroupMember, Schedule } from '../../types';
import { coordinationApi } from '../../services/api';
import { formatDateTimeDuration } from '../../utils/date';
import { uploadProcessedImage, type PickedImageAsset } from '../../utils/images';
import { env } from '../../config/env';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupDetail'>;

const COORDINATION_PREVIEW_LIMIT = 4;

export function GroupDetailScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const queryClient = useQueryClient();
  const { data: group, isLoading } = useGroupDetail(id);
  const [showPastSchedules, setShowPastSchedules] = useState(false);
  const { data: groupSchedules = [], isLoading: schedulesLoading } = useGroupSchedules(id, showPastSchedules);
  const { data: posts = [], isLoading: postsLoading } = useGroupPosts(id);
  const createPost = useCreateGroupPost(id);
  const deleteSchedule = useDeleteSchedule();
  const leaveParticipation = useLeaveScheduleParticipation();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [coordinations, setCoordinations] = useState<CoordinationSummary[]>([]);
  const [showClosedCoordinations, setShowClosedCoordinations] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [memberOnlyPost, setMemberOnlyPost] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

  useEffect(() => {
    groupApi.getMembers(id).then(setMembers).catch(() => setMembers([]));
  }, [id]);

  useEffect(() => {
    coordinationApi.getAll(id, showClosedCoordinations ? undefined : 'active')
      .then((items) => setCoordinations(showClosedCoordinations ? items : items.filter((item) => item.status !== 'closed')))
      .catch(() => setCoordinations([]));
  }, [id, showClosedCoordinations]);

  const inviteLink = group?.inviteCode ? `${env.webAppOrigin}/groups/join/${group.inviteCode}` : '';
  const isManager = group?.myRole === 'manager';
  const visibleCoordinations = coordinations.slice(0, COORDINATION_PREVIEW_LIMIT);
  const headerTitle = group?.name || '모임';

  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => {
      if (a.role !== b.role) return a.role === 'manager' ? -1 : 1;
      return a.joinedAt.localeCompare(b.joinedAt);
    }),
    [members],
  );

  const handlePostSubmit = async (data: { title: string; content: string; image?: PickedImageAsset | null }) => {
    try {
      const post = await createPost.mutateAsync({ title: data.title, content: data.content, memberOnly: memberOnlyPost });
      if (data.image) {
        const uploaded = await uploadProcessedImage('GROUP_POST', data.image, post.id);
        await groupPostApi.updatePost(id, post.id, { imageId: uploaded.imageId });
        await queryClient.invalidateQueries({ queryKey: ['groups', id, 'posts'] });
      }
      setComposerOpen(false);
      setMemberOnlyPost(false);
      navigation.navigate('CommunityPostDetail', { groupId: id, postId: post.id });
    } catch (error) {
      const message = error instanceof Error ? error.message : '모임 글 작성에 실패했습니다.';
      Alert.alert('작성 실패', message);
    }
  };

  const handleDeleteSchedule = (schedule: Schedule) => {
    Alert.alert('일정을 삭제할까요?', '작성자가 삭제하면 참여자의 캘린더에서도 제거됩니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          deleteSchedule.mutate(schedule.id);
          setSelectedSchedule(null);
        },
      },
    ]);
  };

  const handleLeaveParticipation = (schedule: Schedule) => {
    Alert.alert('약속에서 빠질까요?', '내 캘린더에서만 이 약속이 사라집니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '빠지기',
        style: 'destructive',
        onPress: () => {
          leaveParticipation.mutate(schedule.id);
          setSelectedSchedule(null);
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <Screen>
        <PageHeader title="모임" showBack />
        <LoadingState />
      </Screen>
    );
  }

  if (!group) {
    return (
      <Screen>
        <PageHeader title="모임" showBack />
        <EmptyState title="모임을 찾을 수 없습니다" />
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={{ paddingBottom: 156 }}>
      <PageHeader
        title={headerTitle}
        showBack
        rightElement={(
          <View style={styles.headerActions}>
            <Pressable onPress={() => setMembersOpen(true)} style={styles.memberHeaderButton}>
              <Users size={16} color={colors.mutedForeground} />
              <Text style={styles.memberHeaderText}>{members.length > 99 ? '99+' : members.length}</Text>
            </Pressable>
            <Pressable onPress={() => setMenuOpen(true)} style={styles.iconButton}>
              <EllipsisVertical size={20} color={colors.foreground} />
            </Pressable>
          </View>
        )}
      />

      <View style={styles.content}>
        <Pressable onPress={() => navigation.navigate('GroupIntro', { id })} style={styles.groupSummary}>
          <GroupAvatar image={group.imageUrl} thumbnail={group.thumbnailUrl} name={group.name} size="lg" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.groupNameLine}>
              <Text numberOfLines={1} style={styles.groupName}>{group.name}</Text>
              <ChevronRight size={16} color={colors.mutedForeground} />
            </View>
            <Text numberOfLines={2} style={styles.groupDescription}>{group.description || '함께 약속과 시간을 맞추는 모임입니다.'}</Text>
          </View>
        </Pressable>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>일정 ({groupSchedules.length}개)</Text>
            <Pressable onPress={() => setShowPastSchedules((prev) => !prev)} style={styles.inlineToggle}>
              <Text style={[styles.inlineToggleText, showPastSchedules ? styles.inlineToggleTextActive : null]}>
                {showPastSchedules ? '지난 약속 숨기기' : '지난 약속 보기'}
              </Text>
            </Pressable>
          </View>
          {schedulesLoading ? (
            <LoadingState />
          ) : groupSchedules.length === 0 ? null : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scheduleStrip}>
              {groupSchedules.map((schedule) => (
                <Pressable key={schedule.id} onPress={() => setSelectedSchedule(schedule)} style={styles.scheduleCard}>
                  <CalendarDays size={16} color={colors.categoryGroup} />
                  <Text numberOfLines={1} style={styles.scheduleTitle}>{schedule.title}</Text>
                  <Text style={styles.scheduleTime}>{formatDateTimeDuration(schedule.startTime, schedule.duration, schedule.endTime)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>시간 조율 ({coordinations.length}개)</Text>
            <Pressable onPress={() => setShowClosedCoordinations((prev) => !prev)} style={styles.inlineToggle}>
              <Text style={[styles.inlineToggleText, showClosedCoordinations ? styles.inlineToggleTextActive : null]}>
                {showClosedCoordinations ? '닫힌 조율 숨기기' : '닫힌 조율 보기'}
              </Text>
            </Pressable>
          </View>
          {visibleCoordinations.length === 0 ? null : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.coordStrip}>
              {visibleCoordinations.map((coord) => (
                <Pressable
                  key={coord.id}
                  onPress={() => navigation.navigate('CoordinationTimetable', { groupId: id, coordId: coord.id })}
                  style={styles.coordCard}
                >
                  <Clock3 size={15} color={colors.primary} />
                  <Text numberOfLines={1} style={styles.coordTitle}>{coord.title}</Text>
                  <Text style={styles.coordMeta}>응답 {coord.responseCount}건 · {coord.dates.length}일</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.postsSection}>
          <Text style={styles.sectionTitle}>모임 글</Text>
          {postsLoading ? (
            <LoadingState />
          ) : posts.length === 0 ? (
            <EmptyState title="아직 모임 글이 없습니다" />
          ) : posts.map((post) => (
            <PostListItem
              key={post.id}
              post={post}
              onPress={() => navigation.navigate('CommunityPostDetail', { groupId: id, postId: post.id })}
            />
          ))}
        </View>
      </View>

      <View style={styles.bottomActions}>
        <AppButton label="일정 생성" variant="group" onPress={() => navigation.navigate('ScheduleForm', { groupId: id, groupName: group.name })} style={{ flex: 1, minHeight: 48 }} />
        <AppButton label="시간 조율하기" onPress={() => navigation.navigate('TimeCoordination', { groupId: id })} style={{ flex: 1, minHeight: 48 }} />
      </View>

      <Pressable onPress={() => setComposerOpen(true)} style={styles.writeButton}>
        <PenLine color={colors.primaryForeground} size={18} />
        <Text style={styles.writeButtonText}>글쓰기</Text>
      </Pressable>

      <GroupMenu
        visible={menuOpen}
        isManager={isManager}
        onClose={() => setMenuOpen(false)}
        onIntro={() => { setMenuOpen(false); navigation.navigate('GroupIntro', { id }); }}
        onMembers={() => { setMenuOpen(false); setMembersOpen(true); }}
        onInvite={() => {
          setMenuOpen(false);
          if (!inviteLink) return;
          Clipboard.setStringAsync(inviteLink)
            .then(() => Alert.alert('복사 완료', '초대 링크를 복사했습니다.'))
            .catch(() => Alert.alert('복사 실패', '링크 복사에 실패했습니다.'));
        }}
        onShare={() => {
          setMenuOpen(false);
          if (!inviteLink) return;
          Share.share({ title: `${group.name} 모임 초대`, message: `${group.name} 모임에 참여하세요.\n${inviteLink}`, url: inviteLink }).catch(() => Alert.alert('공유 실패', '공유에 실패했습니다.'));
        }}
      />

      <MembersSheet visible={membersOpen} members={sortedMembers} isManager={isManager} onClose={() => setMembersOpen(false)} />

      <PostComposerModal
        visible={composerOpen}
        title="모임 글쓰기"
        memberOnly={memberOnlyPost}
        showMemberOnly
        onMemberOnlyChange={setMemberOnlyPost}
        loading={createPost.isPending}
        onClose={() => setComposerOpen(false)}
        onSubmit={handlePostSubmit}
      />

      <ScheduleDetailSheet
        schedule={selectedSchedule}
        open={Boolean(selectedSchedule)}
        onClose={() => setSelectedSchedule(null)}
        onDelete={selectedSchedule?.groupScheduleOwner !== false ? handleDeleteSchedule : undefined}
        onLeaveParticipation={selectedSchedule?.groupScheduleOwner === false && selectedSchedule?.groupScheduleParticipant !== false ? handleLeaveParticipation : undefined}
      />
    </Screen>
  );
}

function GroupMenu({
  visible,
  isManager,
  onClose,
  onIntro,
  onMembers,
  onInvite,
  onShare,
}: {
  visible: boolean;
  isManager: boolean;
  onClose: () => void;
  onIntro: () => void;
  onMembers: () => void;
  onInvite: () => void;
  onShare: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.menuOverlay} onPress={onClose}>
        <View style={styles.menu}>
          <Pressable onPress={onIntro} style={styles.menuItem}><Text style={styles.menuText}>모임 소개</Text></Pressable>
          <Pressable onPress={onMembers} style={styles.menuItem}><Text style={styles.menuText}>{isManager ? '멤버관리' : '멤버'}</Text></Pressable>
          <Pressable onPress={onInvite} style={styles.menuItem}><Text style={styles.menuText}>멤버 초대</Text></Pressable>
          <Pressable onPress={onShare} style={styles.menuItem}><Text style={styles.menuText}>공유하기</Text></Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

function MembersSheet({ visible, members, isManager, onClose }: { visible: boolean; members: GroupMember[]; isManager: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.memberSheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>{isManager ? '멤버관리' : '멤버'}</Text>
          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator>
            {members.map((member) => (
              <View key={member.id} style={styles.memberRow}>
                <PersonAvatar image={member.avatarUrl} thumbnail={member.thumbnailUrl} name={member.nickname || member.userId} size={42} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={styles.memberName}>{member.nickname || member.userId}</Text>
                  <Text style={styles.memberRole}>{member.role === 'manager' ? '관리자' : '멤버'} · 참여일 {member.joinedAt.slice(0, 10)}</Text>
                </View>
                {isManager && member.role !== 'manager' ? (
                  <UserPlus size={16} color={colors.mutedForeground} />
                ) : null}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  memberHeaderText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.mutedForeground,
  },
  iconButton: {
    padding: 8,
  },
  content: {
    padding: 20,
    gap: 18,
  },
  groupSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  groupNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  groupName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    color: colors.foreground,
  },
  groupDescription: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    color: colors.mutedForeground,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.foreground,
  },
  inlineToggle: {
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  inlineToggleText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.mutedForeground,
  },
  inlineToggleTextActive: {
    color: colors.primary,
  },
  scheduleStrip: {
    gap: 10,
  },
  scheduleCard: {
    width: 150,
    borderRadius: radius.lg,
    backgroundColor: colors.categoryGroupLight,
    padding: 13,
    gap: 6,
  },
  scheduleTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.foreground,
  },
  scheduleTime: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  coordStrip: {
    gap: 9,
  },
  coordCard: {
    width: 136,
    borderRadius: radius.md,
    backgroundColor: colors.primary + '10',
    padding: 12,
    gap: 5,
  },
  coordTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.foreground,
  },
  coordMeta: {
    fontSize: 10,
    color: colors.mutedForeground,
  },
  postsSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 16,
  },
  bottomActions: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 86,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    gap: 8,
    padding: 8,
    ...shadows.card,
  },
  writeButton: {
    position: 'absolute',
    right: 20,
    bottom: 154,
    minHeight: 44,
    borderRadius: 17,
    backgroundColor: colors.categoryGroup,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 15,
    ...shadows.card,
  },
  writeButtonText: {
    color: colors.primaryForeground,
    fontSize: 13,
    fontWeight: '900',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(27,32,48,0.08)',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 16,
  },
  menu: {
    width: 164,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.card,
  },
  menuItem: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  menuText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.foreground,
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(27,32,48,0.24)',
  },
  memberSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.foreground,
    marginBottom: 10,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.foreground,
  },
  memberRole: {
    marginTop: 3,
    fontSize: 11,
    color: colors.mutedForeground,
  },
});
