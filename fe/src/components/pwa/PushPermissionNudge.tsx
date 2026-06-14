import { useCallback, useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { appToast } from '@/lib/appToast';
import { settingsApi } from '@/services/api';
import {
  clearPushPermissionNudgePending,
  ensurePushSubscription,
  isPushNotificationSupported,
  isPushPermissionNudgePending,
  requestPushPermission,
} from '@/pwa/pushNotifications';

const DISMISSED_UNTIL_KEY = 'timelink:push-permission-nudge-dismissed-until';
const DISMISS_MS = 14 * 24 * 60 * 60 * 1000;
const HIDDEN_PATH_PATTERNS = [
  /^\/login(?:\/|$)/,
  /^\/auth\/callback(?:\/|$)/,
  /^\/consent(?:\/|$)/,
];

const isDismissed = () => {
  const dismissedUntil = Number(localStorage.getItem(DISMISSED_UNTIL_KEY) || 0);
  return Number.isFinite(dismissedUntil) && Date.now() < dismissedUntil;
};

const isHiddenPath = (pathname: string) =>
  HIDDEN_PATH_PATTERNS.some((pattern) => pattern.test(pathname));

const PushPermissionNudge = () => {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);

  useEffect(() => {
    if (
      !isAuthenticated
      || isHiddenPath(pathname)
      || !isPushPermissionNudgePending()
      || isDismissed()
      || !isPushNotificationSupported()
      || Notification.permission !== 'default'
    ) {
      setVisible(false);
      return;
    }

    setVisible(true);
  }, [isAuthenticated, pathname]);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_UNTIL_KEY, String(Date.now() + DISMISS_MS));
    clearPushPermissionNudgePending();
    setVisible(false);
  }, []);

  const enablePush = useCallback(async () => {
    setIsEnabling(true);
    try {
      const permission = await requestPushPermission();
      if (permission !== 'granted') {
        appToast.info('푸시 알림은 꺼진 상태로 둘게요', '알림센터에는 모임 활동이 자동으로 쌓입니다.');
        dismiss();
        return;
      }

      const settings = await settingsApi.updateNotifications({ pushAlarm: true });
      const subscribed = await ensurePushSubscription();
      if (subscribed && settings.pushAlarm) {
        appToast.success('푸시 알림을 켰습니다');
      } else {
        appToast.info('권한은 허용됐지만 푸시 연결을 완료하지 못했습니다', '알림센터에는 계속 자동으로 쌓입니다.');
      }
      clearPushPermissionNudgePending();
      setVisible(false);
    } catch (error) {
      appToast.error('푸시 알림 설정에 실패했습니다', error);
    } finally {
      setIsEnabling(false);
    }
  }, [dismiss]);

  if (!visible) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--app-bottom-nav-height)+0.75rem)] app-layer-notice px-3">
      <section
        className="glass pointer-events-auto mx-auto flex w-full max-w-lg items-start gap-3 rounded-2xl border border-border/80 bg-card/95 p-3 shadow-elevated animate-in fade-in slide-in-from-bottom-2"
        aria-label="푸시 알림 안내"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Bell className="h-5 w-5" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-5 text-foreground">
            약속 변경을 바로 알려드릴게요
          </p>
          <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">
            모임 활동은 알림센터에 자동 저장됩니다. 푸시를 켜면 휴대폰과 브라우저에서도 바로 받아볼 수 있어요.
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={enablePush}
              disabled={isEnabling}
              className="pressable inline-flex h-8 items-center rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {isEnabling ? '설정 중' : '푸시 알림 켜기'}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="pressable inline-flex h-8 items-center rounded-xl border border-border/80 bg-background/80 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              나중에
            </button>
          </div>
        </div>

        <button
          type="button"
          className="pressable -mr-1 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="푸시 알림 안내 닫기"
          onClick={dismiss}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </section>
    </div>
  );
};

export default PushPermissionNudge;
