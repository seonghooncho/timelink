import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, ChevronDown, ChevronRight, ChevronUp, Copy, Link as LinkIcon, LogOut, Menu, UserPlus } from 'lucide-react';
import MobileLayout from '@/components/layout/MobileLayout';
import PageHeader from '@/components/layout/PageHeader';
import ConfirmModal from '@/components/common/ConfirmModal';
import GroupAvatar from '@/components/common/GroupAvatar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useGroups } from '@/hooks/useGroups';
import { useSchedules } from '@/hooks/useSchedules';
import { coordinationApi, CoordinationResponse as CoordResp, groupApi, GroupMemberResponse } from '@/services/api';
import { getPublicAppOrigin } from '@/lib/appOrigin';
import { appToast } from '@/lib/appToast';

const MEMBER_PREVIEW_LIMIT = 3;
const GROUP_SCHEDULE_PREVIEW_LIMIT = 3;
const COORDINATION_PREVIEW_LIMIT = 2;

const getRoleLabel = (role: string) => (role === 'manager' ? '관리자' : '멤버');

const getCategoryLabel = (category: string) => {
  switch (category) {
    case 'task':
      return '할 일';
    case 'appointment':
      return '약속';
    case 'group':
      return '그룹';
    case 'important':
      return '중요';
    case 'repeat':
      return '반복';
    default:
      return '일정';
  }
};

const GroupDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { setSelectedSchedule, setShowScheduleDetail } = useApp();
  const { data: groups = [] } = useGroups();
  const { data: schedules = [] } = useSchedules();
  const [showMenu, setShowMenu] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [coordinations, setCoordinations] = useState<CoordResp[]>([]);
  const [members, setMembers] = useState<GroupMemberResponse[]>([]);
  const [membersExpanded, setMembersExpanded] = useState(false);
  const [groupSchedulesExpanded, setGroupSchedulesExpanded] = useState(false);
  const [coordinationsExpanded, setCoordinationsExpanded] = useState(false);

  const group = groups.find((item) => item.id === id);
  const groupSchedules = schedules.filter((schedule) => schedule.groupId === id);

  useEffect(() => {
    if (!id) return;
    coordinationApi.getAll(id, 'active').then(setCoordinations).catch(() => setCoordinations([]));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    groupApi.getMembers(id).then(setMembers).catch(() => setMembers([]));
  }, [id]);

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      if (a.role !== b.role) {
        return a.role === 'manager' ? -1 : 1;
      }
      return a.joinedAt.localeCompare(b.joinedAt);
    });
  }, [members]);

  const sortedGroupSchedules = useMemo(() => {
    return [...groupSchedules].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [groupSchedules]);

  const memberCount = members.length || group?.memberCount || 0;
  const previewMembers = sortedMembers.slice(0, MEMBER_PREVIEW_LIMIT);
  const visibleGroupSchedules = groupSchedulesExpanded ? sortedGroupSchedules : sortedGroupSchedules.slice(0, GROUP_SCHEDULE_PREVIEW_LIMIT);
  const visibleCoordinations = coordinationsExpanded ? coordinations : coordinations.slice(0, COORDINATION_PREVIEW_LIMIT);
  const inviteLink = group?.inviteCode ? `${getPublicAppOrigin()}/groups/join/${group.inviteCode}` : '';

  const formatJoinedAt = (joinedAt: string) => {
    const date = new Date(joinedAt);
    return `${date.getMonth() + 1}.${String(date.getDate()).padStart(2, '0')} 참여`;
  };

  const getMemberFallback = (member: GroupMemberResponse) => {
    const source = member.nickname || member.userId;
    return source.slice(0, 1).toUpperCase();
  };

  const formatScheduleRange = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const date = `${start.getMonth() + 1}.${String(start.getDate()).padStart(2, '0')}`;
    const startLabel = `${start.getHours()}:${String(start.getMinutes()).padStart(2, '0')}`;
    const endLabel = `${end.getHours()}:${String(end.getMinutes()).padStart(2, '0')}`;
    return `${date} · ${startLabel} - ${endLabel}`;
  };

  const formatHourLabel = (hour: number) => `${hour}:00`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      appToast.success('링크가 복사되었습니다');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      appToast.error('링크 복사에 실패했습니다', error);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${group?.name} 그룹 초대`,
          text: `${group?.name} 그룹에 참여하세요!`,
          url: inviteLink,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        appToast.error('공유에 실패했습니다', error);
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
    } catch (error) {
      appToast.error('그룹 나가기에 실패했습니다', error);
    }
  };

  if (!group) {
    return (
      <MobileLayout>
        <div className="p-8 text-center text-muted-foreground">그룹을 찾을 수 없습니다</div>
      </MobileLayout>
    );
  }

  const handleScheduleClick = (schedule: typeof schedules[number]) => {
    setSelectedSchedule(schedule);
    setShowScheduleDetail(true);
  };

  return (
    <MobileLayout>
      <PageHeader
        title="나의 그룹"
        showBack
        rightElement={
          <button onClick={() => setShowMenu(!showMenu)} className="p-1 text-muted-foreground">
            <Menu className="w-5 h-5" />
          </button>
        }
      />

      {showMenu && (
        <div className="absolute right-4 top-12 z-50 w-44 rounded-xl border border-border bg-card py-1 shadow-lg animate-fade-in">
          <button
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted"
            onClick={() => {
              setShowMenu(false);
              setShowInviteModal(true);
            }}
          >
            <UserPlus className="w-4 h-4" /> 멤버 초대
          </button>
          <button
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted"
            onClick={() => {
              setShowMenu(false);
              handleShare();
            }}
          >
            <LinkIcon className="w-4 h-4" /> 링크 공유
          </button>
          <button
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-muted"
            onClick={() => {
              setShowMenu(false);
              setShowLeaveConfirm(true);
            }}
          >
            <LogOut className="w-4 h-4" /> 그룹 나가기
          </button>
        </div>
      )}

      <div className="mx-4 mt-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <GroupAvatar image={group.image} name={group.name} size="md" />
          <div className="flex-1">
            <h2 className="text-base font-bold text-foreground">{group.name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{group.description}</p>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
            멤버 {memberCount}명
          </span>
        </div>
      </div>

      <div className="mt-6 px-4">
        <div className="rounded-2xl border border-border bg-card px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="shrink-0">
              <h3 className="text-sm font-bold text-foreground">참여 멤버</h3>
              <p className="mt-1 text-[11px] text-muted-foreground">({memberCount}명)</p>
            </div>

            {previewMembers.length > 0 ? (
              <div className="min-w-0 flex flex-1 justify-end overflow-hidden">
                <div className="flex max-w-full justify-end gap-2 overflow-hidden">
                  {previewMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex shrink-0 items-center gap-2 rounded-full border border-border/80 bg-muted/60 py-1.5 pl-1.5 pr-2.5"
                    >
                      <Avatar className="h-7 w-7 border border-border/70">
                        <AvatarImage src={member.avatarUrl} alt={member.nickname || member.userId} />
                        <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
                          {getMemberFallback(member)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="max-w-[72px] truncate text-[11px] font-semibold text-foreground">
                          {member.nickname || member.userId}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{getRoleLabel(member.role)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">아직 참여 멤버가 없습니다.</p>
            )}

            {sortedMembers.length > MEMBER_PREVIEW_LIMIT ? (
              <button
                type="button"
                onClick={() => setMembersExpanded((prev) => !prev)}
                className="shrink-0 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                {membersExpanded ? '접기' : '더보기'}
              </button>
            ) : null}
          </div>

          {membersExpanded ? (
            <div className="mt-3 space-y-2 border-t border-border/70 pt-3">
              {sortedMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background px-3.5 py-3"
                >
                  <Avatar className="h-11 w-11 border border-border/70">
                    <AvatarImage src={member.avatarUrl} alt={member.nickname || member.userId} />
                    <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                      {getMemberFallback(member)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {member.nickname || member.userId}
                      </p>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {getRoleLabel(member.role)}
                      </span>
                      {member.userId === userId ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          나
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{formatJoinedAt(member.joinedAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowInviteModal(false)}>
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-card p-5 animate-fade-in" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-base font-bold text-foreground mb-1">멤버 초대</h3>
            <p className="text-xs text-muted-foreground mb-4">아래 링크를 공유하여 멤버를 초대하세요</p>
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-muted p-3">
              <p className="flex-1 truncate text-xs text-foreground">{inviteLink}</p>
              <button onClick={handleCopyLink} className="rounded-lg bg-primary p-2 text-primary-foreground transition-colors hover:bg-primary/90">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowInviteModal(false)} className="flex-1 rounded-xl bg-muted py-2.5 text-sm font-semibold text-foreground">
                닫기
              </button>
              <button onClick={handleShare} className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground">
                공유하기
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 px-4">
        <div className="rounded-2xl border border-border bg-card px-4 py-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">그룹 일정 ({sortedGroupSchedules.length}개)</h3>
              <p className="mt-1 text-[11px] text-muted-foreground">기본으로 최근 일정 3개만 보여줍니다.</p>
            </div>
            {sortedGroupSchedules.length > GROUP_SCHEDULE_PREVIEW_LIMIT ? (
              <button
                type="button"
                onClick={() => setGroupSchedulesExpanded((prev) => !prev)}
                className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                {groupSchedulesExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {groupSchedulesExpanded ? '접기' : '더보기'}
              </button>
            ) : null}
          </div>

          {visibleGroupSchedules.length > 0 ? (
            <div className="space-y-2">
              {visibleGroupSchedules.map((schedule) => (
                <button
                  key={schedule.id}
                  type="button"
                  onClick={() => handleScheduleClick(schedule)}
                  className="w-full rounded-2xl border border-border/70 bg-background px-3.5 py-3 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium text-muted-foreground">
                        {formatScheduleRange(schedule.startTime, schedule.endTime)}
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold text-foreground">{schedule.title}</p>
                      {groupSchedulesExpanded && schedule.content ? (
                        <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{schedule.content}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                      {getCategoryLabel(schedule.category)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-border px-4 py-5 text-xs text-muted-foreground">
              그룹 일정이 없습니다.
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 px-4">
        <div className="rounded-2xl border border-border bg-card px-4 py-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">조율 중인 일정 ({coordinations.length}개)</h3>
              <p className="mt-1 text-[11px] text-muted-foreground">기본으로 진행 중인 조율 2개만 보여줍니다.</p>
            </div>
            {coordinations.length > COORDINATION_PREVIEW_LIMIT ? (
              <button
                type="button"
                onClick={() => setCoordinationsExpanded((prev) => !prev)}
                className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                {coordinationsExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {coordinationsExpanded ? '접기' : '더보기'}
              </button>
            ) : null}
          </div>

          {visibleCoordinations.length > 0 ? (
            <div className="space-y-2">
              {visibleCoordinations.map((coord) => (
                <button
                  key={coord.id}
                  type="button"
                  onClick={() => navigate(`/groups/${id}/coordination/${coord.id}/timetable`)}
                  className="w-full rounded-2xl border border-border/70 bg-background px-3.5 py-3 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium text-muted-foreground">
                        {coord.mode === 'repeat' ? '반복 조율' : '일회성 조율'} · {coord.dates.length}일
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold text-foreground">{coord.title}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        응답 {coord.responseCount}건 · {formatHourLabel(coord.startHour)} - {formatHourLabel(coord.endHour)}
                      </p>
                    </div>
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-border px-4 py-5 text-xs text-muted-foreground">
              조율 중인 일정이 없습니다.
            </p>
          )}
        </div>
      </div>

      <div className="mx-4 mt-6 space-y-2.5">
        <button
          onClick={() => navigate(`/groups/${id}/coordination`)}
          className="w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          시간 조율하기
        </button>
        <button
          onClick={() => navigate('/schedule/new', { state: { groupId: id, groupName: group.name } })}
          className="w-full rounded-xl bg-category-group py-3.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          그룹 일정 생성
        </button>
      </div>

      <div className="h-24" />

      <ConfirmModal
        open={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={handleLeave}
        title="그룹을 나가시겠습니까?"
        description="그룹에서 나가면 다시 초대받아야 합니다."
        confirmLabel="나가기"
        cancelLabel="취소"
        variant="destructive"
      />
    </MobileLayout>
  );
};

export default GroupDetailPage;
