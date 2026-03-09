import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '@/components/layout/MobileLayout';
import PageHeader from '@/components/layout/PageHeader';
import ToggleSwitch from '@/components/common/ToggleSwitch';
import { settingsApi, storageApi } from '@/services/api';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useAuth } from '@/context/AuthContext';
import { LogOut, Camera, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';

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

  const [scheduleAlarm, setScheduleAlarm] = useState(true);
  const [groupAlarm, setGroupAlarm] = useState(true);
  const [remindOneDayBefore, setRemindOneDayBefore] = useState(true);
  const [remindSameDay, setRemindSameDay] = useState(true);
  const [importantAlarm, setImportantAlarm] = useState(true);

  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname || '사용자');
      setProfileImage(profile.avatarUrl);
    }
  }, [profile]);

  useEffect(() => {
    settingsApi.getNotifications().then(s => {
      setScheduleAlarm(s.scheduleAlarm);
      setGroupAlarm(s.groupAlarm);
      setRemindOneDayBefore(s.remindOneDayBefore);
      setRemindSameDay(s.remindSameDay);
      setImportantAlarm(s.importantAlarm);
    }).catch(() => {
      toast.error('알림 설정을 불러오지 못했습니다');
    });
  }, []);

  const handleSettingChange = async <K extends 'scheduleAlarm' | 'groupAlarm' | 'remindOneDayBefore' | 'remindSameDay' | 'importantAlarm'>(
    key: K,
    value: boolean,
    rollback: () => void,
  ) => {
    try {
      await settingsApi.updateNotifications({ [key]: value });
    } catch {
      rollback();
      toast.error('알림 설정 저장에 실패했습니다');
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      toast.success('로그아웃 되었습니다');
      navigate('/login');
    } catch {
      toast.error('로그아웃 중 오류가 발생했습니다');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleImageClick = () => fileInputRef.current?.click();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('이미지 파일만 업로드 가능합니다'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('5MB 이하의 이미지만 업로드 가능합니다'); return; }

    setIsUploading(true);
    try {
      const uploadResult = await storageApi.uploadProfileImage(file);
      await updateProfileMutation.mutateAsync({ avatarUrl: uploadResult.url });
      setProfileImage(uploadResult.url);
      toast.success('프로필 이미지가 변경되었습니다');
    } catch (err) {
      console.error(err);
      toast.error('이미지 업로드에 실패했습니다');
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
        toast.success('닉네임이 변경되었습니다');
      } catch { toast.error('닉네임 변경에 실패했습니다'); }
    }
    setIsEditingNickname(false);
  };

  const cancelEditNickname = () => setIsEditingNickname(false);

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

        <section className="bg-card rounded-2xl shadow-soft overflow-hidden">
          <div className="px-5 pt-4 pb-2"><p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">알림 설정</p></div>
          <div className="divide-y divide-border/60">
            <SettingRow label="일정 알림" desc="일정 관련 알림을 받습니다" checked={scheduleAlarm} onChange={v => {
              const previous = scheduleAlarm;
              setScheduleAlarm(v);
              handleSettingChange('scheduleAlarm', v, () => setScheduleAlarm(previous));
            }} />
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
            <SettingRow label="1일 전 리마인드" desc="오후 10:00" checked={remindOneDayBefore} onChange={v => {
              const previous = remindOneDayBefore;
              setRemindOneDayBefore(v);
              handleSettingChange('remindOneDayBefore', v, () => setRemindOneDayBefore(previous));
            }} />
            <SettingRow label="당일 리마인드" desc="오전 8:00" checked={remindSameDay} onChange={v => {
              const previous = remindSameDay;
              setRemindSameDay(v);
              handleSettingChange('remindSameDay', v, () => setRemindSameDay(previous));
            }} />
            <SettingRow label="중요 일정 알림" desc="오전 8:00 추가 알림" checked={importantAlarm} onChange={v => {
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

function SettingRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} />
    </div>
  );
}

export default MyPage;
