import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Clock,
  LogIn,
  UserPlus,
  Users,
} from 'lucide-react';
import MobileLayout from '@/components/layout/MobileLayout';
import BrandMark from '@/components/common/BrandMark';
import TabBar from '@/components/common/TabBar';
import ScheduleStrip from '@/components/schedule/ScheduleStrip';
import Timetable from '@/components/schedule/Timetable';
import GroupAvatar from '@/components/common/GroupAvatar';
import ScrollableFadeList from '@/components/common/ScrollableFadeList';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useGroupedSchedules } from '@/hooks/useGroupedSchedules';
import { formatDurationLabel, formatScheduleClock } from '@/lib/scheduleTime';
import { getDefaultTimetableStart } from '@/components/schedule/timetableUtils';
import { createDemoCoordination, createDemoSchedules, demoMembers } from '@/lib/demoData';
import type { DemoCoordinationSlot } from '@/lib/demoData';
import type { Schedule } from '@/types/types';
import { trackEvent } from '@/lib/analytics';

type DemoTab = 'home' | 'group' | 'coordination';

interface LoginPrompt {
  title: string;
  description: string;
  redirect: string;
}

const tabs = [
  { key: 'home', label: '홈' },
  { key: 'group', label: '그룹' },
  { key: 'coordination', label: '시간 조율' },
];

const formatDateLabel = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const getMemberInitial = (name: string) => name.slice(0, 1);

const DemoPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DemoTab>('home');
  const [loginPrompt, setLoginPrompt] = useState<LoginPrompt | null>(null);
  const [timetableStart, setTimetableStart] = useState(() => getDefaultTimetableStart());
  const schedules = useMemo(() => createDemoSchedules(), []);
  const coordination = useMemo(() => createDemoCoordination(), []);
  const groupedSchedules = useGroupedSchedules(schedules);
  const [selectedSlotKey, setSelectedSlotKey] = useState(() => `${coordination.recommended.date}-${coordination.recommended.hour}`);

  const groupSchedules = schedules.filter((schedule) => schedule.groupId === 'demo-group');
  const selectedSlot = coordination.slots.find((slot) => `${slot.date}-${slot.hour}` === selectedSlotKey) ?? coordination.recommended;

  useEffect(() => {
    trackEvent('demo_view', { tab: activeTab });
  }, [activeTab]);

  const openLoginPrompt = (prompt: LoginPrompt) => {
    trackEvent('demo_login_prompt', { redirect_path: prompt.redirect });
    setLoginPrompt(prompt);
  };

  const goLogin = () => {
    const redirect = loginPrompt?.redirect ?? '/';
    trackEvent('demo_login_click', { redirect_path: redirect });
    navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
  };

  const requireLoginFor = (title: string, description: string, redirect: string) => {
    openLoginPrompt({ title, description, redirect });
  };

  const handlePrevDays = () => {
    const prev = new Date(timetableStart);
    prev.setDate(prev.getDate() - 3);
    setTimetableStart(prev);
  };

  const handleNextDays = () => {
    const next = new Date(timetableStart);
    next.setDate(next.getDate() + 3);
    setTimetableStart(next);
  };

  const handleScheduleAction = (schedule: Schedule) => {
    requireLoginFor(
      '내 일정으로 관리하려면 로그인이 필요합니다',
      `${schedule.title} 같은 일정을 저장하고 알림을 받으려면 카카오 또는 Google로 시작해주세요.`,
      '/schedule/new',
    );
  };

  return (
    <MobileLayout hideNav>
      <header className="sticky top-0 app-layer-header border-b border-border/50 bg-card/95 backdrop-blur">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark size="sm" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">둘러보기</p>
              <h1 className="truncate text-lg font-bold text-foreground">Timelink 데모</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-foreground px-3 py-2 text-xs font-semibold text-background"
          >
            <LogIn className="h-3.5 w-3.5" />
            로그인
          </button>
        </div>
        <TabBar tabs={tabs} activeKey={activeTab} onChange={(key) => setActiveTab(key as DemoTab)} className="px-3 pt-0" />
      </header>

      <main className="space-y-5 px-5 py-4 pb-8">
        <section className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">샘플 데이터로 먼저 확인해보세요</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            저장, 그룹 참여, 알림 설정은 로그인 후 사용할 수 있습니다.
          </p>
        </section>

        {activeTab === 'home' ? (
          <HomeDemo
            schedules={schedules}
            groupedSchedules={groupedSchedules}
            timetableStart={timetableStart}
            onPrevDays={handlePrevDays}
            onNextDays={handleNextDays}
            onScheduleAction={handleScheduleAction}
            onRequireLogin={requireLoginFor}
          />
        ) : null}

        {activeTab === 'group' ? (
          <GroupDemo
            groupSchedules={groupSchedules}
            onRequireLogin={requireLoginFor}
          />
        ) : null}

        {activeTab === 'coordination' ? (
          <CoordinationDemo
            slots={coordination.slots}
            dates={coordination.dates}
            hours={coordination.hours}
            selectedSlot={selectedSlot}
            selectedSlotKey={selectedSlotKey}
            onSelectSlot={setSelectedSlotKey}
            onRequireLogin={requireLoginFor}
          />
        ) : null}
      </main>

      {loginPrompt ? (
        <div className="fixed inset-0 app-layer-critical flex items-end justify-center bg-foreground/30 px-4 pb-5">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-lg">
            <p className="text-base font-bold text-foreground">{loginPrompt.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{loginPrompt.description}</p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setLoginPrompt(null)}
                className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold text-muted-foreground"
              >
                계속 둘러보기
              </button>
              <button
                type="button"
                onClick={goLogin}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground"
              >
                로그인하고 계속
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </MobileLayout>
  );
};

interface HomeDemoProps {
  schedules: Schedule[];
  groupedSchedules: ReturnType<typeof useGroupedSchedules>;
  timetableStart: Date;
  onPrevDays: () => void;
  onNextDays: () => void;
  onScheduleAction: (schedule: Schedule) => void;
  onRequireLogin: (title: string, description: string, redirect: string) => void;
}

const HomeDemo: React.FC<HomeDemoProps> = ({
  schedules,
  groupedSchedules,
  timetableStart,
  onPrevDays,
  onNextDays,
  onScheduleAction,
  onRequireLogin,
}) => (
  <>
    <section className="-mx-5">
      <div className="mb-2 flex items-center justify-between px-5">
        <div>
          <p className="text-xs font-semibold text-primary">홈 일정 카드</p>
          <h2 className="text-base font-bold text-foreground">오늘 이후 일정을 먼저 보여줍니다</h2>
        </div>
        <CalendarDays className="h-5 w-5 text-muted-foreground" />
      </div>
      <ScheduleStrip
        groups={groupedSchedules}
        onScheduleClick={onScheduleAction}
        onComplete={onScheduleAction}
      />
    </section>

    <section className="-mx-5 bg-card py-3">
      <div className="mb-2 px-5">
        <p className="text-xs font-semibold text-primary">타임테이블</p>
        <h2 className="text-base font-bold text-foreground">일정이 시간 블록으로 표시됩니다</h2>
      </div>
      <Timetable
        schedules={schedules}
        startDate={timetableStart}
        days={4}
        onBlockClick={onScheduleAction}
        onPrev={onPrevDays}
        onNext={onNextDays}
      />
    </section>

    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => onRequireLogin('일정을 저장하려면 로그인이 필요합니다', '내 일정과 알림은 계정에 연결되어야 안전하게 유지됩니다.', '/schedule/new')}
        className="rounded-2xl bg-foreground px-4 py-3 text-left text-sm font-semibold text-background"
      >
        <CalendarPlus className="mb-2 h-4 w-4" />
        내 일정 만들기
      </button>
      <button
        type="button"
        onClick={() => onRequireLogin('알림을 켜려면 로그인이 필요합니다', '일정 알림과 그룹 알림은 로그인한 사용자에게만 전달됩니다.', '/mypage')}
        className="rounded-2xl border border-border bg-card px-4 py-3 text-left text-sm font-semibold text-foreground"
      >
        <Bell className="mb-2 h-4 w-4" />
        알림 설정 보기
      </button>
    </div>
  </>
);

