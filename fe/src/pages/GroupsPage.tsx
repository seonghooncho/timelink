import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bell, CalendarClock, ChevronRight, Plus, Search, UserPlus, Users, X } from 'lucide-react';
import MobileLayout from '@/components/layout/MobileLayout';
import PageHeader from '@/components/layout/PageHeader';
import GroupAvatar from '@/components/common/GroupAvatar';
import FAB from '@/components/common/FAB';
import { useGroupPages, usePublicGroupPages } from '@/hooks/useGroups';
import { Group } from '@/types/types';

type GroupTab = 'mine' | 'discover';

const GroupsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showDiscoverSearch, setShowDiscoverSearch] = useState(false);
  const [discoverQuery, setDiscoverQuery] = useState('');
  const activeTab = searchParams.get('tab') === 'discover' ? 'discover' : 'mine';
  const {
    data: groups = [],
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGroupPages();
  const {
    data: publicGroups = [],
    isLoading: isPublicLoading,
    fetchNextPage: fetchNextPublicPage,
    hasNextPage: hasNextPublicPage,
    isFetchingNextPage: isFetchingNextPublicPage,
  } = usePublicGroupPages(discoverQuery);
  const setActiveTab = (tab: GroupTab) => {
    if (tab === 'mine') {
      setSearchParams({}, { replace: true });
      return;
    }
    setSearchParams({ tab: 'discover' }, { replace: true });
  };

  const handleGroupAction = (group: Group) => {
    navigate(`/groups/${group.id}/intro`);
  };

  return (
    <MobileLayout>
      <PageHeader title="모임" rightElement={
        <button onClick={() => navigate('/notifications')} className="rounded-xl p-2 text-muted-foreground transition-all hover:bg-muted">
          <Bell className="h-5 w-5" />
        </button>
      } />

      <div className="px-5 py-4">
        <div className="grid grid-cols-2 rounded-2xl bg-muted p-1">
          <button
            type="button"
            onClick={() => setActiveTab('mine')}
            className={`rounded-xl py-2.5 text-sm font-bold transition-colors ${activeTab === 'mine' ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground'}`}
          >
            내 모임
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('discover')}
            className={`rounded-xl py-2.5 text-sm font-bold transition-colors ${activeTab === 'discover' ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground'}`}
          >
            둘러보기
          </button>
        </div>

        {activeTab === 'mine' ? (
          <MyGroupsTab
            groups={groups}
            isLoading={isLoading}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={() => fetchNextPage()}
            onDiscover={() => setActiveTab('discover')}
            onCreate={() => navigate('/groups/new')}
            onOpen={(groupId) => navigate(`/groups/${groupId}`)}
          />
        ) : (
          <DiscoverGroupsTab
            groups={publicGroups}
            isLoading={isPublicLoading}
            hasNextPage={hasNextPublicPage}
            isFetchingNextPage={isFetchingNextPublicPage}
            onLoadMore={() => fetchNextPublicPage()}
            onAction={handleGroupAction}
            onCreate={() => navigate('/groups/new')}
            showSearch={showDiscoverSearch}
            query={discoverQuery}
            onToggleSearch={() => {
              setShowDiscoverSearch((prev) => !prev);
              if (showDiscoverSearch) setDiscoverQuery('');
            }}
            onQueryChange={setDiscoverQuery}
          />
        )}
      </div>

      {activeTab === 'mine' && groups.length > 0 ? <FAB to="/groups/new" /> : null}
    </MobileLayout>
  );
};

interface MyGroupsTabProps {
  groups: Group[];
  isLoading: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onDiscover: () => void;
  onCreate: () => void;
  onOpen: (groupId: string) => void;
}

