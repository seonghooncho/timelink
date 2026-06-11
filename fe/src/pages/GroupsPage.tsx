import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Bell, Plus, UserPlus, Users } from 'lucide-react';
import MobileLayout from '@/components/layout/MobileLayout';
import PageHeader from '@/components/layout/PageHeader';
import GroupAvatar from '@/components/common/GroupAvatar';
import FAB from '@/components/common/FAB';
import { useGroupPages } from '@/hooks/useGroups';

const GroupsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    data: groups = [],
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGroupPages();

  return (
    <MobileLayout>
      <PageHeader title="나의 그룹" rightElement={
        <button onClick={() => navigate('/notifications')} className="p-2 rounded-xl text-muted-foreground hover:bg-muted transition-all">
          <Bell className="w-5 h-5" />
        </button>
      } />
      <div className="px-5 py-4 space-y-2.5">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : groups.length === 0 ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Users className="h-7 w-7" />
            </div>
            <h2 className="mt-5 text-lg font-bold text-foreground">아직 참여한 그룹이 없습니다</h2>
            <p className="mt-2 max-w-[280px] text-sm leading-6 text-muted-foreground">
              스터디, 팀, 모임을 만들면 함께 가능한 시간을 조율하고 그룹 일정을 바로 등록할 수 있어요.
            </p>

            <button
              type="button"
              onClick={() => navigate('/groups/new')}
              className="mt-6 flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              그룹 만들기
            </button>

            <div className="mt-4 flex max-w-xs items-start gap-2 rounded-xl bg-muted px-3 py-3 text-left">
              <UserPlus className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-[11px] leading-5 text-muted-foreground">
                초대를 받았다면 공유받은 링크를 열면 자동으로 그룹 참여 화면으로 이동합니다.
              </p>
            </div>
          </div>
        ) : (
          <>
            {groups.map(group => (
              <button key={group.id} onClick={() => navigate(`/groups/${group.id}`)}
                className="w-full flex items-center gap-4 p-4 bg-card rounded-2xl shadow-soft hover:shadow-card transition-all text-left pressable">
                <GroupAvatar image={group.image} name={group.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{group.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">멤버 {group.memberCount ?? 0}명</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
              </button>
            ))}
            {hasNextPage ? (
              <button
                type="button"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="w-full rounded-xl border border-border bg-card py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              >
                {isFetchingNextPage ? '불러오는 중...' : '그룹 더보기'}
              </button>
            ) : null}
          </>
        )}
      </div>
      {groups.length > 0 ? <FAB to="/groups/new" /> : null}
    </MobileLayout>
  );
};

export default GroupsPage;
