import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Menu, Link as LinkIcon, LogOut, UserPlus, ChevronRight, Copy, Check } from 'lucide-react';
import MobileLayout from '@/components/layout/MobileLayout';
import PageHeader from '@/components/layout/PageHeader';
import ScheduleStrip from '@/components/schedule/ScheduleStrip';
import ConfirmModal from '@/components/common/ConfirmModal';
import GroupAvatar from '@/components/common/GroupAvatar';
import { useApp } from '@/context/AppContext';
import { useGroupedSchedules } from '@/hooks/useGroupedSchedules';
import { useGroups } from '@/hooks/useGroups';
import { useSchedules, useUpdateSchedule } from '@/hooks/useSchedules';
import { groupApi, coordinationApi, CoordinationResponse as CoordResp } from '@/services/api';
import { toast } from 'sonner';

const GroupDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setSelectedSchedule, setShowScheduleDetail } = useApp();
  const { data: groups = [] } = useGroups();
  const { data: schedules = [] } = useSchedules();
  const updateMutation = useUpdateSchedule();
  const [showMenu, setShowMenu] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [coordinations, setCoordinations] = useState<CoordResp[]>([]);

  const group = groups.find(g => g.id === id);
  const groupSchedules = schedules.filter(s => s.groupId === id);
  const groupedSchedules = useGroupedSchedules(groupSchedules);

  useEffect(() => {
    if (!id) return;
    coordinationApi.getAll(id, 'active').then(setCoordinations).catch(() => setCoordinations([]));
  }, [id]);

  const inviteLink = group?.inviteCode
    ? `${window.location.origin}/groups/join/${group.inviteCode}`
    : '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success('링크가 복사되었습니다');
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error('링크 복사에 실패했습니다'); }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${group?.name} 그룹 초대`, text: `${group?.name} 그룹에 참여하세요!`, url: inviteLink });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        toast.error('공유에 실패했습니다');
      }
    } else {
      handleCopyLink();
    }
  };

  const handleLeave = async () => {
    if (!id) return;
    try {
      await groupApi.leaveGroup(id);
      setShowLeaveConfirm(false);
      navigate('/groups');
    } catch { toast.error('그룹 나가기에 실패했습니다'); }
  };

  if (!group) return <MobileLayout><div className="p-8 text-center text-muted-foreground">그룹을 찾을 수 없습니다</div></MobileLayout>;

  const handleScheduleClick = (schedule: typeof schedules[0]) => { setSelectedSchedule(schedule); setShowScheduleDetail(true); };
  const handleComplete = (schedule: typeof schedules[0]) => { updateMutation.mutate({ id: schedule.id, data: { isCompleted: !schedule.isCompleted } }); };

  return (
    <MobileLayout>
      <PageHeader title="나의 그룹" showBack rightElement={
        <button onClick={() => setShowMenu(!showMenu)} className="p-1 text-muted-foreground"><Menu className="w-5 h-5" /></button>
      } />

      {showMenu && (
        <div className="absolute right-4 top-12 z-50 bg-card border border-border rounded-xl shadow-lg py-1 w-44 animate-fade-in">
          <button className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted" onClick={() => { setShowMenu(false); setShowInviteModal(true); }}>
            <UserPlus className="w-4 h-4" /> 멤버 초대
          </button>
          <button className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted" onClick={() => { setShowMenu(false); handleShare(); }}>
            <LinkIcon className="w-4 h-4" /> 링크 공유
          </button>
          <button className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-muted" onClick={() => { setShowMenu(false); setShowLeaveConfirm(true); }}>
            <LogOut className="w-4 h-4" /> 그룹 나가기
          </button>
        </div>
      )}

      <div className="mx-4 mt-4 p-4 bg-card rounded-2xl border border-border">
        <div className="flex items-center gap-3">
          <GroupAvatar image={group.image} name={group.name} size="md" />
          <div className="flex-1">
            <h2 className="text-base font-bold text-foreground">{group.name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{group.description}</p>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
            멤버 {group.memberCount}명
          </span>
        </div>
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowInviteModal(false)}>
          <div className="mx-4 w-full max-w-sm bg-card rounded-2xl p-5 animate-fade-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-foreground mb-1">멤버 초대</h3>
            <p className="text-xs text-muted-foreground mb-4">아래 링크를 공유하여 멤버를 초대하세요</p>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-xl mb-4">
              <p className="flex-1 text-xs text-foreground truncate">{inviteLink}</p>
              <button onClick={handleCopyLink} className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowInviteModal(false)} className="flex-1 py-2.5 bg-muted text-foreground rounded-xl text-sm font-semibold">닫기</button>
              <button onClick={handleShare} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold">공유하기</button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-sm font-bold text-foreground mb-2 px-4">그룹 일정</h3>
        <ScheduleStrip groups={groupedSchedules} onScheduleClick={handleScheduleClick} onComplete={handleComplete} emptyMessage="그룹 일정이 없습니다" />
      </div>

      <div className="mt-6 px-4">
        <h3 className="text-sm font-bold text-foreground mb-3">조율 중인 일정</h3>
        {coordinations.length > 0 ? (
          <div className="space-y-2">
            {coordinations.map(coord => (
              <button key={coord.id} onClick={() => navigate(`/groups/${id}/coordination/${coord.id}/timetable`)}
                className="w-full flex items-center justify-between p-4 bg-card rounded-xl border border-border hover:bg-muted/50 transition-colors text-left">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">{group.name} &gt;</p>
                  <p className="text-sm font-semibold text-foreground">{coord.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{coord.dates.length}일 · 응답 {coord.responseCount}건</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground/60 py-3">조율 중인 일정이 없습니다</p>
        )}
      </div>

      <div className="mx-4 mt-6 space-y-2.5">
        <button onClick={() => navigate(`/groups/${id}/coordination`)} className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">시간 조율하기</button>
        <button
          onClick={() => navigate('/schedule/new', { state: { groupId: id, groupName: group.name } })}
          className="w-full py-3.5 bg-category-group text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
        >
          그룹 일정 생성
        </button>
      </div>

      <div className="h-24" />

      <ConfirmModal open={showLeaveConfirm} onClose={() => setShowLeaveConfirm(false)} onConfirm={handleLeave}
        title="그룹을 나가시겠습니까?" description="그룹에서 나가면 다시 초대받아야 합니다." confirmLabel="나가기" cancelLabel="취소" variant="destructive" />
    </MobileLayout>
  );
};

export default GroupDetailPage;