const MyGroupsTab: React.FC<MyGroupsTabProps> = ({
  groups,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onDiscover,
  onCreate,
  onOpen,
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex min-h-[56vh] flex-col items-center justify-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Users className="h-7 w-7" />
        </div>
        <h2 className="mt-5 text-lg font-bold text-foreground">아직 참여한 모임이 없습니다</h2>
        <p className="mt-2 max-w-[280px] text-sm leading-6 text-muted-foreground">
          모임을 만들거나 공개 모임을 둘러보며 함께 약속을 잡을 사람들을 찾아보세요.
        </p>

        <button
          type="button"
          onClick={onCreate}
          className="mt-6 flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          모임 만들기
        </button>

        <button
          type="button"
          onClick={onDiscover}
          className="mt-3 flex w-full max-w-xs items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-bold text-foreground transition-all active:scale-[0.98]"
        >
          <Search className="h-4 w-4" />
          모임 둘러보기
        </button>

        <div className="mt-4 flex max-w-xs items-start gap-2 rounded-xl bg-muted px-3 py-3 text-left">
          <UserPlus className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-[11px] leading-5 text-muted-foreground">
            초대를 받았다면 공유받은 링크를 열면 자동으로 모임 참여 화면으로 이동합니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2.5">
      {groups.map(group => (
        <button
          key={group.id}
          onClick={() => onOpen(group.id)}
          className="w-full rounded-2xl bg-card p-4 text-left shadow-soft transition-all pressable hover:shadow-card"
        >
          <div className="flex items-center gap-4">
            <GroupAvatar image={group.image} name={group.name} status={group.imageStatus} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <p className="min-w-0 truncate text-sm font-bold text-foreground">{group.name}</p>
                {group.visibility === 'PUBLIC' ? (
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    공개
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">멤버 {group.memberCount ?? 0}명</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          </div>

          {group.nextSchedule ? (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-muted px-3 py-2.5">
              <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
              <p className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                {group.nextSchedule.title}
              </p>
              <span className="shrink-0 rounded-full bg-card px-2 py-1 text-[10px] font-bold text-primary">
                {formatDday(group.nextSchedule.startTime)}
              </span>
            </div>
          ) : null}
        </button>
      ))}

      {hasNextPage ? (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={isFetchingNextPage}
          className="w-full rounded-xl border border-border bg-card py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          {isFetchingNextPage ? '불러오는 중...' : '모임 더보기'}
        </button>
      ) : (
        <button
          type="button"
          onClick={onDiscover}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 py-3 text-sm font-bold text-primary transition-colors hover:bg-primary/10"
        >
          더 둘러보기
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

interface DiscoverGroupsTabProps {
  groups: Group[];
  isLoading: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onAction: (group: Group) => void;
  onCreate: () => void;
  showSearch: boolean;
  query: string;
  onToggleSearch: () => void;
  onQueryChange: (value: string) => void;
}

const DiscoverGroupsTab: React.FC<DiscoverGroupsTabProps> = ({
  groups,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onAction,
  onCreate,
  showSearch,
  query,
  onToggleSearch,
  onQueryChange,
}) => (
  <div className="mt-4">
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Search className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-base font-bold text-foreground">공개 모임 찾아보기</h2>
            <button
              type="button"
              onClick={onToggleSearch}
              className="shrink-0 rounded-xl border border-border bg-background p-2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={showSearch ? '모임 검색 닫기' : '모임 검색 열기'}
            >
              {showSearch ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            관심 있는 모임에 인삿말을 보내면 관리자가 확인한 뒤 가입을 승인합니다.
          </p>
          {showSearch ? (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-muted px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground/60"
                placeholder="모임 이름이나 소개 검색"
                autoFocus
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>

    <div className="mt-4 space-y-2.5">
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-5 py-14 text-center">
          <Users className="h-8 w-8 text-muted-foreground" />
          <h3 className="mt-4 text-sm font-bold text-foreground">
            {query.trim() ? '검색된 모임이 없습니다' : '아직 공개 모임이 없습니다'}
          </h3>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {query.trim() ? '다른 검색어로 모임을 찾아보세요.' : '첫 공개 모임을 만들면 다른 사용자들이 발견할 수 있어요.'}
          </p>
          {!query.trim() ? (
            <button
              type="button"
              onClick={onCreate}
              className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground"
            >
              공개 모임 만들기
            </button>
          ) : null}
        </div>
      ) : (
        groups.map((group) => (
          <article key={group.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-start gap-3">
              <GroupAvatar image={group.image} name={group.name} status={group.imageStatus} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-foreground">{group.name}</h3>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">멤버 {group.memberCount ?? 0}명</p>
                  </div>
                </div>
                {group.description ? (
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{group.description}</p>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onAction(group)}
              className="mt-4 flex w-full items-center justify-center gap-1 rounded-xl border border-border bg-background py-2.5 text-xs font-bold text-foreground transition-colors hover:bg-muted"
            >
              {getDiscoverActionLabel(group)}
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </article>
        ))
      )}

      {!isLoading && hasNextPage ? (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={isFetchingNextPage}
          className="w-full rounded-xl border border-border bg-card py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          {isFetchingNextPage ? '불러오는 중...' : '공개 모임 더보기'}
        </button>
      ) : null}
    </div>
  </div>
);

const getDiscoverActionLabel = (group: Group) => {
  if (group.joinRequestStatus === 'PENDING') return '요청 완료';
  return '소개 보기';
};

const formatDday = (startTime: string) => {
  const target = new Date(startTime);
  const today = new Date();
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const diff = Math.round((targetDay - todayDay) / 86400000);
  if (diff === 0) return 'D-Day';
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
};

export default GroupsPage;
