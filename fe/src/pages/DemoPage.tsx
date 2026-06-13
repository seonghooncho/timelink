import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  CalendarClock,
  ChevronRight,
  Clock,
  Heart,
  LogIn,
  MessageCircle,
  UserPlus,
  Users,
} from 'lucide-react';
import MobileLayout from '@/components/layout/MobileLayout';
import BrandMark from '@/components/common/BrandMark';
import ScheduleStrip from '@/components/schedule/ScheduleStrip';
import Timetable from '@/components/schedule/Timetable';
import GroupAvatar from '@/components/common/GroupAvatar';
import ScrollableFadeList from '@/components/common/ScrollableFadeList';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useGroupedSchedules } from '@/hooks/useGroupedSchedules';
import { formatDurationLabel, formatScheduleClock } from '@/lib/scheduleTime';
import { getDefaultTimetableStart } from '@/components/schedule/timetableUtils';
import { createDemoCoordination, createDemoSchedules, demoMembers } from '@/lib/demoData';
import type { DemoCoordinationSlot } from '@/lib/demoData';
import type { Schedule } from '@/types/types';
import { getScheduleColorStyle } from '@/utils';
import { trackEvent } from '@/lib/analytics';

type DemoTab = 'home' | 'coordination' | 'group' | 'community' | 'calendar';
type CoordinationDemoStage = 'mine' | 'all';
type DemoNavKey = 'home' | 'coordinationMine' | 'coordinationAll' | 'group' | 'community' | 'calendar';

interface LoginPrompt {
  title: string;
  description: string;
  redirect: string;
}

const demoNavItems: { key: DemoNavKey; ariaLabel: string; labelParts: string[] }[] = [
  { key: 'home', ariaLabel: '홈', labelParts: ['홈'] },
  { key: 'coordinationMine', ariaLabel: '시간조율(1)', labelParts: ['시간', '조율', '(1)'] },
  { key: 'coordinationAll', ariaLabel: '시간조율(2)', labelParts: ['시간', '조율', '(2)'] },
  { key: 'group', ariaLabel: '모임', labelParts: ['모임'] },
  { key: 'community', ariaLabel: '커뮤니티', labelParts: ['커뮤', '니티'] },
  { key: 'calendar', ariaLabel: '캘린더', labelParts: ['캘린', '더'] },
];

const demoTabOrder: DemoTab[] = ['home', 'coordination', 'group', 'community', 'calendar'];

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

const demoMyGroups = [
  {
    id: 'demo-group',
    name: '주말 약속방',
    visibility: '공개',
    members: demoMembers.length,
    nextTitle: '주말 장소 확정',
    nextLabel: 'D-2',
  },
  {
    id: 'demo-book',
    name: '퇴근 후 독서모임',
    visibility: '비공개',
    members: 8,
    nextTitle: '6월 책 나눔',
    nextLabel: 'D-5',
  },
];

const demoDiscoverGroups = [
  {
    id: 'discover-running',
    name: '러닝 초보 모임',
    members: 12,
    description: '가볍게 뛰고 주말 코스를 함께 정하는 공개 모임',
  },
  {
    id: 'discover-cafe',
    name: '동네 카페 작업실',
    members: 24,
    description: '집중할 시간과 장소를 함께 맞추는 느슨한 모임',
  },
];

const formatDateLabel = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const toLocalDateKey = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const getMemberInitial = (name: string) => name.slice(0, 1);
const calendarDayLabels = ['일', '월', '화', '수', '목', '금', '토'];

const DemoPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DemoTab>('home');
  const [loginPrompt, setLoginPrompt] = useState<LoginPrompt | null>(null);
  const [timetableStart, setTimetableStart] = useState(() => getDefaultTimetableStart());
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [coordinationStage, setCoordinationStage] = useState<CoordinationDemoStage>('mine');
  const schedules = useMemo(() => createDemoSchedules(), []);
  const coordination = useMemo(() => createDemoCoordination(), []);
  const groupedSchedules = useGroupedSchedules(schedules);
  const [selectedSlotKey, setSelectedSlotKey] = useState(() => `${coordination.recommended.date}-${coordination.recommended.hour}`);

  const groupSchedules = schedules.filter((schedule) => schedule.groupId === 'demo-group');
  const groupedGroupSchedules = useGroupedSchedules(groupSchedules);
  const selectedSlot = coordination.slots.find((slot) => `${slot.date}-${slot.hour}` === selectedSlotKey) ?? coordination.recommended;
  const activeNavKey: DemoNavKey = activeTab === 'coordination'
    ? coordinationStage === 'mine' ? 'coordinationMine' : 'coordinationAll'
    : activeTab;

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

  const activateTab = (tab: DemoTab, nextStage?: CoordinationDemoStage) => {
    setActiveTab(tab);
    if (tab === 'coordination') {
      setCoordinationStage(nextStage ?? 'mine');
    }
  };

  const handleNavChange = (key: DemoNavKey) => {
    trackEvent('demo_top_nav_click', { tab: key });
    if (key === 'coordinationMine') {
      activateTab('coordination', 'mine');
      return;
    }
    if (key === 'coordinationAll') {
      activateTab('coordination', 'all');
      return;
    }
    activateTab(key);
  };

  const handleNextFeature = () => {
    if (activeTab === 'coordination' && coordinationStage === 'mine') {
      trackEvent('demo_next_feature_click', { from_tab: 'coordination_mine', to_tab: 'coordination_all' });
      setCoordinationStage('all');
      return;
    }

    const currentIndex = demoTabOrder.indexOf(activeTab);
    const nextTab = demoTabOrder[(currentIndex + 1) % demoTabOrder.length];
    trackEvent('demo_next_feature_click', {
      from_tab: activeTab === 'coordination' ? `coordination_${coordinationStage}` : activeTab,
      to_tab: nextTab,
    });
    activateTab(nextTab);
  };

  const handlePrevFeature = () => {
    if (activeTab === 'coordination' && coordinationStage === 'all') {
      trackEvent('demo_prev_feature_click', { from_tab: 'coordination_all', to_tab: 'coordination_mine' });
      setCoordinationStage('mine');
      return;
    }

    const currentIndex = demoTabOrder.indexOf(activeTab);
    const prevTab = demoTabOrder[(currentIndex - 1 + demoTabOrder.length) % demoTabOrder.length];
    trackEvent('demo_prev_feature_click', {
      from_tab: activeTab === 'coordination' ? `coordination_${coordinationStage}` : activeTab,
      to_tab: prevTab,
    });
    activateTab(prevTab, prevTab === 'coordination' ? 'all' : undefined);
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
      '일정 상세를 보려면 로그인이 필요합니다',
      `${schedule.title} 상세와 알림은 가입 후 내 계정에 저장해 확인할 수 있습니다.`,
      '/schedule/new',
    );
  };

  const handleTimetableBlockClick = (schedule: Schedule) => {
    setSelectedScheduleId(schedule.id);
    trackEvent('demo_timetable_block_click', { schedule_id: schedule.id });
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
        <DemoTopNav
          activeKey={activeNavKey}
          onChange={handleNavChange}
        />
      </header>

      <main className="space-y-5 px-5 py-4 pb-32">
        {activeTab === 'home' ? (
          <HomeDemo
            schedules={schedules}
            groupedSchedules={groupedSchedules}
            timetableStart={timetableStart}
            onPrevDays={handlePrevDays}
            onNextDays={handleNextDays}
            onScheduleAction={handleScheduleAction}
            onTimetableBlockClick={handleTimetableBlockClick}
            onEmptyTimetableClick={() => setSelectedScheduleId(null)}
            selectedScheduleId={selectedScheduleId}
          />
        ) : null}

        {activeTab === 'group' ? (
          <GroupDemo
            groupSchedules={groupSchedules}
            groupedGroupSchedules={groupedGroupSchedules}
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
            stage={coordinationStage}
            onStageChange={setCoordinationStage}
            onRequireLogin={requireLoginFor}
          />
        ) : null}

        {activeTab === 'community' ? (
          <CommunityDemo onRequireLogin={requireLoginFor} />
        ) : null}

        {activeTab === 'calendar' ? (
          <CalendarDemo
            schedules={schedules}
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

      <div className="pointer-events-none fixed inset-x-0 bottom-0 app-layer-critical px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]">
        <div className="pointer-events-auto mx-auto grid w-full max-w-lg grid-cols-[0.9fr_1.4fr] gap-2 rounded-2xl border border-border/70 bg-card/95 p-2 shadow-elevated backdrop-blur">
          <button
            type="button"
            onClick={handlePrevFeature}
            className="rounded-xl bg-muted px-3 py-3 text-xs font-bold text-muted-foreground transition-transform active:scale-[0.98]"
          >
            이전 기능
          </button>
          <button
            type="button"
            onClick={handleNextFeature}
            className="rounded-xl bg-primary px-3 py-3 text-xs font-bold text-primary-foreground transition-transform active:scale-[0.98]"
          >
            다음 기능 둘러보기 &gt;&gt;
          </button>
        </div>
      </div>
    </MobileLayout>
  );
};

interface DemoTopNavProps {
  activeKey: DemoNavKey;
  onChange: (key: DemoNavKey) => void;
}

const DemoTopNav: React.FC<DemoTopNavProps> = ({ activeKey, onChange }) => (
  <nav className="grid grid-cols-6 gap-1 px-2 pb-2 pt-0" aria-label="데모 기능">
    {demoNavItems.map((item) => {
      const active = activeKey === item.key;
      return (
        <button
          key={item.key}
          type="button"
          aria-label={item.ariaLabel}
          onClick={() => onChange(item.key)}
          className={`flex min-h-[54px] min-w-0 flex-col items-center justify-center rounded-xl px-1 py-1.5 text-[11px] font-bold leading-[1.05] transition-all ${
            active
              ? 'bg-foreground text-background shadow-soft'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          {item.labelParts.map((part) => (
            <span key={part} className="block whitespace-nowrap">
              {part}
            </span>
          ))}
        </button>
      );
    })}
  </nav>
);

interface HomeDemoProps {
  schedules: Schedule[];
  groupedSchedules: ReturnType<typeof useGroupedSchedules>;
  timetableStart: Date;
  onPrevDays: () => void;
  onNextDays: () => void;
  onScheduleAction: (schedule: Schedule) => void;
  onTimetableBlockClick: (schedule: Schedule) => void;
  onEmptyTimetableClick: () => void;
  selectedScheduleId: string | null;
}

const HomeDemo: React.FC<HomeDemoProps> = ({
  schedules,
  groupedSchedules,
  timetableStart,
  onPrevDays,
  onNextDays,
  onScheduleAction,
  onTimetableBlockClick,
  onEmptyTimetableClick,
  selectedScheduleId,
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
        selectedScheduleId={selectedScheduleId}
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
        onBlockClick={onTimetableBlockClick}
        onEmptyBlockClick={onEmptyTimetableClick}
        onPrev={onPrevDays}
        onNext={onNextDays}
        selectedScheduleId={selectedScheduleId}
      />
    </section>
  </>
);

interface GroupDemoProps {
  groupSchedules: Schedule[];
  groupedGroupSchedules: ReturnType<typeof useGroupedSchedules>;
  onRequireLogin: (title: string, description: string, redirect: string) => void;
}

const GroupDemo: React.FC<GroupDemoProps> = ({ groupSchedules, groupedGroupSchedules, onRequireLogin }) => (
  <>
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">내 모임</h2>
        <span className="text-xs font-semibold text-muted-foreground">{demoMyGroups.length}개</span>
      </div>
      <div className="border-y border-border/60">
        {demoMyGroups.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => onRequireLogin('모임을 열려면 로그인이 필요합니다', '모임 멤버, 초대, 가입요청은 계정 기준으로 관리됩니다.', '/groups')}
            className="w-full border-b border-border/60 px-1 py-4 text-left transition-colors last:border-b-0 hover:bg-muted/25"
          >
            <div className="flex items-center gap-3">
              <GroupAvatar name={group.name} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate text-sm font-bold text-foreground">{group.name}</p>
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{group.visibility}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">멤버 {group.members}명</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
            <div className="ml-[3.25rem] mt-2 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 shrink-0 text-category-group" />
              <p className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">{group.nextTitle}</p>
              <span className="shrink-0 text-[10px] font-bold text-category-group">{group.nextLabel}</span>
            </div>
          </button>
        ))}
      </div>
    </section>

    <section className="-mx-5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="px-5 text-sm font-bold text-foreground">일정({groupSchedules.length}개)</h3>
      </div>
      <ScheduleStrip
        groups={groupedGroupSchedules}
        onScheduleClick={() => onRequireLogin('모임 일정 상세를 보려면 로그인이 필요합니다', '선택된 멤버의 캘린더에도 모임 일정이 저장됩니다.', '/groups')}
        emptyMessage="예정된 모임 일정이 없습니다"
      />
    </section>

    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">시간 조율(1개)</h3>
      </div>
      <div className="border-y border-border/60">
        <button
          type="button"
          onClick={() => onRequireLogin('시간 조율을 시작하려면 로그인이 필요합니다', '멤버들이 가능한 시간을 선택하면 모두 가능한 시간을 추천합니다.', '/groups')}
          className="flex w-full items-center gap-3 px-1 py-3.5 text-left transition-colors hover:bg-muted/25"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-coord-green/10">
            <Clock className="h-4 w-4 text-coord-green" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground">주말 모임 시간 정하기</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">5명이 겹친 후보 시간이 있어요</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </div>
    </section>

    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">모임 둘러보기</h3>
        <UserPlus className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="border-y border-border/60">
        {demoDiscoverGroups.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => onRequireLogin('공개 모임에 가입하려면 로그인이 필요합니다', '프로필과 인삿말을 보낸 뒤 관리자의 승인을 받을 수 있습니다.', '/groups?tab=discover')}
            className="w-full border-b border-border/60 px-1 py-4 text-left transition-colors last:border-b-0 hover:bg-muted/25"
          >
            <div className="flex items-start gap-3">
              <GroupAvatar name={group.name} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-foreground">{group.name}</h3>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">멤버 {group.members}명</p>
                  </div>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
                <p className="mt-2 line-clamp-1 text-xs leading-5 text-muted-foreground">{group.description}</p>
              </div>
            </div>
          </button>
        ))}
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
  stage: CoordinationDemoStage;
  onStageChange: (stage: CoordinationDemoStage) => void;
  onRequireLogin: (title: string, description: string, redirect: string) => void;
}

const CoordinationDemo: React.FC<CoordinationDemoProps> = ({
  dates,
  hours,
  slots,
  selectedSlot,
  selectedSlotKey,
  onSelectSlot,
  stage,
  onStageChange,
  onRequireLogin,
}) => {
  const memberMap = useMemo(() => new Map(demoMembers.map((member) => [member.id, member])), []);
  const [mySlotKeys, setMySlotKeys] = useState(() => new Set([
    `${dates[0]}-19`,
    `${dates[1]}-19`,
    `${dates[1]}-20`,
    `${dates[2]}-19`,
  ]));
  const maxVotes = Math.max(...slots.map((slot) => slot.voterIds.length), 1);
  const existingScheduleKeys = useMemo(() => new Map([
    [`${dates[0]}-18`, '저녁 약속'],
    [`${dates[1]}-20`, '운동'],
  ]), [dates]);

  const findSlot = (date: string, hour: number) => slots.find((slot) => slot.date === date && slot.hour === hour);
  const toggleMySlot = (key: string) => {
    setMySlotKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const getSlotStyle = (votes: number, isSelected: boolean): React.CSSProperties => {
    if (votes === 0) {
      return { backgroundColor: 'hsl(var(--muted) / 0.45)' };
    }

    const ratio = votes / maxVotes;
    const lightness = 92 - ratio * 48;
    const foreground = ratio >= 0.72 ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))';

    return {
      backgroundColor: `hsl(160 55% ${lightness}%)`,
      color: foreground,
      boxShadow: isSelected ? 'inset 0 0 0 2px hsl(var(--foreground) / 0.28)' : undefined,
    };
  };

  return (
    <>
      <section className="grid grid-cols-2 rounded-2xl bg-muted p-1">
        <button
          type="button"
          onClick={() => onStageChange('mine')}
          className={`rounded-xl py-2.5 text-xs font-bold transition-colors ${stage === 'mine' ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground'}`}
        >
          내 가능 시간
        </button>
        <button
          type="button"
          onClick={() => onStageChange('all')}
          className={`rounded-xl py-2.5 text-xs font-bold transition-colors ${stage === 'all' ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground'}`}
        >
          모두 가능한 시간
        </button>
      </section>

      {stage === 'mine' ? (
        <>
          <section className="border-b border-border/60 pb-3">
            <p className="text-xs font-semibold text-primary">내 가능 시간 투표</p>
            <h2 className="mt-1 text-base font-bold text-foreground">내 일정을 보면서 빈 시간을 고릅니다</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              반투명 블록은 이미 잡힌 일정이고, 초록색은 내가 가능하다고 선택한 시간입니다.
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
                  const key = `${date}-${hour}`;
                  const existingTitle = existingScheduleKeys.get(key);
                  const selected = mySlotKeys.has(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleMySlot(key)}
                      className="relative min-h-[64px] overflow-hidden border-r border-border px-1.5 py-2 text-left transition-transform last:border-r-0 active:scale-[0.97]"
                    >
                      {existingTitle ? (
                        <div className="absolute inset-1 rounded-lg bg-category-group/25 px-1.5 py-1">
                          <p className="truncate text-[10px] font-bold text-category-group-strong">{existingTitle}</p>
                        </div>
                      ) : null}
                      {selected ? (
                        <div className="absolute inset-1 rounded-lg bg-coord-green/70 shadow-sm" />
                      ) : null}
                      <span className={`relative z-10 text-[10px] font-bold ${selected ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                        {selected ? '가능' : existingTitle ? '겹침' : '선택'}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </section>

        </>
      ) : (
        <>
          <section className="border-b border-border/60 pb-3">
            <p className="text-xs font-semibold text-primary">모두 가능한 시간</p>
            <h2 className="mt-1 text-base font-bold text-foreground">겹치는 시간이 진하게 표시됩니다</h2>
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
              const isSelected = selectedSlotKey === key;
              const strong = votes / maxVotes >= 0.72;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSelectSlot(key)}
                  className="min-h-[58px] border-r border-border px-1 py-2 text-center transition-transform last:border-r-0 active:scale-[0.97]"
                  style={getSlotStyle(votes, isSelected)}
                >
                  <span className="font-num text-sm font-bold">{votes}</span>
                  <span className={`ml-0.5 text-[10px] ${strong ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>명</span>
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
        <ScrollableFadeList maxHeightClassName="max-h-[128px]" contentClassName="grid grid-cols-5 gap-x-2 gap-y-3 space-y-0" viewportClassName="pr-1">
          {selectedSlot.voterIds.map((memberId) => {
            const member = memberMap.get(memberId);
            if (!member) return null;
            return (
              <div key={member.id} className="flex min-w-0 flex-col items-center">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={member.avatarUrl} alt={member.name} className="object-cover" />
                  <AvatarFallback className="text-xs font-bold text-foreground">{getMemberInitial(member.name)}</AvatarFallback>
                </Avatar>
                <span className="mt-1 max-w-full truncate text-[10px] font-semibold text-foreground">{member.name}</span>
              </div>
            );
          })}
        </ScrollableFadeList>
      </section>

      <button
        type="button"
        onClick={() => onRequireLogin('모임 일정으로 확정하려면 로그인이 필요합니다', '확정된 일정은 모임 멤버에게 공유되고 알림센터에 남습니다.', '/schedule/new')}
        className="w-full rounded-2xl bg-category-group py-3.5 text-sm font-bold text-primary-foreground shadow-soft"
      >
        추천 시간으로 모임 일정 만들기
      </button>
        </>
      )}
    </>
  );
};

interface CalendarDemoProps {
  schedules: Schedule[];
  onRequireLogin: (title: string, description: string, redirect: string) => void;
}

const CalendarDemo: React.FC<CalendarDemoProps> = ({ schedules, onRequireLogin }) => {
  const today = new Date();
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays = [
    ...Array.from({ length: firstDay }, () => null as number | null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  const getSchedulesForDay = (day: number) => {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return schedules.filter((schedule) => toLocalDateKey(schedule.startTime) === dateKey);
  };

  const selectedSchedules = getSchedulesForDay(selectedDay);

  return (
    <>
      <section className="border-b border-border/60 pb-3">
        <p className="text-xs font-semibold text-primary">캘린더</p>
        <h2 className="mt-1 text-base font-bold text-foreground">월간 흐름에서 일정을 확인합니다</h2>
      </section>

      <section className="rounded-2xl border border-border bg-card p-3 shadow-soft">
        <div className="mb-3 flex items-center justify-center">
          <h3 className="text-sm font-bold text-foreground">{year}년 {month + 1}월</h3>
        </div>
        <div className="grid grid-cols-7">
          {calendarDayLabels.map((label) => (
            <div key={label} className="py-1 text-center text-[10px] font-semibold text-muted-foreground">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-0.5">
          {calendarDays.map((day, index) => {
            if (day === null) return <div key={`blank-${index}`} className="min-h-[52px]" />;
            const daySchedules = getSchedulesForDay(day);
            const isToday = day === today.getDate();
            const isSelected = day === selectedDay;
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`flex min-h-[52px] flex-col items-center rounded-lg px-1 py-1.5 transition-colors ${isSelected ? 'bg-primary/10' : 'hover:bg-muted'}`}
              >
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                  {day}
                </span>
                <div className="mt-1 flex w-full flex-col gap-0.5">
                  {daySchedules.slice(0, 2).map((schedule) => (
                    <span key={schedule.id} className="h-1 rounded-full" style={getScheduleColorStyle(schedule, 'line')} />
                  ))}
                  {daySchedules.length > 2 ? (
                    <span className="text-center text-[8px] font-semibold text-muted-foreground">+{daySchedules.length - 2}</span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-bold text-foreground">{month + 1}월 {selectedDay}일 일정</h3>
        {selectedSchedules.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">
            이 날은 샘플 일정이 없습니다.
          </p>
        ) : (
          <div className="border-y border-border/60">
            {selectedSchedules.map((schedule) => (
              <button
                key={schedule.id}
                type="button"
                onClick={() => onRequireLogin('캘린더 일정 상세를 보려면 로그인이 필요합니다', '월간 캘린더에서 일정 수정과 알림 관리를 이어가려면 로그인해주세요.', '/calendar')}
                className="flex w-full items-center gap-3 border-b border-border/60 px-1 py-3.5 text-left transition-colors last:border-b-0 hover:bg-muted/25"
              >
                <span className="h-9 w-1 shrink-0 rounded-full" style={getScheduleColorStyle(schedule, 'line')} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{schedule.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {formatScheduleClock(schedule.startTime)} · {formatDurationLabel(schedule.duration)}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </section>
    </>
  );
};

export default DemoPage;
