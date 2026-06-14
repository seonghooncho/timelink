import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Bell, CalendarDays, ChevronRight, Plus, Search, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/layout/Screen';
import { PageHeader } from '../../components/layout/PageHeader';
import { AppTextInput } from '../../components/common/AppTextInput';
import { GroupAvatar } from '../../components/common/GroupAvatar';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';
import { TabBar } from '../../components/common/TabBar';
import { colors, shadows } from '../../constants/theme';
import { RootStackParamList } from '../../navigation/types';
import { useGroups, usePublicGroups } from '../../hooks/useGroups';
import { Group } from '../../types';
import { formatDate } from '../../utils/date';

const TABS = [
  { key: 'mine', label: '내 모임' },
  { key: 'browse', label: '둘러보기' },
];

export function GroupsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [tab, setTab] = useState('mine');
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { data: groups = [], isLoading } = useGroups();
  const { data: publicGroups = [], isLoading: publicLoading } = usePublicGroups(query);

  const visibleGroups = useMemo(() => (
    tab === 'mine' ? groups : publicGroups
  ), [groups, publicGroups, tab]);

  return (
    <Screen>
      <PageHeader
        title="모임"
        rightElement={(
          <Pressable onPress={() => navigation.navigate('Notifications')} style={styles.notificationButton}>
            <Bell color={colors.mutedForeground} size={20} />
          </Pressable>
        )}
      />
      <TabBar tabs={TABS} activeKey={tab} onChange={setTab} />

      {tab === 'browse' ? (
        <View style={styles.searchRow}>
          {searchOpen ? (
            <>
              <AppTextInput value={query} onChangeText={setQuery} placeholder="모임 검색" style={styles.searchInput} />
              <Pressable onPress={() => { setSearchOpen(false); setQuery(''); }} style={styles.searchIconButton}>
                <X color={colors.mutedForeground} size={18} />
              </Pressable>
            </>
          ) : (
            <Pressable onPress={() => setSearchOpen(true)} style={styles.searchButton}>
              <Search color={colors.primary} size={16} />
              <Text style={styles.searchButtonLabel}>모임 검색</Text>
            </Pressable>
          )}
        </View>
      ) : null}

      <View style={styles.list}>
        {(tab === 'mine' ? isLoading : publicLoading) ? (
          <LoadingState />
        ) : visibleGroups.length === 0 ? (
          tab === 'mine' ? (
            <EmptyState title="아직 모임이 없습니다" description="새 모임을 만들거나 공개 모임을 둘러보세요" />
          ) : (
            <EmptyState title="둘러볼 공개 모임이 없습니다" description="다른 검색어로 찾아보세요" />
          )
        ) : visibleGroups.map((group) => (
          <GroupRow
            key={group.id}
            group={group}
            mode={tab as 'mine' | 'browse'}
            onPress={() => {
              if (tab === 'mine') navigation.navigate('GroupDetail', { id: group.id });
              else navigation.navigate('GroupIntro', { id: group.id });
            }}
          />
        ))}

        {tab === 'mine' && groups.length > 0 ? (
          <Pressable onPress={() => setTab('browse')} style={styles.moreBrowse}>
            <Text style={styles.moreBrowseText}>더 둘러보기</Text>
            <ChevronRight color={colors.primary} size={16} />
          </Pressable>
        ) : null}
      </View>

      <Pressable onPress={() => navigation.navigate('GroupForm')} style={styles.createButton}>
        <Plus color={colors.primaryForeground} size={22} strokeWidth={2.6} />
      </Pressable>
    </Screen>
  );
}

function GroupRow({ group, mode, onPress }: { group: Group; mode: 'mine' | 'browse'; onPress: () => void }) {
  const nextSchedule = group.nextSchedule;
  const hasMoreSchedules = (group.upcomingScheduleCount || 0) > 1;
  const summary = nextSchedule
    ? `${nextSchedule.title}${hasMoreSchedules ? ' +' : ''} · ${formatDate(nextSchedule.startTime)}`
    : group.activeCoordination
      ? `시간 조율 · ${group.activeCoordination.title}`
      : group.description;

  return (
    <Pressable onPress={onPress} style={styles.row}>
      <GroupAvatar image={group.imageUrl} thumbnail={group.thumbnailUrl} name={group.name} size="sm" />
      <View style={styles.rowBody}>
        <View style={styles.rowTitleLine}>
          <Text numberOfLines={1} style={styles.name}>{group.name}</Text>
          {mode === 'mine' && group.visibility === 'PUBLIC' ? (
            <Text style={styles.publicBadge}>공개</Text>
          ) : null}
        </View>
        <View style={styles.metaLine}>
          <Text numberOfLines={1} style={styles.meta}>멤버 {group.memberCount}명</Text>
          {nextSchedule ? <CalendarDays size={12} color={colors.categoryGroup} /> : null}
        </View>
        {summary ? <Text numberOfLines={1} style={styles.summary}>{summary}</Text> : null}
      </View>
      <ChevronRight color={colors.mutedForeground} size={16} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  notificationButton: {
    padding: 8,
  },
  searchRow: {
    paddingHorizontal: 20,
    paddingTop: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchInput: {
    minHeight: 42,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    backgroundColor: colors.primary + '10',
    paddingHorizontal: 12,
    minHeight: 38,
  },
  searchButtonLabel: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  searchIconButton: {
    padding: 10,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  name: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '900',
    color: colors.foreground,
  },
  publicBadge: {
    borderRadius: 999,
    backgroundColor: colors.primary + '12',
    color: colors.primary,
    paddingHorizontal: 7,
    paddingVertical: 2,
    fontSize: 10,
    fontWeight: '800',
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  meta: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  summary: {
    fontSize: 12,
    color: colors.foreground,
  },
  moreBrowse: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 42,
  },
  moreBrowseText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  createButton: {
    position: 'absolute',
    right: 20,
    bottom: 96,
    width: 54,
    height: 54,
    borderRadius: 19,
    backgroundColor: colors.categoryGroup,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
});
