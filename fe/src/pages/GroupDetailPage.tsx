import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Check, ChevronRight, Copy, Heart, Info, LogOut, Menu, MessageCircle, UserMinus, UserPlus, Users, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import MobileLayout from '@/components/layout/MobileLayout';
import PageHeader from '@/components/layout/PageHeader';
import ConfirmModal from '@/components/common/ConfirmModal';
import FAB from '@/components/common/FAB';
import GroupAvatar from '@/components/common/GroupAvatar';
import ImageCropModal from '@/components/common/ImageCropModal';
import ScrollableFadeList from '@/components/common/ScrollableFadeList';
import PostListItem from '@/components/community/PostListItem';
import PostComposerModal from '@/components/community/PostComposerModal';
import GroupMemberProfileSheet from '@/components/group/GroupMemberProfileSheet';
import CoordinationStrip from '@/components/coordination/CoordinationStrip';
import ScheduleStrip from '@/components/schedule/ScheduleStrip';
import ScheduleDetailModal from '@/components/schedule/ScheduleDetailModal';
import { ListSkeleton, ScheduleStripSkeleton } from '@/components/common/LoadingStates';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useGroups } from '@/hooks/useGroups';
import {
  useCreateGroupPost,
  useGroupPosts,
  useToggleGroupPostLike,
} from '@/hooks/useCommunity';
import { fetchScheduleDetail, mapScheduleResponse, useDeleteSchedule, useLeaveGroupSchedule, useUpdateSchedule } from '@/hooks/useSchedules';
import {
  CommunityPostResponse,
  coordinationApi,
  CoordinationResponse as CoordResp,
  groupApi,
  groupPostApi,
  GroupJoinRequestResponse,
  GroupMemberProfileResponse,
  GroupMemberResponse,
} from '@/services/api';
import { getPublicAppOrigin } from '@/lib/appOrigin';
import { appToast } from '@/lib/appToast';
import { addLocalDays, toLocalDateTimeParam } from '@/lib/dateRange';
import { useGroupedSchedules } from '@/hooks/useGroupedSchedules';
import { uploadProcessedImage, validateImageFile, waitForImageProcessing } from '@/lib/images';
import { getScheduleEndDate } from '@/lib/scheduleTime';
import { Schedule, ScheduleParticipant } from '@/types/types';

const getRoleLabel = (role: string) => (role === 'manager' ? '관리자' : '멤버');

const GroupDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const { selectedSchedule, setSelectedSchedule, showScheduleDetail, setShowScheduleDetail } = useApp();
  const updateSchedule = useUpdateSchedule();
  const deleteSchedule = useDeleteSchedule();
  const leaveGroupSchedule = useLeaveGroupSchedule();
  const { data: groups = [], isPending: isGroupsPending, isLoading: isGroupsLoading } = useGroups();
  const menuRef = useRef<HTMLDivElement>(null);
  const groupScheduleRange = useMemo(() => {
    const today = new Date();
    return {
      startDate: toLocalDateTimeParam(addLocalDays(today, -30)),
      endDate: toLocalDateTimeParam(addLocalDays(today, 90), true),
      limit: 80,
    };
  }, []);
  const {
    data: groupSchedules = [],
    isPending: isSchedulesPending,
  } = useQuery({
    queryKey: ['groups', id, 'schedules', groupScheduleRange],
    queryFn: async () => {
      const page = await groupApi.getSchedules(id as string, {
        ...groupScheduleRange,
        limit: groupScheduleRange.limit,
      });
      return page.data.map(mapScheduleResponse);
    },
    enabled: Boolean(id),
  });
  const [showMenu, setShowMenu] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showManageMembersModal, setShowManageMembersModal] = useState(false);
  const [manageMembersTab, setManageMembersTab] = useState<'members' | 'joinRequests'>('members');
  const [kickTarget, setKickTarget] = useState<GroupMemberResponse | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const [joinRequests, setJoinRequests] = useState<GroupJoinRequestResponse[]>([]);
  const [isJoinRequestsLoading, setIsJoinRequestsLoading] = useState(false);
  const [decidingRequestUserId, setDecidingRequestUserId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [coordinations, setCoordinations] = useState<CoordResp[]>([]);
  const [coordinationNextCursor, setCoordinationNextCursor] = useState<string | null>(null);
  const [isCoordinationLoading, setIsCoordinationLoading] = useState(true);
  const [isFetchingMoreCoordinations, setIsFetchingMoreCoordinations] = useState(false);
  const [showClosedCoordinations, setShowClosedCoordinations] = useState(false);
  const [showPastSchedules, setShowPastSchedules] = useState(false);
  const [pastScheduleNudgeKey, setPastScheduleNudgeKey] = useState(0);
  const [confirmScheduleDelete, setConfirmScheduleDelete] = useState<Schedule | null>(null);
  const [members, setMembers] = useState<GroupMemberResponse[]>([]);
  const [memberProfile, setMemberProfile] = useState<GroupMemberProfileResponse | null>(null);
  const [showMemberProfileSheet, setShowMemberProfileSheet] = useState(false);
  const [memberProfileMode, setMemberProfileMode] = useState<'view' | 'edit'>('view');
  const [isMemberProfileLoading, setIsMemberProfileLoading] = useState(false);
  const [isMemberProfileSaving, setIsMemberProfileSaving] = useState(false);
  const [showPostComposer, setShowPostComposer] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postMemberOnly, setPostMemberOnly] = useState(false);
  const [postCropFile, setPostCropFile] = useState<File | null>(null);
  const [postImageFile, setPostImageFile] = useState<File | null>(null);
  const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
  const [isPostImageUploading, setIsPostImageUploading] = useState(false);
  const {
    data: groupPosts = [],
    isLoading: isGroupPostsLoading,
    fetchNextPage: fetchNextGroupPostPage,
    hasNextPage: hasNextGroupPostPage,
    isFetchingNextPage: isFetchingNextGroupPostPage,
  } = useGroupPosts(id);
  const createGroupPost = useCreateGroupPost(id || '');

  const group = groups.find((item) => item.id === id);
  const coordinationStatus = showClosedCoordinations ? 'closed' : 'active';

  const loadCoordinations = useCallback(async (cursor?: string | null) => {
    if (!id) return;
    if (cursor) {
      setIsFetchingMoreCoordinations(true);
    } else {
      setIsCoordinationLoading(true);
    }

    try {
      const page = await coordinationApi.getPage(id, { status: coordinationStatus, limit: 10, cursor });
      setCoordinations(prev => cursor ? [...prev, ...page.data] : page.data);
      setCoordinationNextCursor(page.meta?.nextCursor ?? null);
    } catch (error) {
      if (!cursor) {
        setCoordinations([]);
      }
      appToast.error('조율 목록을 불러오지 못했습니다', error);
    } finally {
      setIsCoordinationLoading(false);
      setIsFetchingMoreCoordinations(false);
    }
  }, [coordinationStatus, id]);

  useEffect(() => {
    setCoordinations([]);
    setCoordinationNextCursor(null);
    loadCoordinations(null);
  }, [loadCoordinations]);

  useEffect(() => {
    if (!id) return;
    groupApi.getMembers(id).then(setMembers).catch(() => setMembers([]));
  }, [id]);

  useEffect(() => {
    if (!showMenu) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!menuRef.current?.contains(target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [showMenu]);

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
  const nowTime = useMemo(() => Date.now(), []);
  const pastGroupSchedules = useMemo(() => {
    return sortedGroupSchedules.filter((schedule) => getScheduleEndDate(schedule).getTime() < nowTime);
  }, [nowTime, sortedGroupSchedules]);
  const upcomingGroupSchedules = useMemo(() => {
    return sortedGroupSchedules.filter((schedule) => getScheduleEndDate(schedule).getTime() >= nowTime);
  }, [nowTime, sortedGroupSchedules]);
  const visibleGroupSchedules = showPastSchedules ? sortedGroupSchedules : upcomingGroupSchedules;
  const groupedVisibleSchedules = useGroupedSchedules(visibleGroupSchedules);
  const firstUpcomingScheduleId = upcomingGroupSchedules[0]?.id;

  const memberCount = members.length || group?.memberCount || 0;
  const memberCountLabel = memberCount > 99 ? '99+' : String(memberCount);
  const currentMember = sortedMembers.find((member) => member.userId === userId);
  const isManager = currentMember?.role === 'manager' || group?.myRole === 'manager';
  const isCurrentGroupMember = Boolean(currentMember || group?.myRole);
  const groupScheduleCountLabel = `${visibleGroupSchedules.length}개`;
  const coordinationCountLabel = `${coordinations.length}${coordinationNextCursor ? '+' : ''}개`;
  const inviteLink = group?.inviteCode ? `${getPublicAppOrigin()}/invite/${group.inviteCode}` : '';

  const loadJoinRequests = useCallback(async () => {
    if (!id || !isManager) return;
    setIsJoinRequestsLoading(true);
    try {
      const requests = await groupApi.getJoinRequests(id);
      setJoinRequests(requests);
    } catch (error) {
      setJoinRequests([]);
      appToast.error('가입요청을 불러오지 못했습니다', error);
    } finally {
      setIsJoinRequestsLoading(false);
    }
  }, [id, isManager]);

  useEffect(() => {
    if (showManageMembersModal && manageMembersTab === 'joinRequests') {
      loadJoinRequests();
    }
  }, [loadJoinRequests, manageMembersTab, showManageMembersModal]);

  useEffect(() => {
    if (searchParams.get('panel') === 'joinRequests' && isManager) {
      setManageMembersTab('joinRequests');
      setShowManageMembersModal(true);
      setSearchParams({}, { replace: true });
    }
  }, [isManager, searchParams, setSearchParams]);

  useEffect(() => {
    return () => {
      if (postImagePreview) {
        URL.revokeObjectURL(postImagePreview);
      }
    };
  }, [postImagePreview]);

  const formatJoinedAt = (joinedAt: string) => {
    const date = new Date(joinedAt);
    return `${date.getMonth() + 1}.${String(date.getDate()).padStart(2, '0')} 참여`;
  };

  const getMemberFallback = (member: GroupMemberResponse) => {
    const source = member.nickname || member.userId;
    return source.slice(0, 1).toUpperCase();
  };

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
          title: `${group?.name} 모임 초대`,
          text: `${group?.name} 모임에 참여하세요!`,
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

  const openManageMembersModal = (tab: 'members' | 'joinRequests' = 'members') => {
    setManageMembersTab(tab);
    setShowManageMembersModal(true);
  };

  const openRoleBasedMemberPanel = () => {
    if (isManager) {
      openManageMembersModal('members');
      return;
    }
    setShowMembersModal(true);
  };

  const openMemberProfile = async (memberUserId: string, mode: 'view' | 'edit' = 'view') => {
    if (!id) return;
    setMemberProfileMode(mode);
    setMemberProfile(null);
    setShowMemberProfileSheet(true);
    setIsMemberProfileLoading(true);
    try {
      const profile = await groupApi.getMemberProfile(id, memberUserId);
      setMemberProfile(profile);
    } catch (error) {
      appToast.error('멤버 프로필을 불러오지 못했습니다', error);
      setShowMemberProfileSheet(false);
    } finally {
      setIsMemberProfileLoading(false);
    }
  };

  const openMemberProfileOrJoinPrompt = (memberUserId?: string) => {
    if (!memberUserId) return;
    if (!isCurrentGroupMember) {
      navigate(`/groups/${id}/intro`);
      return;
    }
    openMemberProfile(memberUserId);
  };

  const handleScheduleParticipantClick = (participant: ScheduleParticipant) => {
    openMemberProfileOrJoinPrompt(participant.userId);
  };

  const openMyMemberProfileEditor = () => {
    if (!userId) return;
    setShowMenu(false);
    openMemberProfile(userId, 'edit');
  };

  const handleSaveMyMemberProfile = async (data: { nickname?: string; avatarUrl?: string; imageId?: string }) => {
    if (!id) return;
    setIsMemberProfileSaving(true);
    try {
      const profile = await groupApi.updateMyMemberProfile(id, data);
      setMemberProfile(profile);
      setMembers(prev => prev.map(member => (
        member.userId === profile.userId
          ? {
            ...member,
            nickname: profile.nickname,
            avatarUrl: profile.avatarUrl,
            imageId: profile.imageId,
            imageStatus: profile.imageStatus,
          }
          : member
      )));
      await queryClient.invalidateQueries({ queryKey: ['groups'] });
      appToast.success('모임 프로필을 저장했습니다');
      return profile;
    } finally {
      setIsMemberProfileSaving(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!id || !kickTarget) return;

    setIsRemovingMember(true);
    try {
      await groupApi.removeMember(id, kickTarget.userId);
      setMembers(prev => prev.filter(member => member.userId !== kickTarget.userId));
      await queryClient.invalidateQueries({ queryKey: ['groups'] });
      appToast.success('멤버를 내보냈습니다');
      setKickTarget(null);
    } catch (error) {
      appToast.error('멤버를 내보내지 못했습니다', error);
    } finally {
      setIsRemovingMember(false);
    }
  };

  const handleDecideJoinRequest = async (request: GroupJoinRequestResponse, status: 'APPROVED' | 'REJECTED') => {
    if (!id) return;
    setDecidingRequestUserId(request.userId);
    try {
      await groupApi.decideJoinRequest(id, request.userId, status);
      setJoinRequests(prev => prev.filter(item => item.userId !== request.userId));
      if (status === 'APPROVED') {
        const nextMembers = await groupApi.getMembers(id);
        setMembers(nextMembers);
        await queryClient.invalidateQueries({ queryKey: ['groups'] });
        appToast.success('가입요청을 승인했습니다');
      } else {
        appToast.success('가입요청을 거절했습니다');
      }
    } catch (error) {
      appToast.error('가입요청을 처리하지 못했습니다', error);
    } finally {
      setDecidingRequestUserId(null);
    }
  };

  const handleLoadMoreCoordinations = useCallback(() => {
    if (!coordinationNextCursor || isFetchingMoreCoordinations) return;
    loadCoordinations(coordinationNextCursor);
  }, [coordinationNextCursor, isFetchingMoreCoordinations, loadCoordinations]);

  const handleLoadMoreGroupPosts = useCallback(() => {
    if (!hasNextGroupPostPage || isFetchingNextGroupPostPage) return;
    fetchNextGroupPostPage();
  }, [fetchNextGroupPostPage, hasNextGroupPostPage, isFetchingNextGroupPostPage]);

  const resetPostImage = () => {
    if (postImagePreview) {
      URL.revokeObjectURL(postImagePreview);
    }
    setPostImagePreview(null);
    setPostImageFile(null);
    setPostCropFile(null);
  };

  const handlePostImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationMessage = validateImageFile(file);
    if (validationMessage) {
      appToast.error(validationMessage);
      event.target.value = '';
      return;
    }
    setPostCropFile(file);
    event.target.value = '';
  };

  const handlePostImageCropConfirm = (file: File, previewUrl: string) => {
    if (postImagePreview) {
      URL.revokeObjectURL(postImagePreview);
    }
    setPostImageFile(file);
    setPostImagePreview(previewUrl);
    setPostCropFile(null);
  };

  const handleCreateGroupPost = async () => {
    const title = postTitle.trim();
    const content = postContent.trim();

    if (!title) {
      appToast.error('게시물 제목을 입력해주세요');
      return;
    }
    if (!content) {
      appToast.error('게시물 내용을 입력해주세요');
      return;
    }

    const createdPost = await createGroupPost.mutateAsync({ title, content, memberOnly: postMemberOnly }).catch((error) => {
      appToast.error('게시물을 등록하지 못했습니다', error);
      return null;
    });
    if (!createdPost) return;

    if (postImageFile && id) {
      try {
        setIsPostImageUploading(true);
        const uploaded = await uploadProcessedImage('GROUP_POST', postImageFile, createdPost.id);
        await groupPostApi.updatePost(id, createdPost.id, { imageId: uploaded.imageId });
        await queryClient.invalidateQueries({ queryKey: ['groups', id, 'posts'] });
        void waitForImageProcessing(uploaded.imageId).then(() => {
          queryClient.invalidateQueries({ queryKey: ['groups', id, 'posts'] });
        }).catch(() => undefined);
      } catch (error) {
        appToast.error('게시물은 등록됐지만 이미지를 첨부하지 못했습니다', error);
      } finally {
        setIsPostImageUploading(false);
      }
    }

    setPostTitle('');
    setPostContent('');
    setPostMemberOnly(false);
    resetPostImage();
    setShowPostComposer(false);
    appToast.success('게시물을 등록했습니다');
  };

  const handleLeave = async () => {
    if (!id) return;
    try {
      await groupApi.leaveGroup(id);
      setShowLeaveConfirm(false);
      navigate('/groups');
    } catch (error) {
      appToast.error('모임 나가기에 실패했습니다', error);
    }
  };

  if (isGroupsPending || isGroupsLoading) {
    return (
      <MobileLayout>
        <PageHeader title="모임" showBack backTo="/groups" />
        <div className="px-5 py-4">
          <ListSkeleton count={3} />
        </div>
      </MobileLayout>
    );
  }

  if (!group) {
    return (
      <MobileLayout>
        <div className="p-8 text-center text-muted-foreground">모임을 찾을 수 없습니다</div>
      </MobileLayout>
    );
  }

  const handleScheduleClick = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setShowScheduleDetail(true);
    if (schedule.groupScheduleId && schedule.groupScheduleParticipant !== false && !schedule.participants) {
      void fetchScheduleDetail(schedule.id)
        .then((detail) => {
          setSelectedSchedule((current) => current?.id === schedule.id ? detail : current);
        })
        .catch(() => undefined);
    }
  };

  const handleScheduleUpdate = (scheduleId: string, updates: Partial<Schedule>) => {
    updateSchedule.mutate(
      { id: scheduleId, data: updates },
      {
        onSuccess: () => appToast.success('일정을 수정했습니다'),
        onError: (error) => appToast.error('일정 수정에 실패했습니다', error),
      },
    );
  };

  const handleScheduleDeleteRequest = (schedule: Schedule) => {
    setConfirmScheduleDelete(schedule);
    setShowScheduleDetail(false);
  };

  const handleScheduleDeleteConfirm = () => {
    if (!confirmScheduleDelete) return;
    deleteSchedule.mutate(confirmScheduleDelete.id, {
      onSuccess: () => {
        appToast.success('일정을 삭제했습니다');
        setConfirmScheduleDelete(null);
      },
      onError: (error) => appToast.error('일정 삭제에 실패했습니다', error),
    });
  };

  const handleLeaveGroupSchedule = (schedule: Schedule) => {
    leaveGroupSchedule.mutate(schedule.id, {
      onSuccess: () => {
        appToast.success('약속에서 빠졌습니다');
        setShowScheduleDetail(false);
      },
      onError: (error) => appToast.error('약속에서 빠지지 못했습니다', error),
    });
  };

  return (
    <MobileLayout>
      <PageHeader
        title="모임"
        showBack
        backTo="/groups"
        titleElement={
          <button
            type="button"
            onClick={() => navigate(`/groups/${id}/intro`)}
            className="flex min-w-0 items-center gap-2 text-left"
            aria-label="모임 소개 보기"
          >
            <GroupAvatar image={group.image} thumbnail={group.thumbnailImage} name={group.name} status={group.imageStatus} size="xs" />
            <span className="min-w-0 truncate text-sm font-bold leading-5 text-foreground">{group.name}</span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>
        }
        rightElement={
          <div ref={menuRef} className="relative flex items-center gap-1.5">
            <button
              type="button"
              onClick={openRoleBasedMemberPanel}
              className="inline-flex items-center gap-1 rounded-xl px-2 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={isManager ? `멤버 관리 열기, ${memberCountLabel}명` : `멤버 목록 열기, ${memberCountLabel}명`}
            >
              <Users className="h-4 w-4" />
              {memberCountLabel}
            </button>
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="모임 메뉴 열기"
            >
              <Menu className="w-5 h-5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-[calc(100%+0.5rem)] app-layer-popover w-48 rounded-xl border border-border bg-card py-1 shadow-lg animate-fade-in">
                <button
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted"
                  onClick={() => {
                    setShowMenu(false);
                    navigate(`/groups/${id}/intro`);
                  }}
                >
                  <Info className="w-4 h-4" /> 모임 소개
                </button>
                <button
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted"
                  onClick={openMyMemberProfileEditor}
                >
                  <Users className="w-4 h-4" /> 모임 프로필 수정
                </button>
                {isManager ? (
                  <button
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted"
                    onClick={() => {
                      setShowMenu(false);
                      openManageMembersModal('members');
                    }}
                  >
                    <Users className="w-4 h-4" /> 멤버 관리
                  </button>
                ) : (
                  <button
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted"
                    onClick={() => {
                      setShowMenu(false);
                      setShowMembersModal(true);
                    }}
                  >
                    <Users className="w-4 h-4" /> 멤버
                  </button>
                )}
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
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-muted"
                  onClick={() => {
                    setShowMenu(false);
                    setShowLeaveConfirm(true);
                  }}
                >
                  <LogOut className="w-4 h-4" /> 모임 나가기
                </button>
              </div>
            )}
          </div>
        }
      />

      <section className="border-t border-border/50 pt-3">
        <div className="mb-2 flex items-end justify-between gap-3 px-5">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-foreground">약속({groupScheduleCountLabel})</h2>
          </div>
          {pastGroupSchedules.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setShowPastSchedules((prev) => {
                  const next = !prev;
                  if (next) {
                    setPastScheduleNudgeKey((key) => key + 1);
                  }
                  return next;
                });
              }}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${
                showPastSchedules ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {showPastSchedules ? '지난 약속 숨기기' : '지난 약속 보기'}
            </button>
          ) : null}
        </div>
        {isSchedulesPending ? (
          <ScheduleStripSkeleton />
        ) : groupedVisibleSchedules.length > 0 ? (
          <ScheduleStrip
            groups={groupedVisibleSchedules}
            onScheduleClick={handleScheduleClick}
            initialScheduleId={showPastSchedules ? firstUpcomingScheduleId : undefined}
            nudgeLeftKey={showPastSchedules ? pastScheduleNudgeKey : undefined}
          />
        ) : (
          <p className="border-y border-dashed border-border/70 px-5 py-5 text-xs text-muted-foreground">
            {showPastSchedules ? '표시할 약속이 없습니다.' : '아직 예정된 약속이 없습니다.'}
          </p>
        )}
      </section>

      <section className="mt-5 border-t border-border/50 pt-3">
        <div className="mb-2 flex items-center justify-between gap-3 px-5">
          <h2 className="text-sm font-bold text-foreground">시간 조율({coordinationCountLabel})</h2>
          <button
            type="button"
            onClick={() => setShowClosedCoordinations((prev) => !prev)}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${
              showClosedCoordinations ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {showClosedCoordinations ? '진행 중 보기' : '닫힌 조율 보기'}
          </button>
        </div>
        {isCoordinationLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : coordinations.length > 0 ? (
          <CoordinationStrip
            coordinations={coordinations}
            onCoordinationClick={(coord) => navigate(`/groups/${id}/coordination/${coord.id}/timetable`)}
            onReachEnd={handleLoadMoreCoordinations}
            isLoadingMore={isFetchingMoreCoordinations}
            variant={showClosedCoordinations ? 'closed' : 'active'}
          />
        ) : (
          <p className="border-y border-dashed border-border/70 px-5 py-5 text-xs text-muted-foreground">
            {showClosedCoordinations ? '닫힌 시간 조율이 없습니다.' : '아직 시간 조율이 없습니다.'}
          </p>
        )}
      </section>

      <section className="mt-5 border-t border-border/50 pt-4">
        <div className="mb-2 flex items-center justify-between gap-3 px-5">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-foreground">모임 글</h2>
          </div>
        </div>

        {isGroupPostsLoading ? (
          <div className="px-5">
            <ListSkeleton count={3} showAvatar={false} itemClassName="px-0" />
          </div>
        ) : groupPosts.length > 0 ? (
          <div>
            {groupPosts.map((post) => (
              <GroupPostItem
                key={post.id}
                groupId={id || ''}
                post={post}
                onAuthorClick={openMemberProfileOrJoinPrompt}
                onClick={() => navigate(`/groups/${id}/posts/${post.id}`)}
              />
            ))}
            {hasNextGroupPostPage ? (
              <div className="px-5 pt-3">
                <button
                  type="button"
                  onClick={handleLoadMoreGroupPosts}
                  disabled={isFetchingNextGroupPostPage}
                  className="w-full border-y border-border/60 py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                >
                  {isFetchingNextGroupPostPage ? '게시물을 불러오는 중...' : '게시물 더보기'}
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="border-y border-dashed border-border/70 px-5 py-6 text-xs text-muted-foreground">
            아직 게시물이 없습니다. 첫 글로 모임 소식을 남겨보세요.
          </p>
        )}
      </section>

      <FAB
        onClick={() => setShowPostComposer(true)}
        variant="group"
        ariaLabel="글쓰기"
        icon={<MessageCircle className="h-6 w-6" />}
        className="app-floating-action-above-group-actions"
      />

      <PostComposerModal
        open={showPostComposer}
        title={postTitle}
        content={postContent}
        onTitleChange={setPostTitle}
        onContentChange={setPostContent}
        onClose={() => setShowPostComposer(false)}
        onSubmit={handleCreateGroupPost}
        isSubmitting={createGroupPost.isPending || isPostImageUploading}
        imagePreview={postImagePreview}
        isImageUploading={isPostImageUploading}
        onImageSelect={handlePostImageSelect}
        onImageRemove={resetPostImage}
        memberOnly={postMemberOnly}
        onMemberOnlyChange={setPostMemberOnly}
        contentPlaceholder="멤버들에게 공유할 내용을 적어주세요."
        submitLabel="게시물 등록"
      />

      {postCropFile ? (
        <ImageCropModal
          file={postCropFile}
          title="게시물 이미지 편집"
          description="글에 첨부할 영역을 맞춰주세요."
          outputNamePrefix="group-post"
          aspectRatio={1}
          onClose={() => setPostCropFile(null)}
          onConfirm={handlePostImageCropConfirm}
        />
      ) : null}

      {showMembersModal && (
        <div className="fixed inset-x-0 top-0 app-layer-overlay flex items-end justify-center bg-black/50 app-bottom-sheet-root" onClick={() => setShowMembersModal(false)}>
          <div
            className="flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-card shadow-elevated animate-fade-in app-bottom-sheet-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
              <div className="min-w-0">
                <h3 className="truncate text-base font-bold text-foreground">참여 멤버</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{memberCount}명</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMembersModal(false)}
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 px-5 py-4">
              {sortedMembers.length > 0 ? (
                <ScrollableFadeList
                  ariaLabel="참여 멤버 목록"
                  maxHeightClassName="max-h-[22rem]"
                >
                  {sortedMembers.map((member) => (
                    <button
                      type="button"
                      key={member.id}
                      onClick={() => openMemberProfile(member.userId)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-border/70 bg-background px-3.5 py-3 text-left transition-colors hover:bg-muted/35"
                    >
                      <Avatar className="h-11 w-11 border border-border/70">
                        <AvatarImage src={member.thumbnailUrl || member.avatarUrl} alt={member.nickname || member.userId} />
                        <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                          {getMemberFallback(member)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="min-w-0 truncate text-sm font-semibold text-foreground">
                            {member.nickname || member.userId}
                          </p>
                          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            {getRoleLabel(member.role)}
                          </span>
                          {member.userId === userId ? (
                            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                              나
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 truncate text-[11px] text-muted-foreground">{formatJoinedAt(member.joinedAt)}</p>
                      </div>
                    </button>
                  ))}
                </ScrollableFadeList>
              ) : (
                <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">
                  아직 참여 멤버가 없습니다. 초대 링크를 공유해 멤버를 불러오세요.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 app-layer-overlay flex items-center justify-center bg-black/50" onClick={() => setShowInviteModal(false)}>
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

      {showManageMembersModal && (
        <div className="fixed inset-x-0 top-0 app-layer-overlay flex items-end justify-center bg-black/50 app-bottom-sheet-root" onClick={() => setShowManageMembersModal(false)}>
          <div
            className="flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-card shadow-elevated animate-fade-in app-bottom-sheet-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
              <div className="min-w-0">
                <h3 className="truncate text-base font-bold text-foreground">멤버 관리</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">멤버와 공개 모임 가입요청을 관리합니다.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowManageMembersModal(false)}
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 px-5 py-4">
              <div className="mb-3 grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1">
                <button
                  type="button"
                  onClick={() => setManageMembersTab('members')}
                  className={`rounded-xl px-3 py-2.5 text-xs font-bold transition-colors ${manageMembersTab === 'members' ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground'}`}
                >
                  멤버
                </button>
                <button
                  type="button"
                  onClick={() => setManageMembersTab('joinRequests')}
                  className={`rounded-xl px-3 py-2.5 text-xs font-bold transition-colors ${manageMembersTab === 'joinRequests' ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground'}`}
                >
                  가입요청 {joinRequests.length > 0 ? `(${joinRequests.length})` : ''}
                </button>
              </div>

              {manageMembersTab === 'members' ? (
                <ScrollableFadeList ariaLabel="멤버 관리 목록" maxHeightClassName="max-h-[22rem]">
                  {sortedMembers.map((member) => {
                    const isMe = member.userId === userId;
                    return (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background px-3.5 py-3"
                      >
                        <button
                          type="button"
                          onClick={() => openMemberProfile(member.userId)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <Avatar className="h-11 w-11 border border-border/70">
                            <AvatarImage src={member.thumbnailUrl || member.avatarUrl} alt={member.nickname || member.userId} />
                            <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                              {getMemberFallback(member)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-2">
                              <p className="min-w-0 truncate text-sm font-semibold text-foreground">
                                {member.nickname || member.userId}
                              </p>
                              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                {getRoleLabel(member.role)}
                              </span>
                              {isMe ? (
                                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                  나
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 truncate text-[11px] text-muted-foreground">{formatJoinedAt(member.joinedAt)}</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setKickTarget(member)}
                          disabled={isMe}
                          className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-destructive/20 px-2.5 py-2 text-[11px] font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                          내보내기
                        </button>
                      </div>
                    );
                  })}
                </ScrollableFadeList>
              ) : isJoinRequestsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : joinRequests.length > 0 ? (
                <ScrollableFadeList ariaLabel="가입요청 목록" maxHeightClassName="max-h-[22rem]">
                  {joinRequests.map((request) => (
                    <div
                      key={request.userId}
                      className="rounded-2xl border border-border/70 bg-background px-3.5 py-3"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-11 w-11 border border-border/70">
                          <AvatarImage src={request.avatarUrl} alt={request.nickname || request.userId} />
                          <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                            {(request.nickname || request.userId).slice(0, 1)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {request.nickname || request.userId}
                          </p>
                          <p className="mt-1 line-clamp-3 text-[11px] leading-5 text-muted-foreground">
                            {request.message || '인삿말 없이 가입을 요청했습니다.'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleDecideJoinRequest(request, 'REJECTED')}
                          disabled={decidingRequestUserId === request.userId}
                          className="rounded-xl border border-border bg-card py-2.5 text-xs font-semibold text-muted-foreground disabled:opacity-50"
                        >
                          거절
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecideJoinRequest(request, 'APPROVED')}
                          disabled={decidingRequestUserId === request.userId}
                          className="rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
                        >
                          승인
                        </button>
                      </div>
                    </div>
                  ))}
                </ScrollableFadeList>
              ) : (
                <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">
                  대기 중인 가입요청이 없습니다.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <GroupMemberProfileSheet
        open={showMemberProfileSheet}
        groupId={id || ''}
        profile={memberProfile}
        editable={memberProfileMode === 'edit'}
        isLoading={isMemberProfileLoading}
        isSaving={isMemberProfileSaving}
        onClose={() => setShowMemberProfileSheet(false)}
        onSave={handleSaveMyMemberProfile}
      />

      <ScheduleDetailModal
        schedule={selectedSchedule}
        open={showScheduleDetail}
        onClose={() => setShowScheduleDetail(false)}
        onUpdate={handleScheduleUpdate}
        onDelete={handleScheduleDeleteRequest}
        onLeaveGroupSchedule={handleLeaveGroupSchedule}
        onParticipantClick={handleScheduleParticipantClick}
      />

      <div className="h-24" aria-hidden="true" />

      <div className="fixed inset-x-0 app-layer-floating app-bottom-sheet-root pointer-events-none">
        <div className="pointer-events-auto mx-auto max-w-lg border-t border-border/70 bg-background/95 px-4 py-3 shadow-elevated glass">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => navigate('/schedule/new', { state: { groupId: id, groupName: group.name } })}
              className="w-full rounded-xl bg-category-group py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              약속 만들기
            </button>
            <button
              onClick={() => navigate(`/groups/${id}/coordination`)}
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              시간 조율하기
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={!!confirmScheduleDelete}
        onClose={() => setConfirmScheduleDelete(null)}
        onConfirm={handleScheduleDeleteConfirm}
        title="일정을 삭제하시겠습니까?"
        description="삭제한 일정은 되돌릴 수 없습니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        variant="destructive"
      />
      <ConfirmModal
        open={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={handleLeave}
        title="모임을 나가시겠습니까?"
        description="모임에서 나가면 다시 초대받아야 합니다."
        confirmLabel="나가기"
        cancelLabel="취소"
        variant="destructive"
      />
      <ConfirmModal
        open={!!kickTarget}
        onClose={() => setKickTarget(null)}
        onConfirm={handleRemoveMember}
        title="멤버를 내보내시겠습니까?"
        description={kickTarget ? `${kickTarget.nickname || '선택한 멤버'}님은 초대 링크로 다시 참여해야 합니다.` : undefined}
        confirmLabel={isRemovingMember ? '처리 중...' : '내보내기'}
        cancelLabel="취소"
        variant="destructive"
      />
    </MobileLayout>
  );
};

interface GroupPostItemProps {
  groupId: string;
  post: CommunityPostResponse;
  onAuthorClick: (memberUserId?: string) => void;
  onClick: () => void;
}

const GroupPostItem: React.FC<GroupPostItemProps> = ({ groupId, post, onAuthorClick, onClick }) => {
  const toggleLike = useToggleGroupPostLike(groupId, post.id);

  const handleToggleLike = async () => {
    try {
      await toggleLike.mutateAsync(post.likedByMe);
    } catch (error) {
      appToast.error('좋아요 상태를 변경하지 못했습니다', error);
    }
  };

  return (
    <PostListItem
      post={post}
      onClick={onClick}
      onAuthorClick={() => onAuthorClick(post.authorUserId)}
      actions={
        <>
          <button
            type="button"
            onClick={handleToggleLike}
            disabled={toggleLike.isPending}
            aria-label={post.likedByMe ? '좋아요 취소' : '좋아요'}
            className={`flex h-8 items-center gap-1.5 rounded-xl border px-2.5 text-[11px] font-bold transition-colors ${
              post.likedByMe
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-border bg-background text-muted-foreground'
            } disabled:opacity-50`}
          >
            <Heart className={`h-3.5 w-3.5 ${post.likedByMe ? 'fill-primary' : ''}`} />
            {post.likeCount ?? 0}
          </button>
          <button
            type="button"
            onClick={onClick}
            className="flex h-8 items-center gap-1.5 rounded-xl border border-border bg-background px-2.5 text-[11px] font-bold text-muted-foreground transition-colors hover:text-foreground"
            aria-label={`댓글 ${post.commentCount ?? 0}개 보기`}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            댓글 {post.commentCount ?? 0}개
          </button>
        </>
      }
    />
  );
};

export default GroupDetailPage;