interface GroupDemoProps {
  groupSchedules: Schedule[];
  onRequireLogin: (title: string, description: string, redirect: string) => void;
}

const GroupDemo: React.FC<GroupDemoProps> = ({ groupSchedules, onRequireLogin }) => (
  <>
    <section className="rounded-2xl bg-card p-5 shadow-soft">
      <div className="flex items-start gap-3">
        <GroupAvatar name="주말 약속방" size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">그룹 상세</p>
          <h2 className="text-xl font-bold text-foreground">주말 약속방</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            친구들과 가능한 시간을 모아보고 확정된 그룹 일정을 함께 관리합니다.
          </p>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground">참여 멤버 {demoMembers.length}명</p>
          <Users className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide">
          {demoMembers.map((member) => (
            <div key={member.id} className="flex min-w-[58px] flex-col items-center gap-1 rounded-xl bg-muted/60 px-2 py-2">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="text-xs font-bold text-foreground">{getMemberInitial(member.name)}</AvatarFallback>
              </Avatar>
              <span className="max-w-full truncate text-[11px] font-semibold text-foreground">{member.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">확정된 그룹 일정</h3>
        <span className="font-num text-xs text-muted-foreground">{groupSchedules.length}개</span>
      </div>
      {groupSchedules.map((schedule) => (
        <div key={schedule.id} className="rounded-2xl border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{schedule.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatScheduleClock(schedule.startTime)} · {formatDurationLabel(schedule.duration)}
              </p>
            </div>
            {schedule.isCompleted ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
            ) : (
              <Clock className="h-5 w-5 shrink-0 text-muted-foreground" />
            )}
          </div>
        </div>
      ))}
    </section>

    <section className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
      <p className="text-sm font-bold text-foreground">조율 중인 일정</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        주말 모임 시간 정하기에서 모두 가능한 시간을 추천받고 있습니다.
      </p>
    </section>

    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => onRequireLogin('그룹을 만들려면 로그인이 필요합니다', '그룹 멤버와 초대 링크는 계정 기준으로 관리됩니다.', '/groups/new')}
        className="rounded-2xl bg-category-group px-4 py-3 text-left text-sm font-semibold text-white"
      >
        그룹 만들기
      </button>
      <button
        type="button"
        onClick={() => onRequireLogin('그룹에 참여하려면 로그인이 필요합니다', '초대 링크 참여는 멤버 식별을 위해 소셜 로그인이 필요합니다.', '/groups')}
        className="rounded-2xl border border-border bg-card px-4 py-3 text-left text-sm font-semibold text-foreground"
      >
        <UserPlus className="mb-2 h-4 w-4" />
        초대 참여하기
      </button>
    </div>
  </>
);

interface CoordinationDemoProps {
  dates: string[];
  hours: number[];
  slots: DemoCoordinationSlot[];
  selectedSlot: DemoCoordinationSlot;
  selectedSlotKey: string;
  onSelectSlot: (key: string) => void;
  onRequireLogin: (title: string, description: string, redirect: string) => void;
}

const CoordinationDemo: React.FC<CoordinationDemoProps> = ({
  dates,
  hours,
  slots,
  selectedSlot,
  selectedSlotKey,
  onSelectSlot,
  onRequireLogin,
}) => {
  const memberMap = useMemo(() => new Map(demoMembers.map((member) => [member.id, member])), []);
  const maxVotes = demoMembers.length;

  const findSlot = (date: string, hour: number) => slots.find((slot) => slot.date === date && slot.hour === hour);

  return (
    <>
      <section className="rounded-2xl bg-card p-5 shadow-soft">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">모두 가능한 시간</p>
        <h2 className="mt-1 text-xl font-bold text-foreground">가장 많이 겹치는 시간을 먼저 보여줍니다</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          타임슬롯을 선택하면 투표 인원을 확인할 수 있어요.
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid border-b border-border bg-muted/40" style={{ gridTemplateColumns: `3.25rem repeat(${dates.length}, minmax(0, 1fr))` }}>
          <div />
          {dates.map((date) => (
            <div key={date} className="py-2 text-center text-xs font-bold text-foreground">
              {formatDateLabel(date)}
            </div>
          ))}
        </div>
        {hours.map((hour) => (
          <div key={hour} className="grid border-b border-border last:border-b-0" style={{ gridTemplateColumns: `3.25rem repeat(${dates.length}, minmax(0, 1fr))` }}>
            <div className="flex items-center justify-center border-r border-border text-xs font-semibold text-muted-foreground">
              {hour}:00
            </div>
            {dates.map((date) => {
              const slot = findSlot(date, hour);
              const key = `${date}-${hour}`;
              const votes = slot?.voterIds.length ?? 0;
              const opacity = 0.1 + (votes / maxVotes) * 0.55;
              const isSelected = selectedSlotKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSelectSlot(key)}
                  className={`min-h-[58px] border-r border-border px-1 py-2 text-center transition-colors last:border-r-0 ${isSelected ? 'ring-2 ring-inset ring-primary' : ''}`}
                  style={{ backgroundColor: `rgba(27, 127, 245, ${opacity})` }}
                >
                  <span className="font-num text-sm font-bold text-foreground">{votes}</span>
                  <span className="ml-0.5 text-[10px] text-muted-foreground">명</span>
                </button>
              );
            })}
          </div>
        ))}
      </section>

      <section className="rounded-2xl bg-card p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-foreground">
              {formatDateLabel(selectedSlot.date)} {selectedSlot.hour}:00 가능 인원
            </p>
            <p className="text-xs text-muted-foreground">{selectedSlot.voterIds.length}명이 가능하다고 선택했습니다</p>
          </div>
          <Users className="h-5 w-5 text-muted-foreground" />
        </div>
        <ScrollableFadeList maxHeightClassName="max-h-[220px]" contentClassName="grid grid-cols-3 gap-2 space-y-0" viewportClassName="pr-1">
          {selectedSlot.voterIds.map((memberId) => {
            const member = memberMap.get(memberId);
            if (!member) return null;
            return (
              <div key={member.id} className="flex flex-col items-center rounded-xl bg-muted/60 px-2 py-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="text-xs font-bold text-foreground">{getMemberInitial(member.name)}</AvatarFallback>
                </Avatar>
                <span className="mt-1 max-w-full truncate text-[11px] font-semibold text-foreground">{member.name}</span>
              </div>
            );
          })}
        </ScrollableFadeList>
      </section>

      <button
        type="button"
        onClick={() => onRequireLogin('그룹 일정으로 확정하려면 로그인이 필요합니다', '확정된 일정은 그룹 멤버에게 공유되고 알림센터에 남습니다.', '/schedule/new')}
        className="w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground"
      >
        추천 시간으로 그룹 일정 만들기
      </button>
    </>
  );
};

export default DemoPage;
