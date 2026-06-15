import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/layout/Screen';
import { PageHeader } from '../../components/layout/PageHeader';
import { TabBar } from '../../components/common/TabBar';
import { CategoryBadge } from '../../components/common/CategoryBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';
import { colors, radius } from '../../constants/theme';
import { NotificationResponse, notificationApi } from '../../services/api';
import { timeAgoLabel } from '../../utils/date';
import { RootStackParamList } from '../../navigation/types';
import { MobileNavigationTarget, resolveNotificationTarget } from '../../navigation/navigationTargets';

const TABS = [
  { key: 'schedule', label: '일정 알림' },
  { key: 'group', label: '모임 알림' },
];
const NOTIFICATION_PAGE_LIMIT = 20;

function navigateToTarget(navigation: NativeStackNavigationProp<RootStackParamList>, target: MobileNavigationTarget) {
  switch (target.screen) {
    case 'MainTabs':
      navigation.navigate('MainTabs', target.params);
      return;
    case 'Notifications':
      navigation.navigate('Notifications');
      return;
    case 'GroupDetail':
      navigation.navigate('GroupDetail', target.params);
      return;
    case 'GroupIntro':
      navigation.navigate('GroupIntro', target.params);
      return;
    case 'GroupJoin':
      navigation.navigate('GroupJoin', target.params);
      return;
    case 'CommunityPostDetail':
      navigation.navigate('CommunityPostDetail', target.params);
      return;
    case 'CoordinationTimetable':
      navigation.navigate('CoordinationTimetable', target.params);
      return;
    case 'ScheduleForm':
      navigation.navigate('ScheduleForm', target.params);
      return;
    case 'GroupForm':
      navigation.navigate('GroupForm');
      return;
  }
}

export function NotificationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [tab, setTab] = useState('schedule');
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const loadNotifications = useCallback((cursor?: string | null) => {
    if (cursor) {
      setIsFetchingMore(true);
    } else {
      setIsLoading(true);
    }

    notificationApi.getPage({ type: tab, limit: NOTIFICATION_PAGE_LIMIT, cursor })
      .then((page) => {
        setNotifications((prev) => cursor ? [...prev, ...page.data] : page.data);
        setNextCursor(page.meta?.nextCursor ?? null);
      })
      .catch(() => {
        if (!cursor) {
          setNotifications([]);
          setNextCursor(null);
        }
      })
      .finally(() => {
        setIsLoading(false);
        setIsFetchingMore(false);
      });
  }, [tab]);

  useEffect(() => {
    setNotifications([]);
    setNextCursor(null);
    loadNotifications(null);
  }, [loadNotifications]);

  const handleNotificationPress = (item: NotificationResponse) => {
    const target = resolveNotificationTarget(item);
    const go = () => navigateToTarget(navigation, target);

    if (item.isRead) {
      go();
      return;
    }

    notificationApi.markRead(item.id).then(() => {
      setNotifications((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, isRead: true } : entry));
      go();
    }).catch(() => undefined);
  };

  return (
    <Screen>
      <PageHeader title="알림" showBack />
      <TabBar tabs={TABS} activeKey={tab} onChange={setTab} />

      <View style={styles.list}>
        {isLoading ? (
          <LoadingState />
        ) : notifications.length === 0 ? (
          <EmptyState title="알림이 없습니다" />
        ) : (
          notifications.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => handleNotificationPress(item)}
              style={[styles.card, !item.isRead ? styles.unreadCard : null]}
            >
              <View style={{ flex: 1 }}>
                <View style={styles.badgeRow}>
                  {item.category ? <CategoryBadge category={item.category as 'task' | 'appointment' | 'group' | 'repeat' | 'important'} /> : null}
                  {item.isImportant ? <CategoryBadge category="important" /> : null}
                </View>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.content}>{item.content}</Text>
              </View>
              <View style={styles.trailing}>
                <Text style={styles.time}>{timeAgoLabel(item.createdAt)}</Text>
                {!item.isRead ? <View style={styles.dot} /> : null}
              </View>
            </Pressable>
          ))
        )}
        {!isLoading && nextCursor ? (
          <Pressable
            onPress={() => loadNotifications(nextCursor)}
            disabled={isFetchingMore}
            style={[styles.moreButton, isFetchingMore ? styles.moreButtonDisabled : null]}
          >
            <Text style={styles.moreButtonText}>{isFetchingMore ? '불러오는 중...' : '알림 더보기'}</Text>
          </Pressable>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    gap: 14,
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
  },
  content: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: colors.mutedForeground,
  },
  trailing: {
    alignItems: 'flex-end',
    gap: 8,
  },
  time: {
    fontSize: 10,
    color: colors.mutedForeground,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  moreButton: {
    minHeight: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButtonDisabled: {
    opacity: 0.55,
  },
  moreButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.mutedForeground,
  },
});
