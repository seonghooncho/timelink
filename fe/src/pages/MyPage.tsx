import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '@/components/layout/MobileLayout';
import PageHeader from '@/components/layout/PageHeader';
import ToggleSwitch from '@/components/common/ToggleSwitch';
import type { NotificationSettingsResponse } from '@/services/api';
import { settingsApi, storageApi } from '@/services/api';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useAuth } from '@/context/AuthContext';
import { LogOut, Camera, Pencil, Check, X, Sparkles } from 'lucide-react';
import { appToast } from '@/lib/appToast';
import { ensurePushSubscription, removePushSubscription } from '@/pwa/pushNotifications';

const PROFILE_TIPS = [
  '그룹에 가입하면 친구들과 가능한 약속 시간을 한눈에 비교할 수 있어요.',
  '조율 중인 일정에서 타임슬롯을 선택하면 누가 투표했는지 바로 확인할 수 있어요.',
  '모두 가능한 시간에서 추천 슬롯을 확인한 뒤 바로 그룹 일정으로 확정할 수 있어요.',
  '그룹 상세 하단의 두 버튼으로 약속 확정과 시간 조율을 빠르게 시작할 수 있어요.',
  '일정 알림을 켜두면 1일 전, 당일, 중요 일정 리마인드를 상황에 맞게 고를 수 있어요.',
  '중요한 약속은 중요 일정으로 표시해두면 알림과 카드에서 더 놓치기 어렵습니다.',
  '홈 일정 카드는 오늘 이후 일정부터 보이고, 옆으로 넘기면 지난 일정도 확인할 수 있어요.',
  '완료 버튼은 삭제와 별개라서 끝낸 일정만 체크하고 기록은 그대로 남길 수 있어요.',
  '그룹 초대 링크를 공유하면 친구가 링크만 열어도 바로 참여 흐름으로 이동합니다.',
  '프로필 사진과 닉네임을 바꾸면 그룹 멤버 목록에도 최신 정보가 표시돼요.',
  '캘린더에서 날짜를 누르면 그날 일정만 따로 모아 확인할 수 있어요.',
  '포스터나 안내문 사진으로 일정을 등록하면 AI가 제목과 시간을 먼저 채워줄 수 있어요.',
  '시간 조율 날짜가 많을 때는 5일 단위로 넘겨 보며 가능한 시간을 비교할 수 있어요.',
  '푸시 권한을 나중에 켜도 알림센터에는 일정과 그룹 알림이 계속 쌓입니다.',
];

const MyPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { signOut } = useAuth();
  const { data: profile } = useProfile();
  const updateProfileMutation = useUpdateProfile();

  const [nickname, setNickname] = useState('');
  const [editNickname, setEditNickname] = useState('');
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [scheduleAlarm, setScheduleAlarm] = useState(false);
  const [groupAlarm, setGroupAlarm] = useState(false);
  const [remindOneDayBefore, setRemindOneDayBefore] = useState(false);
  const [remindSameDay, setRemindSameDay] = useState(false);
  const [importantAlarm, setImportantAlarm] = useState(false);
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * PROFILE_TIPS.length));

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTipIndex(prev => (prev + 1) % PROFILE_TIPS.length);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname || '사용자');
      setProfileImage(profile.avatarUrl);
    }
  }, [profile]);

  useEffect(() => {
    settingsApi.getNotifications().then(s => {
      applyNotificationSettings(s);
    }).catch((error) => {
      appToast.error('알림 설정을 불러오지 못했습니다', error);
    });
  }, []);

  const applyNotificationSettings = (settings: NotificationSettingsResponse) => {
    setScheduleAlarm(settings.scheduleAlarm);
    setGroupAlarm(settings.groupAlarm);
    setRemindOneDayBefore(settings.remindOneDayBefore);
    setRemindSameDay(settings.remindSameDay);
    setImportantAlarm(settings.importantAlarm);
  };

  const requestBrowserNotificationPermission = async () => {
    if (!('Notification' in window) || typeof Notification.requestPermission !== 'function') {
      appToast.info('브라우저 알림은 지원되지 않아 알림센터에서만 확인할 수 있습니다');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      appToast.info('브라우저 알림 권한이 꺼져 있어 알림센터에서만 확인할 수 있습니다');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'denied') {
        appToast.info('브라우저 알림 권한이 꺼져 있어 알림센터에서만 확인할 수 있습니다');
        return false;
      }
      return permission === 'granted';
    } catch {
      appToast.info('브라우저 알림은 지원되지 않아 알림센터에서만 확인할 수 있습니다');
      return false;
    }
  };

  const syncPushSubscription = async (settings: NotificationSettingsResponse) => {
    try {
      if (settings.scheduleAlarm || settings.groupAlarm) {
        if ('Notification' in window && Notification.permission === 'granted') {
          const subscribed = await ensurePushSubscription();
          if (!subscribed) {
            appToast.info('푸시 알림 준비가 완료되지 않아 알림센터에서 먼저 확인할 수 있습니다');
          }
        }
        return;
      }

      await removePushSubscription();
    } catch (error) {
      appToast.info('푸시 알림 연결에 실패해 알림센터에서 먼저 확인할 수 있습니다', error instanceof Error ? error.message : undefined);
    }
  };

  const handleSettingChange = async <K extends 'scheduleAlarm' | 'groupAlarm' | 'remindOneDayBefore' | 'remindSameDay' | 'importantAlarm'>(
    key: K,
    value: boolean,
    rollback: () => void,
  ) => {
    const reminderKeys = ['remindOneDayBefore', 'remindSameDay', 'importantAlarm'];
    if (!scheduleAlarm && reminderKeys.includes(key)) {
      return;
    }

    try {
      if (value && (key === 'scheduleAlarm' || key === 'groupAlarm')) {
        await requestBrowserNotificationPermission();
      }
      const settings = await settingsApi.updateNotifications({ [key]: value });
      applyNotificationSettings(settings);
      await syncPushSubscription(settings);
    } catch (error) {
      rollback();
      appToast.error('알림 설정 저장에 실패했습니다', error);
    }
  };

  const handleScheduleAlarmChange = async (value: boolean) => {
    const previous = {
      scheduleAlarm,
      remindOneDayBefore,
      remindSameDay,
      importantAlarm,
    };

    setScheduleAlarm(value);

    try {
      if (value) {
        await requestBrowserNotificationPermission();
      }
      const settings = await settingsApi.updateNotifications(
        value
          ? { scheduleAlarm: true }
          : { scheduleAlarm: false },
      );
      applyNotificationSettings(settings);
      await syncPushSubscription(settings);
    } catch (error) {
      setScheduleAlarm(previous.scheduleAlarm);
      setRemindOneDayBefore(previous.remindOneDayBefore);
      setRemindSameDay(previous.remindSameDay);
      setImportantAlarm(previous.importantAlarm);
      appToast.error('알림 설정 저장에 실패했습니다', error);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      appToast.success('로그아웃 되었습니다');
      navigate('/login');
    } catch (error) {
      appToast.error('로그아웃 중 오류가 발생했습니다', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleImageClick = () => fileInputRef.current?.click();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { appToast.error('이미지 파일만 업로드 가능합니다'); return; }
    if (file.size > 5 * 1024 * 1024) { appToast.error('5MB 이하의 이미지만 업로드 가능합니다'); return; }

    setIsUploading(true);
    try {
      const uploadResult = await storageApi.uploadProfileImage(file);
      await updateProfileMutation.mutateAsync({ avatarUrl: uploadResult.url });
      setProfileImage(uploadResult.url);
      appToast.success('프로필 이미지가 변경되었습니다');
    } catch (err) {
      appToast.error('이미지 업로드에 실패했습니다', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startEditNickname = () => { setEditNickname(nickname); setIsEditingNickname(true); };

  const saveNickname = async () => {
    const trimmed = editNickname.trim();
    if (trimmed) {
      try {
        await updateProfileMutation.mutateAsync({ nickname: trimmed });
        setNickname(trimmed);
        appToast.success('닉네임이 변경되었습니다');
      } catch (error) { appToast.error('닉네임 변경에 실패했습니다', error); }
    }
    setIsEditingNickname(false);
  };

  const cancelEditNickname = () => setIsEditingNickname(false);
  const profileTip = PROFILE_TIPS[tipIndex];
  const showPreviousTip = () => setTipIndex(prev => (prev - 1 + PROFILE_TIPS.length) % PROFILE_TIPS.length);
  const showNextTip = () => setTipIndex(prev => (prev + 1) % PROFILE_TIPS.length);

  return (
    <MobileLayout>
      <PageHeader title="마이페이지" />
      <div className="px-5 py-5 space-y-4">
        <section className="bg-card rounded-2xl shadow-soft p-6">
          <div className="flex flex-col items-center">
            <div className="relative group mb-4">
              <button onClick={handleImageClick} disabled={isUploading}
                className="relative w-20 h-20 rounded-2xl overflow-hidden bg-muted pressable focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ring-offset-background">
                {profileImage ? (
                  <img src={profileImage} alt="프로필" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><span className="text-3xl">👤</span></div>
                )}
                <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isUploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                  {isUploading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
                </div>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </div>
            {isEditingNickname ? (
              <div className="flex items-center gap-2 w-full max-w-[240px]">
                <input value={editNickname} onChange={e => setEditNickname(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveNickname(); if (e.key === 'Escape') cancelEditNickname(); }}
                  maxLength={20} className="flex-1 px-3 py-2 bg-muted rounded-xl text-sm text-foreground text-center outline-none focus:ring-2 focus:ring-ring" autoFocus />
                <button onClick={saveNickname} className="p-2 rounded-xl bg-primary text-primary-foreground pressable"><Check className="w-4 h-4" /></button>
                <button onClick={cancelEditNickname} className="p-2 rounded-xl bg-muted text-muted-foreground pressable"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <button onClick={startEditNickname} className="flex items-center gap-1.5 group pressable">
                <span className="text-base font-bold text-foreground">{nickname}</span>
                <Pencil className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            )}
            <p className="text-[11px] text-muted-foreground mt-1.5">사진이나 닉네임을 탭하여 수정</p>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft">
          <div className="flex items-stretch">
            <button
              type="button"
              aria-label="이전 팁"
              onClick={showPreviousTip}
              className="flex w-9 shrink-0 items-center justify-center text-lg font-semibold text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
            >
              &lt;
            </button>

            <div className="min-w-0 flex-1 px-1 py-3.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Timelink 팁</p>
                <span className="ml-auto font-num text-[10px] font-semibold text-muted-foreground">
                  {tipIndex + 1}/{PROFILE_TIPS.length}
                </span>
              </div>
              <p className="mt-1.5 line-clamp-2 min-h-[40px] text-sm font-medium leading-5 text-foreground">
                {profileTip}
              </p>
            </div>

            <button
              type="button"
              aria-label="다음 팁"
              onClick={showNextTip}
              className="flex w-9 shrink-0 items-center justify-center text-lg font-semibold text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
            >
              &gt;
            </button>
          </div>
        </section>

        <section className="bg-card rounded-2xl shadow-soft overflow-hidden">
          <div className="px-5 pt-4 pb-2"><p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">알림 설정</p></div>
          <div className="divide-y divide-border/60">
            <SettingRow label="일정 알림" desc="일정과 리마인드 알림을 받습니다" checked={scheduleAlarm} onChange={handleScheduleAlarmChange} />
            <SettingRow label="그룹 알림" desc="그룹 일정 생성, 조율 시 알림" checked={groupAlarm} onChange={v => {
              const previous = groupAlarm;
              setGroupAlarm(v);
              handleSettingChange('groupAlarm', v, () => setGroupAlarm(previous));
            }} />
          </div>
        </section>

        <section className="bg-card rounded-2xl shadow-soft overflow-hidden">
          <div className="px-5 pt-4 pb-2"><p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">리마인드</p></div>
          <div className="divide-y divide-border/60">
            <SettingRow label="1일 전 리마인드" desc={scheduleAlarm ? '오후 10:00' : '일정 알림을 켜면 설정할 수 있습니다'} checked={remindOneDayBefore} disabled={!scheduleAlarm} onChange={v => {
              const previous = remindOneDayBefore;
              setRemindOneDayBefore(v);
              handleSettingChange('remindOneDayBefore', v, () => setRemindOneDayBefore(previous));
            }} />
            <SettingRow label="당일 리마인드" desc={scheduleAlarm ? '오전 8:00' : '일정 알림을 켜면 설정할 수 있습니다'} checked={remindSameDay} disabled={!scheduleAlarm} onChange={v => {
              const previous = remindSameDay;
              setRemindSameDay(v);
              handleSettingChange('remindSameDay', v, () => setRemindSameDay(previous));
            }} />
            <SettingRow label="중요 일정 알림" desc={scheduleAlarm ? '오전 8:00 추가 알림' : '일정 알림을 켜면 설정할 수 있습니다'} checked={importantAlarm} disabled={!scheduleAlarm} onChange={v => {
              const previous = importantAlarm;
              setImportantAlarm(v);
              handleSettingChange('importantAlarm', v, () => setImportantAlarm(previous));
            }} />
          </div>
        </section>

        <button onClick={handleLogout} disabled={isLoggingOut}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-card rounded-2xl shadow-soft text-sm font-medium text-destructive hover:bg-destructive/5 transition-all pressable disabled:opacity-50">
          <LogOut className="w-4 h-4" />
          {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
        </button>
        <div className="h-4" />
      </div>
    </MobileLayout>
  );
};

function SettingRow({ label, desc, checked, disabled = false, onChange }: { label: string; desc: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className={`flex items-center justify-between px-5 py-4 ${disabled ? 'opacity-70' : ''}`}>
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <ToggleSwitch checked={checked} disabled={disabled} onChange={onChange} />
    </div>
  );
}

export default MyPage;
