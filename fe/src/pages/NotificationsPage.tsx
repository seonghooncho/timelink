import React, { useState, useEffect } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import PageHeader from '@/components/layout/PageHeader';
import TabBar from '@/components/common/TabBar';
import CategoryBadge from '@/components/common/CategoryBadge';
import { notificationApi, NotificationResponse } from '@/services/api';
import { ScheduleCategory } from '@/types/types';
import { appToast } from '@/lib/appToast';

const TABS = [
  { key: 'schedule', label: '일정 알림' },
  { key: 'system', label: '시스템 알림' },
];

const NotificationsPage: React.FC = () => {
  const [tab, setTab] = useState('schedule');
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    notificationApi.getAll({ type: tab }).then(data => {
      setNotifications(data);
    }).catch((error) => {
      setNotifications([]);
      appToast.error('알림을 불러오지 못했습니다', error);
    }).finally(() => setIsLoading(false));
  }, [tab]);

  const handleMarkRead = (id: string) => {
    notificationApi.markRead(id).then(() => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
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
      <PageHeader title="알림" showBack />
      <TabBar tabs={TABS} activeKey={tab} onChange={setTab} />

      <div className="px-5 py-3 space-y-2.5">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-muted-foreground">알림이 없습니다</p>
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              onClick={() => !n.isRead && handleMarkRead(n.id)}
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
      </div>
    </MobileLayout>
  );
};

export default NotificationsPage;
