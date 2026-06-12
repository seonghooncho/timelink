import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/layout/Screen';
import { PageHeader } from '../../components/layout/PageHeader';
import { TabBar } from '../../components/common/TabBar';
import { CategoryBadge } from '../../components/common/CategoryBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';
import { colors, radius } from '../../constants/theme';
import { NotificationResponse, notificationApi } from '../../services/api';
import { timeAgoLabel } from '../../utils/date';

const TABS = [
  { key: 'schedule', label: '일정 알림' },
  { key: 'group', label: '그룹 알림' },
];

export function NotificationsScreen() {
  const [tab, setTab] = useState('schedule');
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    notificationApi.getAll({ type: tab })
      .then(setNotifications)
      .catch(() => setNotifications([]))
      .finally(() => setIsLoading(false));
  }, [tab]);

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
              onPress={() => {
                if (!item.isRead) {
                  notificationApi.markRead(item.id).then(() => {
                    setNotifications((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, isRead: true } : entry));
                  }).catch(() => undefined);
                }
              }}
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
});
