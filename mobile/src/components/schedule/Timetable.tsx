import { useEffect, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { colors, radius, timetable } from '../../constants/theme';
import { Schedule } from '../../types';
import { formatDate, getDayLabel } from '../../utils/date';
import { getCategoryPalette } from '../../utils/category';

interface TimetableProps {
  schedules: Schedule[];
  startDate: Date;
  days: number;
  onSchedulePress: (schedule: Schedule) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function Timetable({ schedules, startDate, days, onSchedulePress, onPrev, onNext }: TimetableProps) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: timetable.defaultVisibleHour * timetable.hourHeight, animated: false });
  }, [startDate]);

  const dayDates = useMemo(
    () => Array.from({ length: days }, (_, index) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + index);
      return date;
    }),
    [days, startDate],
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={onPrev} style={styles.arrowButton}>
          <ChevronLeft color={colors.mutedForeground} size={18} />
        </Pressable>
        <View style={styles.headerDays}>
          {dayDates.map((date) => (
            <View key={date.toISOString()} style={styles.headerDay}>
              <Text style={styles.headerDayText}>{formatDate(date)}</Text>
              <Text style={styles.headerDayLabel}>{getDayLabel(date)}</Text>
            </View>
          ))}
        </View>
        <Pressable onPress={onNext} style={styles.arrowButton}>
          <ChevronRight color={colors.mutedForeground} size={18} />
        </Pressable>
      </View>

      <ScrollView ref={scrollRef} style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          <View style={styles.timeColumn}>
            {Array.from({ length: timetable.hourEnd - timetable.hourStart }, (_, index) => (
              <View key={index} style={styles.hourCell}>
                <Text style={styles.hourText}>{index}:00</Text>
              </View>
            ))}
          </View>

          {dayDates.map((date) => (
            <View key={date.toISOString()} style={styles.dayColumn}>
              {Array.from({ length: timetable.hourEnd - timetable.hourStart }, (_, index) => (
                <View key={index} style={styles.hourLine} />
              ))}
              {schedules
                .filter((schedule) => schedule.startTime.slice(0, 10) === toIsoDate(date))
                .map((schedule) => {
                  const palette = getCategoryPalette(schedule.isImportant ? 'important' : schedule.category);
                  const start = new Date(schedule.startTime);
                  const end = new Date(schedule.endTime);
                  const startHour = start.getHours() + start.getMinutes() / 60;
                  const endHour = end.getHours() + end.getMinutes() / 60;
                  const top = startHour * timetable.hourHeight;
                  const height = Math.max((endHour - startHour) * timetable.hourHeight, 28);

                  return (
                    <Pressable
                      key={schedule.id}
                      onPress={() => onSchedulePress(schedule)}
                      style={[
                        styles.block,
                        {
                          top,
                          height,
                          backgroundColor: palette.bg,
                          borderColor: palette.solid,
                        },
                      ]}
                    >
                      <Text numberOfLines={1} style={[styles.blockTitle, { color: palette.fg }]}>
                        {schedule.title}
                      </Text>
                      <Text style={[styles.blockTime, { color: palette.fg }]}>{start.getHours()}:{String(start.getMinutes()).padStart(2, '0')}</Text>
                    </Pressable>
                  );
                })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  arrowButton: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerDays: {
    flex: 1,
    flexDirection: 'row',
  },
  headerDay: {
    flex: 1,
    alignItems: 'center',
  },
  headerDayText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.foreground,
  },
  headerDayLabel: {
    fontSize: 10,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  scroll: {
    maxHeight: 420,
  },
  grid: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  timeColumn: {
    width: 40,
  },
  hourCell: {
    height: timetable.hourHeight,
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  hourText: {
    fontSize: 10,
    color: colors.mutedForeground,
    textAlign: 'right',
    paddingRight: 6,
  },
  dayColumn: {
    flex: 1,
    minHeight: timetable.hourHeight * (timetable.hourEnd - timetable.hourStart),
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    position: 'relative',
  },
  hourLine: {
    height: timetable.hourHeight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  block: {
    position: 'absolute',
    left: 4,
    right: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  blockTitle: {
    fontSize: 10,
    fontWeight: '700',
  },
  blockTime: {
    marginTop: 2,
    fontSize: 9,
  },
});
