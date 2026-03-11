import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/layout/Screen';
import { PageHeader } from '../../components/layout/PageHeader';
import { TabBar } from '../../components/common/TabBar';
import { AppButton } from '../../components/common/AppButton';
import { AppTextInput } from '../../components/common/AppTextInput';
import { PersonAvatar } from '../../components/common/GroupAvatar';
import { colors, radius } from '../../constants/theme';
import { RootStackParamList } from '../../navigation/types';
import { coordinationApi, groupApi } from '../../services/api';
import { GroupMember } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'TimeCoordination'>;

const TABS = [
  { key: 'once', label: '한 번만' },
  { key: 'repeat', label: '반복' },
];

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function TimeCoordinationScreen({ navigation, route }: Props) {
  const { groupId } = route.params;
  const [tab, setTab] = useState('once');
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [title, setTitle] = useState('');
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(18);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    groupApi.getMembers(groupId)
      .then((items) => {
        setMembers(items);
        setSelectedMembers(new Set(items.map((item) => item.id)));
      })
      .catch(() => setMembers([]));
  }, [groupId]);

  const calendarDates = useMemo(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    return Array.from({ length: 35 }, (_, index) => {
      const value = new Date(startDate);
      value.setDate(startDate.getDate() + index);
      return value;
    });
  }, []);

  const toggleDate = (dateKey: string) => {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  };

  const toggleDay = (dayIndex: number) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayIndex)) next.delete(dayIndex);
      else next.add(dayIndex);
      return next;
    });
  };

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  const handleCreate = async () => {
    try {
      setIsCreating(true);
      const dates = tab === 'once'
        ? Array.from(selectedDates).sort()
        : buildRepeatDates(selectedDays);

      const created = await coordinationApi.create(groupId, {
        title,
        mode: tab === 'once' ? 'once' : 'repeat',
        dates,
        startHour,
        endHour,
      });

      navigation.replace('CoordinationTimetable', { groupId, coordId: created.id });
    } catch {
      Alert.alert('생성 실패', '조율 생성에 실패했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Screen>
      <PageHeader title="시간 조율하기" showBack />
      <TabBar tabs={TABS} activeKey={tab} onChange={setTab} />

      <View style={styles.content}>
        <AppTextInput value={title} onChangeText={setTitle} placeholder="제목" />

        {members.length > 0 ? (
          <View>
            <Text style={styles.sectionLabel}>함께 확인할 멤버</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.memberScroll}>
              {members.map((member) => {
                const selected = selectedMembers.has(member.id);
                return (
                  <Pressable key={member.id} onPress={() => toggleMember(member.id)} style={[styles.memberChip, selected ? styles.memberChipActive : null]}>
                    <PersonAvatar image={member.avatarUrl} name={member.nickname || member.userId} size={34} />
                    <Text numberOfLines={1} style={[styles.memberName, selected ? styles.memberNameActive : null]}>{member.nickname || member.userId}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {tab === 'once' ? (
          <View>
            <Text style={styles.sectionLabel}>며칠에 만날까요?</Text>
            <View style={styles.weekdayRow}>
              {DAYS.map((day) => <Text key={day} style={styles.weekday}>{day}</Text>)}
            </View>
            <View style={styles.dateGrid}>
              {calendarDates.map((date) => {
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                const selected = selectedDates.has(key);
                return (
                  <Pressable key={key} onPress={() => toggleDate(key)} style={[styles.dateCell, selected ? styles.dateCellActive : null]}>
                    <Text style={[styles.dateCellLabel, selected ? styles.dateCellLabelActive : null]}>{date.getDate()}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : (
          <View>
            <Text style={styles.sectionLabel}>무슨 요일에 만날까요?</Text>
            <View style={styles.dayChipRow}>
              {DAYS.map((day, index) => {
                const selected = selectedDays.has(index);
                return (
                  <Pressable key={day} onPress={() => toggleDay(index)} style={[styles.dayChip, selected ? styles.dayChipActive : null]}>
                    <Text style={[styles.dayChipLabel, selected ? styles.dayChipLabelActive : null]}>{day}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <View>
          <Text style={styles.sectionLabel}>몇시에 만날까요?</Text>
          <View style={styles.hourRow}>
            <AppTextInput value={String(startHour)} onChangeText={(value) => setStartHour(Number(value) || 0)} placeholder="9" keyboardType="number-pad" style={styles.hourInput} />
            <Text style={styles.hourTilde}>~</Text>
            <AppTextInput value={String(endHour)} onChangeText={(value) => setEndHour(Number(value) || 0)} placeholder="18" keyboardType="number-pad" style={styles.hourInput} />
          </View>
        </View>

        <AppButton
          label={isCreating ? '생성 중...' : '생성하기'}
          onPress={handleCreate}
          loading={isCreating}
          disabled={!title.trim() || (tab === 'once' ? selectedDates.size === 0 : selectedDays.size === 0)}
        />
      </View>
    </Screen>
  );
}

function buildRepeatDates(selectedDays: Set<number>) {
  const dates: string[] = [];
  const today = new Date();

  for (let week = 0; week < 4; week += 1) {
    selectedDays.forEach((dayIndex) => {
      const date = new Date(today);
      const diff = (dayIndex - today.getDay() + 7) % 7 + week * 7;
      date.setDate(today.getDate() + diff);
      dates.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);
    });
  }

  return dates.sort();
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 18,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 10,
  },
  memberScroll: {
    gap: 10,
  },
  memberChip: {
    width: 88,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    padding: 10,
    gap: 8,
  },
  memberChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  memberName: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  memberNameActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  weekdayRow: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    color: colors.mutedForeground,
    marginBottom: 8,
  },
  dateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dateCell: {
    width: '13.2%',
    aspectRatio: 1,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCellActive: {
    backgroundColor: colors.foreground,
  },
  dateCellLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.foreground,
  },
  dateCellLabelActive: {
    color: colors.card,
  },
  dayChipRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  dayChip: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.muted,
  },
  dayChipActive: {
    backgroundColor: colors.foreground,
  },
  dayChipLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.mutedForeground,
  },
  dayChipLabelActive: {
    color: colors.card,
  },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hourInput: {
    textAlign: 'center',
  },
  hourTilde: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.mutedForeground,
  },
});
