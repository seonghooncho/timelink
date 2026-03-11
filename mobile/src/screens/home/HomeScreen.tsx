import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Bell } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/layout/Screen';
import { BrandMark } from '../../components/common/BrandMark';
import { FloatingAddButton } from '../../components/common/FloatingAddButton';
import { ScheduleStrip } from '../../components/schedule/ScheduleStrip';
import { ScheduleDetailSheet } from '../../components/schedule/ScheduleDetailSheet';
import { Timetable } from '../../components/schedule/Timetable';
import { colors } from '../../constants/theme';
import { RootStackParamList } from '../../navigation/types';
import { useSchedules, useDeleteSchedule } from '../../hooks/useSchedules';
import { Schedule } from '../../types';
import { getDayLabel } from '../../utils/date';

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: schedules = [] } = useSchedules();
  const deleteMutation = useDeleteSchedule();
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [timetableStart, setTimetableStart] = useState(new Date());

  const today = new Date();

  const handleDelete = (schedule: Schedule) => {
    Alert.alert('일정을 완료하였습니다.', '일정을 삭제하시겠습니까?', [
      { text: '유지', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          deleteMutation.mutate(schedule.id);
          setSelectedSchedule(null);
        },
      },
    ]);
  };

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.todayLabel}>TODAY</Text>
          <Text style={styles.todayValue}>
            {today.getMonth() + 1}.{String(today.getDate()).padStart(2, '0')}
            <Text style={styles.dayLabel}> ({getDayLabel(today)})</Text>
          </Text>
        </View>
        <Pressable onPress={() => navigation.navigate('Notifications')} style={styles.iconButton}>
          <Bell color={colors.mutedForeground} size={20} />
        </Pressable>
      </View>

      <View style={{ paddingTop: 8 }}>
        {schedules.length === 0 ? (
          <View style={styles.emptyHero}>
            <BrandMark size="md" />
            <Text style={styles.emptyTitle}>일정이 없어요</Text>
            <Text style={styles.emptyDesc}>+ 버튼을 눌러 일정을 추가해 보세요</Text>
          </View>
        ) : (
          <ScheduleStrip schedules={schedules} onSchedulePress={setSelectedSchedule} />
        )}
      </View>

      <Timetable
        schedules={schedules}
        startDate={timetableStart}
        days={4}
        onSchedulePress={setSelectedSchedule}
        onPrev={() => {
          const next = new Date(timetableStart);
          next.setDate(next.getDate() - 3);
          setTimetableStart(next);
        }}
        onNext={() => {
          const next = new Date(timetableStart);
          next.setDate(next.getDate() + 3);
          setTimetableStart(next);
        }}
      />

      <FloatingAddButton onPress={() => navigation.navigate('ScheduleForm', undefined)} />

      <ScheduleDetailSheet
        schedule={selectedSchedule}
        open={Boolean(selectedSchedule)}
        onClose={() => setSelectedSchedule(null)}
        onDelete={handleDelete}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  todayLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.mutedForeground,
    letterSpacing: 1,
  },
  todayValue: {
    marginTop: 2,
    fontSize: 20,
    fontWeight: '700',
    color: colors.foreground,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.mutedForeground,
  },
  iconButton: {
    padding: 10,
    borderRadius: 14,
  },
  emptyHero: {
    paddingVertical: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
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
});
