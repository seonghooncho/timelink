import React, { useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import MobileLayout from '@/components/layout/MobileLayout';
import PageHeader from '@/components/layout/PageHeader';
import ImageCropModal from '@/components/common/ImageCropModal';
import ConfirmModal from '@/components/common/ConfirmModal';
import { ScheduleCategory } from '@/types/types';
import { Bell, Camera, Check, Loader2, ImageIcon, Search, Star } from 'lucide-react';
import { aiApi, coordinationApi, groupApi } from '@/services/api';
import { useCreateSchedule } from '@/hooks/useSchedules';
import { appToast, getErrorMessage } from '@/lib/appToast';
import {
  buildScheduleCreateRequest,
  normalizeTimeToHalfHour,
  SCHEDULE_CONTENT_MAX_LENGTH,
  SCHEDULE_TITLE_MAX_LENGTH,
} from '@/lib/scheduleForm';
import { SCHEDULE_DURATION_OPTIONS } from '@/lib/scheduleTime';
import HalfHourTimeSelect from '@/components/common/HalfHourTimeSelect';
import DurationSelect from '@/components/common/DurationSelect';
import { validateImageFile } from '@/lib/images';
import { trackEvent } from '@/lib/analytics';

const categories: { value: ScheduleCategory; label: string }[] = [
  { value: 'task', label: '할일' },
  { value: 'appointment', label: '약속' },
  { value: 'repeat', label: '반복' },
];

interface ScheduleFormLocationState {
  groupId?: string;
  groupName?: string;
  title?: string;
  content?: string;
  startDate?: string;
  startTime?: string;
  duration?: string | number;
  sourceLabel?: string;
  coordinationId?: string;
  returnTo?: string;
}

const getExtractedDuration = (data: Awaited<ReturnType<typeof aiApi.extractSchedule>>) => {
  if (data.duration !== undefined && SCHEDULE_DURATION_OPTIONS.includes(data.duration)) {
    return String(data.duration);
  }

  if (!data.startDate || !data.startTime || !data.endTime) {
    return null;
  }

  const startTime = normalizeTimeToHalfHour(data.startTime);
  const endTime = normalizeTimeToHalfHour(data.endTime);
  const endDate = data.endDate || data.startDate;
  const start = new Date(`${data.startDate}T${startTime}:00`);
  const end = new Date(`${endDate}T${endTime}:00`);
  const duration = (end.getTime() - start.getTime()) / 3600000;

  return duration > 0 && Number.isInteger(duration * 2) ? String(duration) : null;
};

const isPastScheduleStart = (startTime: string) => {
  const start = new Date(startTime);
  return Number.isFinite(start.getTime()) && start.getTime() < Date.now();
};

const ScheduleFormPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const createMutation = useCreateSchedule();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const participantsInitializedRef = useRef(false);

  const initialContext = useMemo(() => {
    const state = location.state as ScheduleFormLocationState | null;
    return {
      groupId: state?.groupId,
      groupName: state?.groupName,
      title: state?.title ?? '',
      content: state?.content ?? '',
      startDate: state?.startDate ?? '',
      startTime: state?.startTime ? normalizeTimeToHalfHour(state.startTime) : '',
      duration: state?.duration !== undefined ? String(state.duration) : '1',
      sourceLabel: state?.sourceLabel,
      coordinationId: state?.coordinationId,
      returnTo: state?.returnTo,
    };
  }, [location.state]);

  const [category, setCategory] = useState<ScheduleCategory>(initialContext.groupId ? 'group' : 'task');
  const [title, setTitle] = useState(initialContext.title);
  const [content, setContent] = useState(initialContext.content);
  const [startDate, setStartDate] = useState(initialContext.startDate);
  const [startTime, setStartTime] = useState(initialContext.startTime);
  const [duration, setDuration] = useState(initialContext.duration);
  const [isImportant, setIsImportant] = useState(false);
  const [hasAlarm, setHasAlarm] = useState(false);
  const [participantUserIds, setParticipantUserIds] = useState<string[]>([]);
  const [showMemberSearch, setShowMemberSearch] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showPastScheduleConfirm, setShowPastScheduleConfirm] = useState(false);
  const [showCloseCoordinationConfirm, setShowCloseCoordinationConfirm] = useState(false);
  const [isClosingCoordination, setIsClosingCoordination] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [cropSourceFile, setCropSourceFile] = useState<File | null>(null);
  const { data: groupMembers = [], isLoading: isGroupMembersLoading } = useQuery({
    queryKey: ['groups', initialContext.groupId, 'members'],
    queryFn: () => groupApi.getMembers(initialContext.groupId as string),
    enabled: Boolean(initialContext.groupId),
  });
  const isGroupSchedule = Boolean(initialContext.groupId);
  const allParticipantUserIds = useMemo(
    () => groupMembers.map(member => member.userId),
    [groupMembers],
  );
  const allParticipantsSelected = allParticipantUserIds.length > 0
    && allParticipantUserIds.every(userId => participantUserIds.includes(userId));

  React.useEffect(() => {
    if (!initialContext.groupId || groupMembers.length === 0 || participantsInitializedRef.current) return;
    participantsInitializedRef.current = true;
    setParticipantUserIds(allParticipantUserIds);
  }, [allParticipantUserIds, groupMembers.length, initialContext.groupId]);

  React.useEffect(() => {
    if (!isGroupSchedule || category === 'group') return;
    setCategory('group');
  }, [category, isGroupSchedule]);

  React.useEffect(() => {
    setTitle(prev => prev.slice(0, SCHEDULE_TITLE_MAX_LENGTH));
    setContent(prev => prev.slice(0, SCHEDULE_CONTENT_MAX_LENGTH));
  }, []);

  const filteredGroupMembers = useMemo(() => {
    const query = memberSearchQuery.trim().toLowerCase();
    if (!query) return groupMembers;
    return groupMembers.filter(member =>
      (member.nickname || member.userId).toLowerCase().includes(query),
    );
  }, [groupMembers, memberSearchQuery]);

  const toggleParticipant = (userId: string) => {
    setParticipantUserIds(prev => (
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    ));
  };

  const selectAllParticipants = () => {
    setParticipantUserIds(allParticipantsSelected ? [] : allParticipantUserIds);
  };

  const navigateAfterCoordinationSchedule = () => {
    navigate(initialContext.returnTo || (initialContext.groupId ? `/groups/${initialContext.groupId}` : '/'));
  };

  const handleSkipCloseCoordination = () => {
    if (isClosingCoordination) {
      return;
    }
    setShowCloseCoordinationConfirm(false);
    navigateAfterCoordinationSchedule();
  };

  const handleCloseCoordination = async () => {
    if (!initialContext.groupId || !initialContext.coordinationId || isClosingCoordination) {
      return;
    }

    setIsClosingCoordination(true);
    try {
      await coordinationApi.update(initialContext.groupId, initialContext.coordinationId, { status: 'closed' });
      appToast.success('시간 조율을 닫았습니다');
    } catch (error) {
      appToast.error('시간 조율을 닫지 못했습니다', error);
    } finally {
      setIsClosingCoordination(false);
      setShowCloseCoordinationConfirm(false);
      navigateAfterCoordinationSchedule();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validationMessage = validateImageFile(file);
    if (validationMessage) {
      appToast.error(validationMessage);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setCropSourceFile(file);
  };

  const analyzeImageFile = async (file: File, previewUrl: string) => {
    setPreviewImage(previewUrl);
    setIsAnalyzing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const data = await aiApi.extractSchedule(base64);
        if (data.title) setTitle(data.title.slice(0, SCHEDULE_TITLE_MAX_LENGTH));
        if (data.content) setContent(data.content.slice(0, SCHEDULE_CONTENT_MAX_LENGTH));
        if (!isGroupSchedule && data.category && categories.some(c => c.value === data.category)) {
          setCategory(data.category as ScheduleCategory);
        }
        if (data.startDate) setStartDate(data.startDate);
        if (data.startTime) setStartTime(normalizeTimeToHalfHour(data.startTime));
        const extractedDuration = getExtractedDuration(data);
        if (extractedDuration) setDuration(extractedDuration);
        if (data.isImportant !== undefined) setIsImportant(data.isImportant);
        appToast.success('AI 분석 완료', '사진에서 일정 정보를 추출했습니다.');
      } catch (err: unknown) {
        appToast.error('분석 실패', getErrorMessage(err, '사진 분석에 실패했습니다.'));
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (skipPastConfirm = false) => {
    const result = buildScheduleCreateRequest({
      title,
      content,
      category: isGroupSchedule ? 'group' : category,
      isImportant,
      startDate,
      startTime,
      duration,
      hasAlarm,
      groupId: initialContext.groupId,
      participantUserIds: isGroupSchedule ? participantUserIds : undefined,
    });

    if (!result.ok) {
      appToast.error(result.message, result.description);
      return;
    }

    if (!skipPastConfirm && isPastScheduleStart(result.data.startTime)) {
      setShowPastScheduleConfirm(true);
      return;
    }

    setShowPastScheduleConfirm(false);
    try {
      trackEvent('schedule_create_start', {
        category: isGroupSchedule ? 'group' : category,
        has_group: isGroupSchedule,
        has_alarm: hasAlarm,
        is_important: isImportant,
        source: initialContext.sourceLabel ? 'coordination' : 'manual',
      });
      await createMutation.mutateAsync(result.data);
      appToast.success('일정이 생성되었습니다');
      if (initialContext.groupId && initialContext.coordinationId) {
        setShowCloseCoordinationConfirm(true);
        return;
      }
      navigate('/');
    } catch (err) {
      appToast.error('생성 실패', err, '일정 생성에 실패했습니다.');
    }
  };

  return (
    <MobileLayout>
      <PageHeader title="일정 생성" showBack backTo={initialContext.groupId ? `/groups/${initialContext.groupId}` : '/'} />
      <div className="px-4 py-4 space-y-5">
        {initialContext.sourceLabel ? (
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
            <p className="text-xs font-semibold text-primary">
              {initialContext.sourceLabel}에서 가져온 모임 일정입니다.
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              일시와 소요시간을 확인한 뒤 생성하세요.
            </p>
          </div>
        ) : null}

        {/* AI Photo Upload */}
        <div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={handleImageUpload} />
          <button onClick={() => fileInputRef.current?.click()} disabled={isAnalyzing}
            className="w-full relative max-w-full overflow-hidden rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors active:scale-[0.98]">
            {previewImage && !isAnalyzing ? (
              <div className="relative">
                <img src={previewImage} alt="업로드된 사진" className="w-full h-32 object-cover rounded-xl opacity-80" />
                <div className="absolute inset-0 flex items-center justify-center bg-foreground/20 rounded-xl">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-background/90 rounded-lg">
                    <ImageIcon className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium text-foreground">다른 사진으로 변경</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                {isAnalyzing ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
                    <span className="text-xs font-medium text-primary">AI가 일정을 분석하고 있어요...</span>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><Camera className="w-5 h-5 text-primary" /></div>
                    <span className="text-xs font-semibold text-primary">사진으로 일정 생성</span>
                    <span className="max-w-full px-3 text-center text-[10px] text-muted-foreground">15MB 이하 사진을 맞춘 뒤 AI가 일정 정보를 채워줘요</span>
                  </>
                )}
              </div>
            )}
          </button>
        </div>

        {/* Category */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-2 block">카테고리</label>
          {isGroupSchedule ? (
            <div className="inline-flex rounded-lg border border-category-group/25 bg-category-group-light px-3 py-1.5 text-xs font-bold text-category-group-strong">
              모임
            </div>
          ) : (
            <div className="flex gap-2">
              {categories.map(c => (
                <button key={c.value} type="button" onClick={() => setCategory(c.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${category === c.value ? 'bg-foreground text-background border-foreground' : 'bg-card text-muted-foreground border-border hover:border-muted-foreground'}`}>
                  {c.label}
                </button>
              ))}
            </div>
          )}
          {initialContext.groupId ? (
            <p className="text-[11px] text-muted-foreground mt-2">
              현재 모임: {initialContext.groupName || '선택된 모임'}
            </p>
          ) : null}
        </div>

        {initialContext.groupId ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">참여 멤버</label>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  선택된 멤버의 캘린더에도 일정이 생성됩니다.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={selectAllParticipants}
                  className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-bold text-foreground"
                >
                  {allParticipantsSelected ? '전체해제' : '전체선택'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowMemberSearch((prev) => !prev)}
                  className="rounded-lg border border-border p-1.5 text-muted-foreground"
                  aria-label="멤버 이름 검색"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </div>
            {showMemberSearch ? (
              <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  value={memberSearchQuery}
                  onChange={(event) => setMemberSearchQuery(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground/60"
                  placeholder="이름으로 검색"
                  autoFocus
                />
              </div>
            ) : null}
            <div className="rounded-2xl border border-border bg-card p-2">
              {isGroupMembersLoading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : filteredGroupMembers.length > 0 ? (
                <div className="max-h-44 space-y-1 overflow-y-auto scrollbar-thin-soft">
                  {filteredGroupMembers.map(member => {
                    const selected = participantUserIds.includes(member.userId);
                    return (
                      <button
                        key={member.userId}
                        type="button"
                        onClick={() => toggleParticipant(member.userId)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${selected ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                          {(member.nickname || member.userId).slice(0, 1)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                          {member.nickname || member.userId}
                        </span>
                        {selected ? <Check className="h-4 w-4 shrink-0" /> : null}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="px-3 py-6 text-center text-xs text-muted-foreground">검색된 멤버가 없습니다.</p>
              )}
            </div>
            <p className="text-right text-[10px] text-muted-foreground">
              {participantUserIds.length}명 선택
            </p>
          </div>
        ) : null}

        {/* Title */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">제목</label>
          <input value={title} onChange={e => setTitle(e.target.value)} maxLength={SCHEDULE_TITLE_MAX_LENGTH} placeholder="일정 제목을 입력하세요"
            className="w-full px-3 py-2.5 bg-muted rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/50" />
          <p className="mt-1 text-right text-[10px] text-muted-foreground">{title.length}/{SCHEDULE_TITLE_MAX_LENGTH}</p>
        </div>

        {/* Content */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">내용</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} maxLength={SCHEDULE_CONTENT_MAX_LENGTH} placeholder="일정 내용을 입력하세요" rows={3}
            className="w-full px-3 py-2.5 bg-muted rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring resize-none placeholder:text-muted-foreground/50" />
          <p className="mt-1 text-right text-[10px] text-muted-foreground">{content.length}/{SCHEDULE_CONTENT_MAX_LENGTH}</p>
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">날짜</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2.5 bg-muted rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">시간</label>
            <HalfHourTimeSelect value={startTime} onChange={setStartTime} ariaLabel="시간" />
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">소요시간</label>
          <DurationSelect value={duration} onChange={setDuration} />
        </div>

        {/* Toggles */}
        <div className="flex gap-4">
          <button type="button" onClick={() => setIsImportant(!isImportant)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors flex items-center justify-center gap-1.5 ${isImportant ? 'bg-category-important-light text-category-important-strong border-category-important' : 'bg-card text-muted-foreground border-border'}`}>
            <Star className="w-4 h-4" fill={isImportant ? 'currentColor' : 'none'} />
            중요
          </button>
          <button type="button" onClick={() => setHasAlarm(!hasAlarm)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors flex items-center justify-center gap-1.5 ${hasAlarm ? 'bg-primary/10 text-primary border-primary' : 'bg-card text-muted-foreground border-border'}`}>
            <Bell className="w-4 h-4" />
            알림
          </button>
        </div>
        {hasAlarm ? (
          <div className="rounded-xl border border-primary/15 bg-primary/5 px-3 py-2.5">
            <p className="text-[11px] leading-5 text-muted-foreground">
              마이페이지의 일정 알림이 꺼져 있으면 리마인드는 발송되지 않습니다.
              <button
                type="button"
                onClick={() => navigate('/mypage')}
                className="ml-1 font-semibold text-primary underline-offset-2 hover:underline"
              >
                설정 확인
              </button>
            </p>
          </div>
        ) : null}

        {/* Submit */}
        <button type="button" onClick={() => handleSubmit()} disabled={createMutation.isPending}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors active:scale-[0.98] disabled:opacity-50">
          {createMutation.isPending ? '생성 중...' : '생성하기'}
        </button>
      </div>
      {cropSourceFile ? (
        <ImageCropModal
          file={cropSourceFile}
          title="일정 사진 맞추기"
          description="분석할 영역을 조정한 뒤 저장하세요."
          outputNamePrefix="schedule-ai"
          aspectRatio={4 / 3}
          outputWidth={1200}
          onClose={() => {
            setCropSourceFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
          onConfirm={(file, previewUrl) => {
            setCropSourceFile(null);
            void analyzeImageFile(file, previewUrl);
          }}
        />
      ) : null}
      <ConfirmModal
        open={showPastScheduleConfirm}
        onClose={() => setShowPastScheduleConfirm(false)}
        onConfirm={() => handleSubmit(true)}
        title="이미 지난 일정입니다"
        description="과거 일정으로 저장할까요? 지난 일정은 알림 없이 기록만 남습니다."
        confirmLabel={createMutation.isPending ? '생성 중...' : '그래도 만들기'}
        cancelLabel="다시 확인"
      />
      <ConfirmModal
        open={showCloseCoordinationConfirm}
        onClose={handleSkipCloseCoordination}
        onConfirm={handleCloseCoordination}
        title="시간 조율을 닫으시겠습니까?"
        description="닫으면 모임 페이지의 시간 조율 섹션에서 기본으로 보이지 않습니다."
        confirmLabel={isClosingCoordination ? '닫는 중...' : '예, 닫기'}
        cancelLabel="아니오"
      />
    </MobileLayout>
  );
};

export default ScheduleFormPage;
