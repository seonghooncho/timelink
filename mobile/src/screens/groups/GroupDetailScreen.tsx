import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Link as LinkIcon, LogOut, UserPlus, Users } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/layout/Screen';
import { PageHeader } from '../../components/layout/PageHeader';
import { SectionCard } from '../../components/common/SectionCard';
import { AppButton } from '../../components/common/AppButton';
import { GroupAvatar, PersonAvatar } from '../../components/common/GroupAvatar';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';
import { colors, radius } from '../../constants/theme';
import { RootStackParamList } from '../../navigation/types';
import { coordinationApi, groupApi } from '../../services/api';
import { useGroupDetail } from '../../hooks/useGroups';
import { useSchedules } from '../../hooks/useSchedules';
import { CoordinationSummary, GroupMember, Schedule } from '../../types';
import { formatDateTimeRange } from '../../utils/date';
import { getCategoryLabel } from '../../utils/category';
import { env } from '../../config/env';
import { useAuth } from '../../context/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupDetail'>;

const MEMBER_PREVIEW_LIMIT = 3;
const GROUP_SCHEDULE_PREVIEW_LIMIT = 3;
const COORDINATION_PREVIEW_LIMIT = 2;

export function GroupDetailScreen({ navigation, route }: Props) {
  const queryClient = useQueryClient();
  const { id } = route.params;
  const { userId } = useAuth();
  const { data: group, isLoading } = useGroupDetail(id);
  const { data: schedules = [] } = useSchedules();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [coordinations, setCoordinations] = useState<CoordinationSummary[]>([]);
  const [membersExpanded, setMembersExpanded] = useState(false);
  const [schedulesExpanded, setSchedulesExpanded] = useState(false);
  const [coordinationsExpanded, setCoordinationsExpanded] = useState(false);

  useEffect(() => {
    groupApi.getMembers(id).then(setMembers).catch(() => setMembers([]));
    coordinationApi.getAll(id, 'active').then(setCoordinations).catch(() => setCoordinations([]));
  }, [id]);

  const groupSchedules = useMemo(
    () => schedules
      .filter((schedule) => schedule.groupId === id)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    [id, schedules],
  );

  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => {
      if (a.role !== b.role) {
        return a.role === 'manager' ? -1 : 1;
      }
      return a.joinedAt.localeCompare(b.joinedAt);
    }),
    [members],
  );

  const previewMembers = sortedMembers.slice(0, MEMBER_PREVIEW_LIMIT);
  const visibleSchedules = schedulesExpanded ? groupSchedules : groupSchedules.slice(0, GROUP_SCHEDULE_PREVIEW_LIMIT);
  const visibleCoordinations = coordinationsExpanded ? coordinations : coordinations.slice(0, COORDINATION_PREVIEW_LIMIT);
  const inviteLink = group ? `${env.webAppOrigin}/groups/join/${group.inviteCode}` : '';

  if (isLoading) {
    return (
      <Screen>
        <PageHeader title="나의 그룹" showBack />
        <LoadingState />
      </Screen>
    );
  }

  if (!group) {
    return (
      <Screen>
        <PageHeader title="나의 그룹" showBack />
        <EmptyState title="그룹을 찾을 수 없습니다" />
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader title="나의 그룹" showBack />

      <View style={styles.content}>
        <SectionCard>
          <View style={styles.groupHeader}>
            <GroupAvatar image={group.imageUrl} name={group.name} size="lg" />
            <View style={{ flex: 1 }}>
              <Text style={styles.groupName}>{group.name}</Text>
              <Text style={styles.groupDescription}>{group.description || '함께 일정을 관리하는 그룹입니다.'}</Text>
            </View>
            <View style={styles.memberPill}>
              <Text style={styles.memberPillText}>멤버 {members.length}명</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <AppButton
              label="멤버 초대"
              variant="secondary"
              onPress={() => {
                Clipboard.setStringAsync(inviteLink).then(() => {
                  Alert.alert('복사 완료', '초대 링크를 복사했습니다.');
                }).catch(() => {
                  Alert.alert('복사 실패', '링크 복사에 실패했습니다.');
                });
              }}
              style={{ flex: 1 }}
            />
            <AppButton
              label="링크 공유"
              onPress={async () => {
                try {
                  await Share.share({
                    title: `${group.name} 그룹 초대`,
                    message: `${group.name} 그룹에 참여하세요!\n${inviteLink}`,
                    url: inviteLink,
                  });
                } catch {
                  Alert.alert('공유 실패', '링크 공유에 실패했습니다.');
                }
              }}
              style={{ flex: 1 }}
            />
          </View>
        </SectionCard>

        <SectionCard>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>참여 멤버</Text>
              <Text style={styles.sectionMeta}>({members.length}명)</Text>
            </View>

            <View style={styles.memberPreviewRow}>
              {previewMembers.map((member) => (
                <View key={member.id} style={styles.memberPreviewChip}>
                  <PersonAvatar image={member.avatarUrl} name={member.nickname || member.userId} size={28} />
                  <View style={{ minWidth: 0 }}>
                    <Text numberOfLines={1} style={styles.memberPreviewName}>{member.nickname || member.userId}</Text>
                    <Text style={styles.memberPreviewRole}>{member.role === 'manager' ? '관리자' : '멤버'}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {sortedMembers.length > MEMBER_PREVIEW_LIMIT ? (
            <Pressable onPress={() => setMembersExpanded((prev) => !prev)} style={styles.moreButton}>
              <Text style={styles.moreButtonLabel}>{membersExpanded ? '접기' : '더보기'}</Text>
            </Pressable>
          ) : null}

          {membersExpanded ? (
            <View style={styles.expandedList}>
              {sortedMembers.map((member) => (
                <View key={member.id} style={styles.memberRow}>
                  <PersonAvatar image={member.avatarUrl} name={member.nickname || member.userId} size={42} />
                  <View style={{ flex: 1 }}>
                    <View style={styles.memberRowTitle}>
                      <Text style={styles.memberRowName}>{member.nickname || member.userId}</Text>
                      <Text style={styles.memberRoleBadge}>{member.role === 'manager' ? '관리자' : '멤버'}</Text>
                      {member.userId === userId ? <Text style={styles.meBadge}>나</Text> : null}
                    </View>
                    <Text style={styles.memberJoined}>참여일 {member.joinedAt.slice(5, 10)}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </SectionCard>

        <SectionCard>
          <View style={styles.sectionHeaderSimple}>
            <View>
              <Text style={styles.sectionTitle}>그룹 일정 ({groupSchedules.length}개)</Text>
              <Text style={styles.sectionMeta}>기본으로 최근 일정 3개만 보여줍니다.</Text>
            </View>
            {groupSchedules.length > GROUP_SCHEDULE_PREVIEW_LIMIT ? (
              <Pressable onPress={() => setSchedulesExpanded((prev) => !prev)} style={styles.moreButton}>
                <Text style={styles.moreButtonLabel}>{schedulesExpanded ? '접기' : '더보기'}</Text>
              </Pressable>
            ) : null}
          </View>

          {visibleSchedules.length === 0 ? (
            <EmptyState title="그룹 일정이 없습니다" />
          ) : (
            <View style={styles.compactList}>
              {visibleSchedules.map((schedule) => (
                <Pressable key={schedule.id} style={styles.compactCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.compactMeta}>{formatDateTimeRange(schedule.startTime, schedule.endTime)}</Text>
                    <Text style={styles.compactTitle}>{schedule.title}</Text>
                    {schedulesExpanded && schedule.content ? <Text numberOfLines={2} style={styles.compactDesc}>{schedule.content}</Text> : null}
                  </View>
                  <View style={styles.categoryTag}>
                    <Text style={styles.categoryTagLabel}>{getCategoryLabel(schedule.category)}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </SectionCard>

        <SectionCard>
          <View style={styles.sectionHeaderSimple}>
            <View>
              <Text style={styles.sectionTitle}>조율 중인 일정 ({coordinations.length}개)</Text>
              <Text style={styles.sectionMeta}>기본으로 진행 중인 조율 2개만 보여줍니다.</Text>
            </View>
            {coordinations.length > COORDINATION_PREVIEW_LIMIT ? (
              <Pressable onPress={() => setCoordinationsExpanded((prev) => !prev)} style={styles.moreButton}>
                <Text style={styles.moreButtonLabel}>{coordinationsExpanded ? '접기' : '더보기'}</Text>
              </Pressable>
            ) : null}
          </View>

          {visibleCoordinations.length === 0 ? (
            <EmptyState title="조율 중인 일정이 없습니다" />
          ) : (
            <View style={styles.compactList}>
              {visibleCoordinations.map((coord) => (
                <Pressable
                  key={coord.id}
                  onPress={() => navigation.navigate('CoordinationTimetable', { groupId: id, coordId: coord.id })}
                  style={styles.compactCard}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.compactMeta}>{coord.mode === 'repeat' ? '반복 조율' : '일회성 조율'} · {coord.dates.length}일</Text>
                    <Text style={styles.compactTitle}>{coord.title}</Text>
                    <Text style={styles.compactDesc}>응답 {coord.responseCount}건 · {coord.startHour}:00 - {coord.endHour}:00</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </SectionCard>

        <AppButton label="시간 조율하기" onPress={() => navigation.navigate('TimeCoordination', { groupId: id })} />
        <AppButton label="그룹 일정 생성" variant="group" onPress={() => navigation.navigate('ScheduleForm', { groupId: id, groupName: group.name })} />
        <AppButton
          label="그룹 나가기"
          variant="secondary"
          onPress={() => {
            Alert.alert('그룹을 나가시겠습니까?', '그룹에서 나가면 다시 초대받아야 합니다.', [
              { text: '취소', style: 'cancel' },
              {
                text: '나가기',
                style: 'destructive',
                onPress: () => {
                  groupApi.leaveGroup(id)
                    .then(() => {
                      queryClient.invalidateQueries({ queryKey: ['groups'] });
                      queryClient.removeQueries({ queryKey: ['groups', id] });
                      navigation.replace('MainTabs', { screen: 'Groups' });
                    })
                    .catch(() => Alert.alert('실패', '그룹 나가기에 실패했습니다.'));
                },
              },
            ]);
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 14,
  },
  groupHeader: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  groupName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.foreground,
  },
  groupDescription: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: colors.mutedForeground,
  },
  memberPill: {
    borderRadius: 999,
    backgroundColor: colors.muted,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  memberPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.mutedForeground,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionHeaderSimple: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
  },
  sectionMeta: {
    marginTop: 4,
    fontSize: 11,
    color: colors.mutedForeground,
  },
  memberPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    flexWrap: 'nowrap',
    flexShrink: 1,
  },
  memberPreviewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
    paddingVertical: 6,
    paddingHorizontal: 8,
    maxWidth: 104,
  },
  memberPreviewName: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.foreground,
  },
  memberPreviewRole: {
    fontSize: 10,
    color: colors.mutedForeground,
  },
  moreButton: {
    alignSelf: 'flex-end',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  moreButtonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.mutedForeground,
  },
  expandedList: {
    marginTop: 12,
    gap: 10,
  },
  memberRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  memberRowTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  memberRowName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
  },
  memberRoleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.muted,
    color: colors.mutedForeground,
    fontSize: 10,
    fontWeight: '700',
  },
  meBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.primary + '16',
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  memberJoined: {
    marginTop: 6,
    fontSize: 11,
    color: colors.mutedForeground,
  },
  compactList: {
    marginTop: 12,
    gap: 10,
  },
  compactCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  compactMeta: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  compactTitle: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
  },
  compactDesc: {
    marginTop: 4,
    fontSize: 11,
    color: colors.mutedForeground,
    lineHeight: 18,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: colors.muted,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  categoryTagLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.mutedForeground,
  },
});
