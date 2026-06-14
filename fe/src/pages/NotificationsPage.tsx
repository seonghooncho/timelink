import React, { useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '@/components/layout/MobileLayout';
import PageHeader from '@/components/layout/PageHeader';
import TabBar from '@/components/common/TabBar';
import CategoryBadge from '@/components/common/CategoryBadge';
import { ListSkeleton } from '@/components/common/LoadingStates';
import { notificationApi, NotificationResponse } from '@/services/api';
import { ScheduleCategory } from '@/types/types';
import { appToast } from '@/lib/appToast';

const TABS = [
  { key: 'schedule', label: '일정 알림' },
  { key: 'group', label: '모임 알림' },
];
const NOTIFICATION_PAGE_LIMIT = 20;

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('schedule');
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const loadNotifications = useCallback(async (cursor?: string | null) => {
    if (cursor) {
      setIsFetchingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const page = await notificationApi.getPage({
        type: tab,
        limit: NOTIFICATION_PAGE_LIMIT,
        cursor,
      });
      setNotifications(prev => cursor ? [...prev, ...page.data] : page.data);
      setNextCursor(page.meta?.nextCursor ?? null);
    } catch (error) {
      if (!cursor) {
        setNotifications([]);
      }
      appToast.error('알림을 불러오지 못했습니다', error);
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  }, [tab]);

  useEffect(() => {
    setNotifications([]);
    setNextCursor(null);
    loadNotifications(null);
  }, [loadNotifications]);

  const handleNotificationClick = (notification: NotificationResponse) => {
    const afterRead = () => {
      if (notification.targetUrl) {
        navigate(notification.targetUrl);
      }
    };

    if (notification.isRead) {
      afterRead();
      return;
    }

    notificationApi.markRead(notification.id).then(() => {
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n));
      afterRead();
    }).catch((error) => {
      appToast.error('알림 읽음 처리에 실패했습니다', error);
    });
  };

  const formatTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    return `${Math.floor(hours / 24)}일 전`;
  };

  return (
    <MobileLayout>
      <PageHeader title="알림" showBack backTo="/mypage" />
      <TabBar tabs={TABS} activeKey={tab} onChange={setTab} />

      <div className="px-5 py-3 space-y-2.5">
        {isLoading ? (
          <ListSkeleton count={4} showAvatar={false} className="border-none" itemClassName="rounded-2xl border border-border bg-card px-4" />
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-muted-foreground">알림이 없습니다</p>
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`p-4 rounded-2xl transition-all cursor-pointer ${
                n.isRead ? 'bg-card shadow-soft' : 'bg-card shadow-card border-l-[3px] border-l-primary'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    {n.category && <CategoryBadge category={n.category as ScheduleCategory} />}
                    {n.isImportant && <CategoryBadge category="important" />}
                  </div>
                  <p className="text-sm font-bold text-foreground">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed whitespace-pre-line">{n.content}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0 pt-0.5">
                  <span className="font-num text-[10px] text-muted-foreground">{formatTime(n.createdAt)}</span>
                  {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
              </div>
            </div>
          ))
        )}
        {!isLoading && nextCursor ? (
          <button
            type="button"
            onClick={() => loadNotifications(nextCursor)}
            disabled={isFetchingMore}
            className="w-full rounded-xl border border-border bg-card py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            {isFetchingMore ? '불러오는 중...' : '알림 더보기'}
          </button>
        ) : null}
      </div>
    </MobileLayout>
  );
};

export default NotificationsPage;
