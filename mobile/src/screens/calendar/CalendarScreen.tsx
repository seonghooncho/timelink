import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { PageHeader } from '../../components/layout/PageHeader';
import { ScheduleDetailSheet } from '../../components/schedule/ScheduleDetailSheet';
import { CategoryBadge } from '../../components/common/CategoryBadge';
import { colors, radius } from '../../constants/theme';
import { useSchedules } from '../../hooks/useSchedules';
import { Schedule } from '../../types';
import { formatTime } from '../../utils/date';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function CalendarScreen() {
  const { data: schedules = [] } = useSchedules();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());
  const [detailSchedule, setDetailSchedule] = useState<Schedule | null>(null);

  const today = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays = useMemo(() => {
    const list: Array<number | null> = [];
    for (let i = 0; i < firstDay; i += 1) list.push(null);
    for (let i = 1; i <= daysInMonth; i += 1) list.push(i);
    return list;
  }, [daysInMonth, firstDay]);

  const selectedSchedules = selectedDay
    ? schedules.filter((schedule) => schedule.startTime.slice(0, 10) === `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`)
    : [];

  return (
    <Screen>
      <PageHeader title="캘린더" />

      <View style={styles.monthRow}>
        <Pressable onPress={() => setCurrentDate(new Date(year, month - 1, 1))} style={styles.arrowButton}>
          <ChevronLeft color={colors.mutedForeground} size={20} />
        </Pressable>
        <Text style={styles.monthLabel}>{year}년 {month + 1}월</Text>
        <Pressable onPress={() => setCurrentDate(new Date(year, month + 1, 1))} style={styles.arrowButton}>
          <ChevronRight color={colors.mutedForeground} size={20} />
        </Pressable>
      </View>

      <View style={styles.calendar}>
        <View style={styles.weekdays}>
          {DAYS.map((day) => <Text key={day} style={styles.weekday}>{day}</Text>)}
        </View>
        <View style={styles.grid}>
          {calendarDays.map((day, index) => {
            if (day == null) {
              return <View key={`blank-${index}`} style={styles.blankCell} />;
            }
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const isSelected = day === selectedDay;
            const daySchedules = schedules.filter((schedule) => schedule.startTime.slice(0, 10) === `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);

            return (
              <Pressable
                key={day}
                onPress={() => setSelectedDay(day)}
                style={[styles.dayCell, isSelected ? styles.dayCellSelected : null]}
              >
                <View style={[styles.dayNumber, isToday ? styles.todayBadge : null]}>
                  <Text style={[styles.dayNumberText, isToday ? styles.todayText : null]}>{day}</Text>
                </View>
                <View style={styles.dayDots}>
                  {daySchedules.slice(0, 2).map((schedule) => (
                    <View key={schedule.id} style={[styles.dayDot, { backgroundColor: schedule.isImportant ? colors.categoryImportant : schedule.category === 'group' ? colors.categoryGroup : schedule.category === 'repeat' ? colors.categoryRepeat : schedule.category === 'appointment' ? colors.categoryAppointment : colors.categoryTask }]} />
                  ))}
                  {daySchedules.length > 2 ? <Text style={styles.moreText}>+{daySchedules.length - 2}</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.scheduleSection}>
        <Text style={styles.sectionTitle}>{month + 1}월 {selectedDay}일 일정</Text>
        {selectedSchedules.length === 0 ? (
          <Text style={styles.emptyLabel}>일정이 없습니다</Text>
        ) : (
          selectedSchedules.map((schedule) => (
            <Pressable key={schedule.id} onPress={() => setDetailSchedule(schedule)} style={styles.scheduleRow}>
              <View style={[styles.scheduleColor, { backgroundColor: schedule.isImportant ? colors.categoryImportant : schedule.category === 'group' ? colors.categoryGroup : schedule.category === 'repeat' ? colors.categoryRepeat : schedule.category === 'appointment' ? colors.categoryAppointment : colors.categoryTask }]} />
              <View style={{ flex: 1 }}>
                <View style={styles.badges}>
                  <CategoryBadge category={schedule.category} />
                  {schedule.isImportant ? <CategoryBadge category="important" /> : null}
                </View>
                <Text style={styles.scheduleTitle}>{schedule.title}</Text>
                <Text style={styles.scheduleTime}>{formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}</Text>
              </View>
            </Pressable>
          ))
        )}
      </View>

      <ScheduleDetailSheet schedule={detailSchedule} open={Boolean(detailSchedule)} onClose={() => setDetailSchedule(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  arrowButton: {
    padding: 8,
  },
  monthLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.foreground,
  },
  calendar: {
    paddingHorizontal: 12,
  },
  weekdays: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    color: colors.mutedForeground,
    paddingVertical: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  blankCell: {
    width: '14.285%',
    aspectRatio: 1,
  },
  dayCell: {
    width: '14.285%',
    aspectRatio: 1,
    alignItems: 'center',
    paddingTop: 6,
    borderRadius: radius.md,
  },
  dayCellSelected: {
    backgroundColor: colors.primary + '12',
  },
  dayNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBadge: {
    backgroundColor: colors.primary,
  },
  dayNumberText: {
    fontSize: 12,
    color: colors.foreground,
    fontWeight: '600',
  },
  todayText: {
    color: colors.card,
  },
  dayDots: {
    marginTop: 4,
    alignItems: 'center',
    gap: 2,
    minHeight: 14,
  },
  dayDot: {
    width: 20,
    height: 4,
    borderRadius: 999,
  },
  moreText: {
    fontSize: 8,
    color: colors.mutedForeground,
  },
  scheduleSection: {
    marginTop: 18,
    paddingHorizontal: 20,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
  },
  emptyLabel: {
    paddingVertical: 20,
    textAlign: 'center',
    fontSize: 12,
    color: colors.mutedForeground,
  },
  scheduleRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scheduleColor: {
    width: 4,
    borderRadius: 999,
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  scheduleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
  },
  scheduleTime: {
    marginTop: 2,
    fontSize: 11,
    color: colors.mutedForeground,
  },
});
