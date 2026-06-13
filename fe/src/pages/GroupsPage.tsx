import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bell, CalendarClock, ChevronRight, Plus, Search, UserPlus, Users, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import MobileLayout from '@/components/layout/MobileLayout';
import PageHeader from '@/components/layout/PageHeader';
import GroupAvatar from '@/components/common/GroupAvatar';
import FAB from '@/components/common/FAB';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { groupApi, profileApi } from '@/services/api';
import { useGroupPages, usePublicGroupPages } from '@/hooks/useGroups';
import { Group } from '@/types/types';
import { appToast } from '@/lib/appToast';

type GroupTab = 'mine' | 'discover';

const GroupsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
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
  } = usePublicGroupPages();
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: profileApi.getMe,
  });
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedStatus = useMemo(() => selectedGroup?.joinRequestStatus ?? null, [selectedGroup]);

  const setActiveTab = (tab: GroupTab) => {
    if (tab === 'mine') {
      setSearchParams({}, { replace: true });
      return;
    }
    setSearchParams({ tab: 'discover' }, { replace: true });
  };

  const handleGroupAction = (group: Group) => {
    if (group.myRole || group.joinRequestStatus === 'APPROVED') {
      navigate(`/groups/${group.id}`);
      return;
    }
    if (group.joinRequestStatus === 'PENDING') {
      appToast.info('이미 가입요청을 보냈습니다');
      return;
    }
    setSelectedGroup(group);
    setMessage('');
  };

  const handleSubmitRequest = async () => {
    if (!selectedGroup) return;
    if (message.length > 200) {
      appToast.error('인삿말은 200자 이하로 입력해주세요');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await groupApi.requestToJoin(selectedGroup.id, message.trim());
      await queryClient.invalidateQueries({ queryKey: ['groups', 'public'] });
      setSelectedGroup(null);
      appToast.success(result.status === 'APPROVED' ? '이미 참여 중인 모임입니다' : '가입요청을 보냈습니다');
    } catch (error) {
      appToast.error('가입요청을 보내지 못했습니다', error);
    } finally {
      setIsSubmitting(false);
    }
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
          />
        )}
      </div>

      {activeTab === 'mine' && groups.length > 0 ? <FAB to="/groups/new" /> : null}

      {selectedGroup ? (
        <div className="fixed inset-x-0 top-0 app-layer-overlay flex items-end justify-center bg-black/50 app-bottom-sheet-root" onClick={() => setSelectedGroup(null)}>
          <div
            className="flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-card shadow-elevated animate-fade-in app-bottom-sheet-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
              <div className="min-w-0">
                <h3 className="truncate text-base font-bold text-foreground">가입요청 보내기</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{selectedGroup.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGroup(null)}
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-3.5 py-3">
                <Avatar className="h-11 w-11 border border-border/70">
                  <AvatarImage src={profile?.avatarUrl} alt={profile?.nickname || '내 프로필'} />
                  <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                    {(profile?.nickname || '나').slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{profile?.nickname || '내 프로필'}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">이 프로필로 관리자에게 요청됩니다.</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">인삿말</label>
                <Textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  maxLength={200}
                  rows={4}
                  className="resize-none rounded-xl bg-muted"
                  placeholder="어떤 모임을 기대하는지 짧게 남겨보세요."
                />
                <p className="text-right text-[10px] text-muted-foreground">{message.length}/200</p>
              </div>

              {selectedStatus ? (
                <p className="rounded-xl bg-muted px-3 py-2 text-[11px] text-muted-foreground">
                  현재 요청 상태: {selectedStatus}
                </p>
              ) : null}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedGroup(null)}
                  className="rounded-xl bg-muted py-3 text-sm font-semibold text-foreground"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSubmitRequest}
                  disabled={isSubmitting}
                  className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
                >
                  {isSubmitting ? '보내는 중...' : '요청 보내기'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
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
              <p className="truncate text-sm font-bold text-foreground">{group.name}</p>
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
}

const DiscoverGroupsTab: React.FC<DiscoverGroupsTabProps> = ({
  groups,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onAction,
  onCreate,
}) => (
  <div className="mt-4">
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Search className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-foreground">공개 모임 찾아보기</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            관심 있는 모임에 인삿말을 보내면 관리자가 확인한 뒤 가입을 승인합니다.
          </p>
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
          <h3 className="mt-4 text-sm font-bold text-foreground">아직 공개 모임이 없습니다</h3>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            첫 공개 모임을 만들면 다른 사용자들이 발견할 수 있어요.
          </p>
          <button
            type="button"
            onClick={onCreate}
            className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground"
          >
            공개 모임 만들기
          </button>
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
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    공개
                  </span>
                </div>
                {group.description ? (
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{group.description}</p>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onAction(group)}
              disabled={group.joinRequestStatus === 'PENDING'}
              className="mt-4 flex w-full items-center justify-center gap-1 rounded-xl border border-border bg-background py-2.5 text-xs font-bold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              {getDiscoverActionLabel(group)}
              {group.joinRequestStatus === 'PENDING' ? null : <ChevronRight className="h-3.5 w-3.5" />}
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
  if (group.myRole) return '모임 보기';
  if (group.joinRequestStatus === 'PENDING') return '요청 완료';
  if (group.joinRequestStatus === 'APPROVED') return '모임 보기';
  return '가입 요청';
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
