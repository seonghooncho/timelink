import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CalendarDays,
  CalendarPlus,
  Clock,
  Heart,
  LogIn,
  MessageCircle,
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

type DemoTab = 'home' | 'group' | 'community' | 'coordination';

interface LoginPrompt {
  title: string;
  description: string;
  redirect: string;
}

const tabs = [
  { key: 'home', label: '홈' },
  { key: 'group', label: '모임' },
  { key: 'community', label: '커뮤니티' },
  { key: 'coordination', label: '시간 조율' },
];

const demoCommunityPosts = [
  {
    id: 'post-1',
    title: '첫 모임 일정은 어떻게 정하면 좋을까요?',
    content: '후보 날짜를 먼저 넓게 열고, 모두 가능한 시간에서 바로 약속을 확정하면 참여율이 좋아요.',
    createdLabel: '18분 전',
    likes: 8,
    comments: 3,
  },
  {
    id: 'post-2',
    title: '공개 모임 가입 요청 받을 때 보는 기준',
    content: '프로필과 인삿말을 같이 확인하면 운영자가 승인 여부를 빠르게 판단할 수 있습니다.',
    createdLabel: '2시간 전',
    likes: 14,
    comments: 5,
  },
  {
    id: 'post-3',
    title: '시간 조율 응답을 빨리 모으는 방법',
    content: '공지로 마감 시간을 안내하고, 추천 슬롯을 기준으로 모임 일정을 생성해보세요.',
    createdLabel: '어제',
    likes: 21,
    comments: 7,
  },
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
  const primaryPrompt = useMemo(() => {
    if (activeTab === 'group') {
      return {
        label: '내 모임으로 시작하기',
        title: '모임을 만들려면 로그인이 필요합니다',
        description: '모임 멤버와 초대 링크는 계정 기준으로 안전하게 관리됩니다.',
        redirect: '/groups/new',
      };
    }

    if (activeTab === 'coordination') {
      return {
        label: '시간 조율 시작하기',
        title: '시간을 조율하려면 로그인이 필요합니다',
        description: '조율 응답과 모임 일정은 로그인한 멤버 기준으로 저장됩니다.',
        redirect: '/groups',
      };
    }

    if (activeTab === 'community') {
      return {
        label: '커뮤니티 참여하기',
        title: '글을 쓰거나 반응하려면 로그인이 필요합니다',
        description: '게시글, 댓글, 좋아요는 계정 기준으로 안전하게 저장됩니다.',
        redirect: '/community',
      };
    }

    return {
      label: '내 일정으로 시작하기',
      title: '일정을 저장하려면 로그인이 필요합니다',
      description: '내 일정과 알림은 계정에 연결되어야 안전하게 유지됩니다.',
      redirect: '/schedule/new',
    };
  }, [activeTab]);

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
          <button
            type="button"
            onClick={() => requireLoginFor(primaryPrompt.title, primaryPrompt.description, primaryPrompt.redirect)}
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition-colors active:scale-[0.98]"
          >
            {primaryPrompt.label}
          </button>
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

        {activeTab === 'community' ? (
          <CommunityDemo onRequireLogin={requireLoginFor} />
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
    <section className="border-y border-border/60">
      <button
        type="button"
        onClick={() => onRequireLogin('모임을 열려면 로그인이 필요합니다', '모임 멤버, 초대, 가입요청은 계정 기준으로 관리됩니다.', '/groups')}
        className="w-full border-b border-border/60 px-1 py-4 text-left transition-colors hover:bg-muted/25"
      >
        <div className="flex items-center gap-4">
          <GroupAvatar name="주말 약속방" size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-sm font-bold text-foreground">주말 약속방</p>
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">공개</span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">멤버 {demoMembers.length}명</p>
          </div>
        </div>
        <div className="ml-[3.75rem] mt-3 flex items-center gap-2 rounded-xl bg-category-group-light px-3 py-2.5">
          <CalendarClock className="h-4 w-4 shrink-0 text-category-group" />
          <p className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">주말 장소 확정</p>
          <span className="shrink-0 rounded-full bg-card px-2 py-1 text-[10px] font-bold text-category-group">D-2</span>
        </div>
      </button>
      <button
        type="button"
        onClick={() => onRequireLogin('공개 모임에 가입하려면 로그인이 필요합니다', '프로필과 인삿말을 보낸 뒤 관리자의 승인을 받을 수 있습니다.', '/groups?tab=discover')}
        className="w-full px-1 py-4 text-left transition-colors hover:bg-muted/25"
      >
        <div className="flex items-start gap-3">
          <GroupAvatar name="러닝 초보 모임" size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-foreground">러닝 초보 모임</h3>
                <p className="mt-0.5 text-[11px] text-muted-foreground">멤버 12명</p>
              </div>
              <UserPlus className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
              공개 모임은 둘러보기에서 소개를 보고 가입요청을 보낼 수 있습니다.
            </p>
          </div>
        </div>
      </button>
    </section>

    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">약속({groupSchedules.length}개)</h3>
        <span className="text-xs font-semibold text-muted-foreground">시간 조율(1개)</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {groupSchedules.map((schedule) => (
          <button
            key={schedule.id}
            type="button"
            onClick={() => onRequireLogin('모임 일정을 관리하려면 로그인이 필요합니다', '선택된 멤버의 캘린더에도 모임 일정이 저장됩니다.', '/groups')}
            className="flex h-[112px] w-[168px] shrink-0 flex-col justify-between rounded-xl bg-category-group px-3 py-3 text-left text-primary-foreground shadow-soft"
          >
            <p className="line-clamp-2 text-sm font-bold">{schedule.title}</p>
            <p className="text-[11px] opacity-90">
              {formatScheduleClock(schedule.startTime)} · {formatDurationLabel(schedule.duration)}
            </p>
          </button>
        ))}
        <button
          type="button"
          onClick={() => onRequireLogin('시간 조율을 시작하려면 로그인이 필요합니다', '멤버들이 가능한 시간을 선택하면 모두 가능한 시간을 추천합니다.', '/groups')}
          className="flex h-[92px] w-[154px] shrink-0 flex-col justify-between rounded-xl border border-coord-green/25 bg-coord-green/5 px-3 py-3 text-left"
        >
          <Clock className="h-4 w-4 text-coord-green" />
          <p className="line-clamp-2 text-xs font-bold text-foreground">주말 모임 시간 정하기</p>
        </button>
      </div>
    </section>

    <section className="border-t border-border/60 pt-3">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">모임 글</h3>
        <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">공지 포함</span>
      </div>
      <DemoPostList
        posts={demoCommunityPosts.slice(0, 2)}
        onPostClick={() => onRequireLogin('모임 글에 참여하려면 로그인이 필요합니다', '가입한 모임에서는 게시글, 댓글, 공지를 함께 관리할 수 있습니다.', '/groups')}
      />
    </section>

    <button
      type="button"
      onClick={() => onRequireLogin('모임을 만들려면 로그인이 필요합니다', '모임 멤버와 초대 링크는 계정 기준으로 관리됩니다.', '/groups/new')}
      className="w-full rounded-2xl bg-category-group py-3.5 text-sm font-bold text-primary-foreground"
    >
      모임 만들기
    </button>
  </>
);

interface DemoPostListProps {
  posts: typeof demoCommunityPosts;
  onPostClick: () => void;
}

const DemoPostList: React.FC<DemoPostListProps> = ({ posts, onPostClick }) => (
  <div className="border-y border-border/60">
    {posts.map((post) => (
      <button
        key={post.id}
        type="button"
        onClick={onPostClick}
        className="w-full border-b border-border/60 px-1 py-3.5 text-left transition-colors last:border-b-0 hover:bg-muted/25"
      >
        <p className="truncate text-sm font-bold text-foreground">{post.title}</p>
        <p className="mt-1 line-clamp-1 text-xs leading-5 text-muted-foreground">{post.content}</p>
        <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>{post.createdLabel}</span>
          <span className="inline-flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" />
            {post.likes}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" />
            {post.comments}
          </span>
        </div>
      </button>
    ))}
  </div>
);

interface CommunityDemoProps {
  onRequireLogin: (title: string, description: string, redirect: string) => void;
}

const CommunityDemo: React.FC<CommunityDemoProps> = ({ onRequireLogin }) => (
  <>
    <section className="border-b border-border/60 pb-3">
      <p className="text-sm font-bold text-foreground">커뮤니티</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        모임 운영, 약속 조율, 일정 관리 팁을 게시글과 댓글로 나눕니다.
      </p>
    </section>

    <DemoPostList
      posts={demoCommunityPosts}
      onPostClick={() => onRequireLogin('게시글에 참여하려면 로그인이 필요합니다', '게시글 읽기 이후 댓글과 좋아요는 로그인한 사용자만 사용할 수 있습니다.', '/community')}
    />

    <button
      type="button"
      onClick={() => onRequireLogin('글을 쓰려면 로그인이 필요합니다', '커뮤니티 글쓰기와 반응은 계정 기준으로 저장됩니다.', '/community')}
      className="fixed app-floating-action right-5 app-layer-floating flex h-14 w-14 items-center justify-center rounded-2xl bg-coord-green text-primary-foreground shadow-fab"
      aria-label="커뮤니티 글쓰기"
    >
      <MessageCircle className="h-6 w-6" />
    </button>
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
        <h2 className="mt-1 text-xl font-bold text-foreground">추천 시간을 먼저 보여줘요</h2>
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
            <p className="text-xs text-muted-foreground">{selectedSlot.voterIds.length}명 참여</p>
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
        onClick={() => onRequireLogin('모임 일정으로 확정하려면 로그인이 필요합니다', '확정된 일정은 모임 멤버에게 공유되고 알림센터에 남습니다.', '/schedule/new')}
        className="w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground"
      >
        추천 시간으로 모임 일정 만들기
      </button>
    </>
  );
};

export default DemoPage;
