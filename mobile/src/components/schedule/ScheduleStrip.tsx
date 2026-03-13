import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../../constants/theme';
import { Schedule } from '../../types';
import { formatTime, relativeDateLabel } from '../../utils/date';
import { getCategoryPalette } from '../../utils/category';

interface ScheduleGroup {
  date: string;
  schedules: Schedule[];
}

interface ScheduleStripProps {
  schedules: Schedule[];
  onSchedulePress: (schedule: Schedule) => void;
}

export function ScheduleStrip({ schedules, onSchedulePress }: ScheduleStripProps) {
  const groups = groupSchedules(schedules);

  if (groups.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>일정이 없어요</Text>
        <Text style={styles.emptyDesc}>+ 버튼을 눌러 일정을 추가해 보세요</Text>
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      {groups.map((group, index) => (
        <View key={group.date} style={[styles.group, index < groups.length - 1 ? styles.groupSeparator : null]}>
          <Text style={styles.groupLabel}>{relativeDateLabel(group.date)}</Text>
          <View style={styles.groupCards}>
            {group.schedules.map((schedule) => {
              const palette = getCategoryPalette(schedule.isImportant ? 'important' : schedule.category);
              return (
                <Pressable
                  key={schedule.id}
                  onPress={() => onSchedulePress(schedule)}
                  style={[styles.card, { borderColor: palette.bg }]}
                >
                  <View style={[styles.cardDot, { backgroundColor: palette.solid }]} />
                  <Text numberOfLines={1} style={styles.cardTitle}>{schedule.title}</Text>
                  <Text style={styles.cardTime}>{formatTime(schedule.startTime)}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function groupSchedules(schedules: Schedule[]) {
  const upcoming = schedules
    .filter((schedule) => !schedule.isCompleted)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return upcoming.reduce<ScheduleGroup[]>((groups, schedule) => {
    const date = schedule.startTime.slice(0, 10);
    const existing = groups.find((item) => item.date === date);
    if (existing) {
      existing.schedules.push(schedule);
    } else {
      groups.push({ date, schedules: [schedule] });
    }
    return groups;
  }, []);
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
  },
  emptyDesc: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  group: {
    paddingRight: 12,
  },
  groupSeparator: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  groupLabel: {
    marginBottom: 8,
    fontSize: 11,
    fontWeight: '700',
    color: colors.mutedForeground,
  },
  groupCards: {
    flexDirection: 'row',
    gap: 8,
  },
  card: {
    minWidth: 132,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 6,
  },
  cardDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.foreground,
  },
  cardTime: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
});
