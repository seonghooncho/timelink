import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/layout/Screen';
import { PageHeader } from '../../components/layout/PageHeader';
import { TabBar } from '../../components/common/TabBar';
import { AppButton } from '../../components/common/AppButton';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';
import { PersonAvatar } from '../../components/common/GroupAvatar';
import { colors, radius } from '../../constants/theme';
import { RootStackParamList } from '../../navigation/types';
import { CoordinationDetailResponse, GroupMemberResponse, HeatmapEntry, SlotEntry, coordinationApi, groupApi } from '../../services/api';
import { useSchedules } from '../../hooks/useSchedules';
import { formatDate } from '../../utils/date';
import { getScheduleEnd } from '../../utils/scheduleTime';

type Props = NativeStackScreenProps<RootStackParamList, 'CoordinationTimetable'>;

const TABS = [
  { key: 'select', label: '내가 가능한 시간' },
  { key: 'result', label: '모두 가능한 시간' },
];

const DATE_PAGE_SIZE = 5;
const HOUR_CELL_WIDTH = 46;
const DATE_CELL_WIDTH = 82;
const HEADER_HEIGHT = 38;
const SLOT_HEIGHT = 44;

export function CoordinationTimetableScreen({ navigation, route }: Props) {
  const { groupId, coordId } = route.params;
  const { data: schedules = [] } = useSchedules();
  const [coordination, setCoordination] = useState<CoordinationDetailResponse | null>(null);
  const [members, setMembers] = useState<GroupMemberResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'select' | 'result'>('select');
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [selectedHeatEntry, setSelectedHeatEntry] = useState<HeatmapEntry | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [datePageStart, setDatePageStart] = useState(0);
  const dragSelectModeRef = useRef<boolean | null>(null);
  const dragAppliedSlotsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setIsLoading(true);
    coordinationApi.getById(groupId, coordId)
      .then((data) => {
        setCoordination(data);
        setSelectedSlots(new Set(data.myResponses.map((slot) => `${slot.date}-${slot.hour}`)));
      })
      .catch(() => setCoordination(null))
      .finally(() => setIsLoading(false));
  }, [coordId, groupId]);

  useEffect(() => {
    groupApi.getMembers(groupId)
      .then(setMembers)
      .catch(() => setMembers([]));
  }, [groupId]);

  const totalParticipants = useMemo(() => {
    const users = new Set<string>();
    coordination?.heatmap.forEach((entry) => entry.users.forEach((user) => users.add(user)));
    return Math.max(users.size, 1);
  }, [coordination]);

  const membersByUserId = useMemo(
    () => new Map(members.map((member) => [member.userId, member])),
    [members],
  );

  const applySlot = (date: string, hour: number, shouldSelect: boolean) => {
    const key = `${date}-${hour}`;
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      if (shouldSelect) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const buildPanResponder = (dates: string[], hours: number[]) => PanResponder.create({
    onStartShouldSetPanResponder: () => viewMode === 'select',
    onMoveShouldSetPanResponder: () => viewMode === 'select',
    onPanResponderGrant: (event) => {
      if (viewMode !== 'select') return;
      dragAppliedSlotsRef.current = new Set();
      const slot = locateSlot(event.nativeEvent.locationX, event.nativeEvent.locationY, dates, hours);
      if (!slot) return;
      const key = `${slot.date}-${slot.hour}`;
      const shouldSelect = !selectedSlots.has(key);
      dragSelectModeRef.current = shouldSelect;
      dragAppliedSlotsRef.current.add(key);
      applySlot(slot.date, slot.hour, shouldSelect);
    },
    onPanResponderMove: (event) => {
      if (viewMode !== 'select' || dragSelectModeRef.current === null) return;
      const slot = locateSlot(event.nativeEvent.locationX, event.nativeEvent.locationY, dates, hours);
      if (!slot) return;
      const key = `${slot.date}-${slot.hour}`;
      if (dragAppliedSlotsRef.current.has(key)) return;
      dragAppliedSlotsRef.current.add(key);
      applySlot(slot.date, slot.hour, dragSelectModeRef.current);
    },
    onPanResponderRelease: () => {
      dragSelectModeRef.current = null;
      dragAppliedSlotsRef.current.clear();
    },
    onPanResponderTerminate: () => {
      dragSelectModeRef.current = null;
      dragAppliedSlotsRef.current.clear();
    },
  });

  if (isLoading) {
    return (
      <Screen>
        <PageHeader title="시간 조율" showBack />
        <LoadingState />
      </Screen>
    );
  }

  if (!coordination) {
    return (
      <Screen>
        <PageHeader title="시간 조율" showBack />
        <EmptyState title="조율 정보를 찾을 수 없습니다" />
      </Screen>
    );
  }

  const hours = Array.from({ length: coordination.endHour - coordination.startHour }, (_, index) => coordination.startHour + index);
  const totalDateCount = coordination.dates.length;
  const maxPageStart = Math.max(0, totalDateCount - DATE_PAGE_SIZE);
  const normalizedPageStart = Math.min(datePageStart, maxPageStart);
  const visibleDates = coordination.dates.slice(normalizedPageStart, normalizedPageStart + DATE_PAGE_SIZE);
  const panResponder = buildPanResponder(visibleDates, hours);

  const conflictMap = schedules.reduce<Record<string, string[]>>((map, schedule) => {
    coordination.dates.forEach((date) => {
      if (schedule.startTime.slice(0, 10) !== date) return;
      const start = new Date(schedule.startTime);
      const end = getScheduleEnd(schedule);
      for (let hour = start.getHours(); hour < Math.max(end.getHours(), start.getHours() + 1); hour += 1) {
        const key = `${date}-${hour}`;
        map[key] = [...(map[key] || []), schedule.title];
      }
    });
    return map;
  }, {});

  const heatmapMap = coordination.heatmap.reduce<Record<string, { count: number; users: string[] }>>((map, entry) => {
    map[`${entry.date}-${entry.hour}`] = { count: entry.count, users: entry.users };
    return map;
  }, {});

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const normalizedSlots = Array.from(selectedSlots).map((item) => {
        const parts = item.split('-');
        return {
          date: `${parts[0]}-${parts[1]}-${parts[2]}`,
          hour: Number(parts[3]),
        };
      });

      await coordinationApi.submitResponses(groupId, coordId, normalizedSlots);
      const updated = await coordinationApi.getById(groupId, coordId);
      setCoordination(updated);
      setViewMode('result');
    } catch {
      Alert.alert('제출 실패', '가능 시간 제출에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen>
      <PageHeader title={coordination.title} showBack />
      <TabBar tabs={TABS} activeKey={viewMode} onChange={(value) => setViewMode(value as 'select' | 'result')} />
      <Text style={styles.caption}>
        {viewMode === 'select' ? '가능한 시간을 터치하여 선택하세요.' : '타임블럭 강도는 참여 비율을 나타냅니다.'}
      </Text>

      {totalDateCount > DATE_PAGE_SIZE ? (
        <View style={styles.datePager}>
          <Pressable
            disabled={normalizedPageStart === 0}
            onPress={() => setDatePageStart((prev) => Math.max(0, prev - DATE_PAGE_SIZE))}
            style={[styles.datePagerButton, normalizedPageStart === 0 ? styles.datePagerButtonDisabled : null]}
          >
            <Text style={styles.datePagerText}>이전</Text>
          </Pressable>
          <Text style={styles.datePagerLabel}>
            {normalizedPageStart + visibleDates.length}/{totalDateCount}
          </Text>
          <Pressable
            disabled={normalizedPageStart === maxPageStart}
            onPress={() => setDatePageStart((prev) => Math.min(maxPageStart, prev + DATE_PAGE_SIZE))}
            style={[styles.datePagerButton, normalizedPageStart === maxPageStart ? styles.datePagerButtonDisabled : null]}
          >
            <Text style={styles.datePagerText}>다음</Text>
          </Pressable>
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gridContainer}>
        <View {...(viewMode === 'select' ? panResponder.panHandlers : {})}>
          <View style={styles.headerRow}>
            <View style={styles.cornerCell} />
            {visibleDates.map((date) => (
              <View key={date} style={styles.dateHeader}>
                <Text style={styles.dateHeaderText}>{formatDate(date)}</Text>
              </View>
            ))}
          </View>

          {hours.map((hour) => (
            <View key={hour} style={styles.row}>
              <View style={styles.hourCell}>
                <Text style={styles.hourText}>{hour}:00</Text>
              </View>
              {visibleDates.map((date) => {
                const key = `${date}-${hour}`;
                const heat = heatmapMap[key];
                const selected = selectedSlots.has(key);
                const conflicts = conflictMap[key];
                const ratio = heat ? heat.count / totalParticipants : 0;

                return (
                  <Pressable
                    key={key}
                    onPress={() => {
                      if (heat) {
                        setSelectedHeatEntry({ date, hour, count: heat.count, users: heat.users });
                      }
                    }}
                    style={[
                      styles.slot,
                      viewMode === 'select' && selected ? styles.slotSelected : null,
                      viewMode === 'result' && heat ? getHeatStyle(ratio) : null,
                    ]}
                  >
                    {viewMode === 'select' && conflicts?.length ? <Text numberOfLines={1} style={styles.conflictText}>{conflicts[0]}</Text> : null}
                    {viewMode === 'result' && heat ? <Text style={styles.heatText}>{heat.count}</Text> : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      {viewMode === 'select' ? (
        <View style={styles.footer}>
          <AppButton label={isSubmitting ? '제출 중...' : '제출하기'} onPress={handleSubmit} loading={isSubmitting} />
        </View>
      ) : (
        <View style={styles.footer}>
          <Text style={styles.resultHint}>타임슬롯을 선택하면 투표 인원을 확인할 수 있어요.</Text>
          <AppButton
            label="모임 일정 만들기"
            variant="group"
            onPress={() => navigation.navigate('ScheduleForm', { groupId })}
          />
        </View>
      )}

      <VotersModal
        entry={selectedHeatEntry}
        membersByUserId={membersByUserId}
        onClose={() => setSelectedHeatEntry(null)}
      />
    </Screen>
  );
}

function locateSlot(x: number, y: number, dates: string[], hours: number[]) {
  if (x < HOUR_CELL_WIDTH || y < HEADER_HEIGHT) return null;
  const dateIndex = Math.floor((x - HOUR_CELL_WIDTH) / DATE_CELL_WIDTH);
  const hourIndex = Math.floor((y - HEADER_HEIGHT) / SLOT_HEIGHT);
  const date = dates[dateIndex];
  const hour = hours[hourIndex];
  if (!date || hour === undefined) return null;
  return { date, hour };
}

function VotersModal({
  entry,
  membersByUserId,
  onClose,
}: {
  entry: HeatmapEntry | null;
  membersByUserId: Map<string, GroupMemberResponse>;
  onClose: () => void;
}) {
  return (
    <Modal visible={Boolean(entry)} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.voterSheet}>
          <View style={styles.handle} />
          <Text style={styles.voterTitle}>투표 인원</Text>
          <Text style={styles.voterDesc}>{entry ? `${formatDate(entry.date)} ${entry.hour}:00 선택` : ''}</Text>
          <View style={styles.voterGrid}>
            {(entry?.users ?? []).map((userId) => {
              const member = membersByUserId.get(userId);
              const name = member?.nickname || '알 수 없는 멤버';
              return (
                <View key={userId} style={styles.voterItem}>
                  <PersonAvatar image={member?.avatarUrl} name={name} size={42} />
                  <Text numberOfLines={1} style={styles.voterName}>{name}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function getHeatStyle(ratio: number) {
  if (ratio >= 0.75) {
    return { backgroundColor: colors.coordBlue };
  }
  if (ratio >= 0.5) {
    return { backgroundColor: colors.coordGreen };
  }
  if (ratio > 0) {
    return { backgroundColor: colors.coordGray };
  }
  return undefined;
}

const styles = StyleSheet.create({
  caption: {
    paddingHorizontal: 20,
    paddingTop: 12,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  datePager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 12,
  },
  datePagerButton: {
    borderRadius: 999,
    backgroundColor: colors.muted,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  datePagerButtonDisabled: {
    opacity: 0.35,
  },
  datePagerText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.foreground,
  },
  datePagerLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.mutedForeground,
  },
  gridContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  headerRow: {
    flexDirection: 'row',
  },
  cornerCell: {
    width: 46,
  },
  dateHeader: {
    width: 82,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dateHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.mutedForeground,
  },
  row: {
    flexDirection: 'row',
  },
  hourCell: {
    width: 46,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 8,
  },
  hourText: {
    fontSize: 10,
    color: colors.mutedForeground,
  },
  slot: {
    width: 82,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    margin: 1,
    backgroundColor: colors.card,
    paddingHorizontal: 4,
  },
  slotSelected: {
    backgroundColor: colors.primary + '30',
    borderColor: colors.primary,
  },
  conflictText: {
    fontSize: 9,
    color: colors.categoryTaskStrong,
  },
  heatText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.card,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 18,
    gap: 10,
  },
  resultHint: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(27, 32, 48, 0.24)',
    justifyContent: 'flex-end',
  },
  voterSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: 36,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 18,
  },
  voterTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.foreground,
  },
  voterDesc: {
    marginTop: 4,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  voterGrid: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  voterItem: {
    width: 68,
    alignItems: 'center',
    gap: 8,
  },
  voterName: {
    maxWidth: 68,
    fontSize: 11,
    fontWeight: '700',
    color: colors.foreground,
    textAlign: 'center',
  },
});
