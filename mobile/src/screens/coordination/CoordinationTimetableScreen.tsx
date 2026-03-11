import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/layout/Screen';
import { PageHeader } from '../../components/layout/PageHeader';
import { TabBar } from '../../components/common/TabBar';
import { AppButton } from '../../components/common/AppButton';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';
import { colors, radius } from '../../constants/theme';
import { RootStackParamList } from '../../navigation/types';
import { CoordinationDetailResponse, SlotEntry, coordinationApi } from '../../services/api';
import { useSchedules } from '../../hooks/useSchedules';
import { formatDate } from '../../utils/date';

type Props = NativeStackScreenProps<RootStackParamList, 'CoordinationTimetable'>;

const TABS = [
  { key: 'select', label: '내가 가능한 시간' },
  { key: 'result', label: '모두 가능한 시간' },
];

export function CoordinationTimetableScreen({ route }: Props) {
  const { groupId, coordId } = route.params;
  const { data: schedules = [] } = useSchedules();
  const [coordination, setCoordination] = useState<CoordinationDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'select' | 'result'>('select');
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const totalParticipants = useMemo(() => {
    const users = new Set<string>();
    coordination?.heatmap.forEach((entry) => entry.users.forEach((user) => users.add(user)));
    return Math.max(users.size, 1);
  }, [coordination]);

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

  const conflictMap = schedules.reduce<Record<string, string[]>>((map, schedule) => {
    coordination.dates.forEach((date) => {
      if (schedule.startTime.slice(0, 10) !== date) return;
      const start = new Date(schedule.startTime);
      const end = new Date(schedule.endTime);
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

  const toggleSlot = (date: string, hour: number) => {
    const key = `${date}-${hour}`;
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const slots: SlotEntry[] = Array.from(selectedSlots).map((item) => {
        const [date, hour] = item.split('-');
        return {
          date: `${date}-${hour}`,
          hour: Number(item.split('-').pop()),
        };
      });

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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gridContainer}>
        <View>
          <View style={styles.headerRow}>
            <View style={styles.cornerCell} />
            {coordination.dates.map((date) => (
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
              {coordination.dates.map((date) => {
                const key = `${date}-${hour}`;
                const heat = heatmapMap[key];
                const selected = selectedSlots.has(key);
                const conflicts = conflictMap[key];
                const ratio = heat ? heat.count / totalParticipants : 0;

                return (
                  <Pressable
                    key={key}
                    onPress={() => viewMode === 'select' ? toggleSlot(date, hour) : undefined}
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
      ) : null}
    </Screen>
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
  },
});
