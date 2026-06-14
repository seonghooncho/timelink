import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Trash2, X } from 'lucide-react';
import { Schedule, ScheduleParticipant } from '@/types/types';
import CategoryBadge from '@/components/common/CategoryBadge';
import DurationSelect from '@/components/common/DurationSelect';
import HalfHourTimeSelect from '@/components/common/HalfHourTimeSelect';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { appToast } from '@/lib/appToast';
import { useScrollAffordance } from '@/hooks/useScrollAffordance';
import {
  buildScheduleCreateRequest,
  normalizeTimeToHalfHour,
  SCHEDULE_CONTENT_MAX_LENGTH,
  SCHEDULE_TITLE_MAX_LENGTH,
} from '@/lib/scheduleForm';
import { DEFAULT_SCHEDULE_DURATION_HOURS, formatDurationLabel, formatScheduleDateClock } from '@/lib/scheduleTime';

interface ScheduleDetailModalProps {
  schedule: Schedule | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Schedule>) => void;
  onDelete?: (schedule: Schedule) => void;
  onLeaveGroupSchedule?: (schedule: Schedule) => void;
  onParticipantClick?: (participant: ScheduleParticipant, schedule: Schedule) => void;
}

const ScheduleDetailModal: React.FC<ScheduleDetailModalProps> = ({
  schedule,
  open,
  onClose,
  onUpdate,
  onDelete,
  onLeaveGroupSchedule,
  onParticipantClick,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editDuration, setEditDuration] = useState(String(DEFAULT_SCHEDULE_DURATION_HOURS));

  useEffect(() => {
    setIsEditing(false);
  }, [open, schedule?.id]);

  if (!schedule) return null;
  const isGroupSchedule = Boolean(schedule.groupScheduleId);
  const isGroupScheduleParticipant = schedule.groupScheduleParticipant !== false;
  const canEditSchedule = !isGroupSchedule || (isGroupScheduleParticipant && schedule.groupScheduleOwner !== false);
  const canLeaveGroupSchedule = isGroupSchedule && isGroupScheduleParticipant && !canEditSchedule;

  const handleEdit = () => {
    setEditTitle(schedule.title);
    setEditContent(schedule.content);
    setEditStartDate(formatDateInputValue(schedule.startTime));
    setEditStartTime(normalizeTimeToHalfHour(formatTimeInputValue(schedule.startTime)));
    setEditDuration(String(schedule.duration > 0 ? schedule.duration : DEFAULT_SCHEDULE_DURATION_HOURS));
    setIsEditing(true);
  };

  const handleSave = () => {
    const result = buildScheduleCreateRequest({
      title: editTitle,
      content: editContent,
      category: schedule.category,
      isImportant: schedule.isImportant,
      startDate: editStartDate,
      startTime: editStartTime,
      duration: editDuration,
      hasAlarm: schedule.hasAlarm,
      groupId: schedule.groupId,
    });

    if (!result.ok) {
      appToast.error(result.message, result.description);
      return;
    }

    onUpdate(schedule.id, {
      title: result.data.title,
      content: result.data.content || '',
      startTime: result.data.startTime,
      duration: result.data.duration,
    });
    setIsEditing(false);
  };

  const handleClose = () => {
    setIsEditing(false);
    onClose();
  };

  const handleDelete = () => {
    onDelete?.(schedule);
  };

  const handleLeaveGroupSchedule = () => {
    onLeaveGroupSchedule?.(schedule);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-x-0 top-0 app-layer-modal flex items-end justify-center app-bottom-sheet-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={handleClose} />
          <motion.div
            className="relative w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card p-6 pb-10 shadow-elevated app-bottom-sheet-panel"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Handle */}
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />

            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <CategoryBadge category={schedule.category} size="md" />
                {schedule.isImportant && <CategoryBadge category="important" size="md" />}
              </div>
              <button onClick={handleClose} className="p-2 rounded-xl text-muted-foreground hover:bg-muted transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            {isEditing ? (
              <ScheduleEditForm
                title={editTitle}
                content={editContent}
                startDate={editStartDate}
                startTime={editStartTime}
                duration={editDuration}
                onTitleChange={setEditTitle}
                onContentChange={setEditContent}
                onStartDateChange={setEditStartDate}
                onStartTimeChange={setEditStartTime}
                onDurationChange={setEditDuration}
                onCancel={() => setIsEditing(false)}
                onSave={handleSave}
              />
            ) : (
              <>
                <h2 className="text-xl font-bold text-foreground mb-1">{schedule.title}</h2>

                <div className="space-y-3 mt-5">
                  <DetailRow label="일시" value={formatScheduleDateClock(schedule.startTime)} />
                  <DetailRow label="소요" value={formatDurationLabel(schedule.duration)} />
                </div>

                {isGroupSchedule ? (
                  <ParticipantStrip
                    participants={schedule.participants}
                    onParticipantClick={onParticipantClick ? (participant) => onParticipantClick(participant, schedule) : undefined}
                  />
                ) : null}

                {isGroupSchedule && !isGroupScheduleParticipant ? (
                  <p className="mt-5 rounded-2xl border border-border/70 bg-muted/50 px-4 py-3 text-xs font-semibold text-muted-foreground">
                    참여자로 선택되지 않은 모임 약속입니다.
                  </p>
                ) : null}

                {schedule.content && (
                  <div className="mt-5 p-4 bg-muted rounded-2xl">
                    <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{schedule.content}</p>
                  </div>
                )}

                <div className="mt-5 flex items-center gap-2">
                  {canLeaveGroupSchedule ? (
                    <button
                      type="button"
                      onClick={handleLeaveGroupSchedule}
                      className="h-11 flex-1 rounded-2xl border border-destructive/20 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 pressable"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <LogOut className="h-3.5 w-3.5" />
                        약속 빠지기
                      </span>
                    </button>
                  ) : onDelete && canEditSchedule ? (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="inline-flex h-11 items-center gap-1.5 rounded-2xl border border-destructive/20 px-3 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10 pressable"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      일정 삭제
                    </button>
                  ) : null}
                  {canEditSchedule ? (
                    <button
                      type="button"
                      onClick={handleEdit}
                      className="h-11 flex-1 rounded-2xl bg-muted text-sm font-semibold text-foreground transition-colors hover:bg-accent pressable"
                    >
                      수정하기
                    </button>
                  ) : null}
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-num text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

interface ScheduleEditFormProps {
  title: string;
  content: string;
  startDate: string;
  startTime: string;
  duration: string;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onStartTimeChange: (value: string) => void;
  onDurationChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}

function ScheduleEditForm({
  title,
  content,
  startDate,
  startTime,
  duration,
  onTitleChange,
  onContentChange,
  onStartDateChange,
  onStartTimeChange,
  onDurationChange,
  onCancel,
  onSave,
}: ScheduleEditFormProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">제목</label>
        <input
          aria-label="일정 제목"
          value={title}
          onChange={e => onTitleChange(e.target.value)}
          maxLength={SCHEDULE_TITLE_MAX_LENGTH}
          className="w-full rounded-xl bg-muted px-4 py-3 text-lg font-bold text-foreground outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="mt-1 text-right text-[10px] text-muted-foreground">{title.length}/{SCHEDULE_TITLE_MAX_LENGTH}</p>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">내용</label>
        <textarea
          aria-label="일정 내용"
          value={content}
          onChange={e => onContentChange(e.target.value)}
          maxLength={SCHEDULE_CONTENT_MAX_LENGTH}
          rows={3}
          className="w-full resize-none rounded-xl bg-muted px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="mt-1 text-right text-[10px] text-muted-foreground">{content.length}/{SCHEDULE_CONTENT_MAX_LENGTH}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">날짜</label>
          <input
            aria-label="일정 날짜"
            type="date"
            value={startDate}
            onChange={e => onStartDateChange(e.target.value)}
            className="w-full rounded-lg bg-muted px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">시간</label>
          <HalfHourTimeSelect value={startTime} onChange={onStartTimeChange} ariaLabel="일정 시작 시간" />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">소요시간</label>
        <DurationSelect value={duration} onChange={onDurationChange} />
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="py-3.5 rounded-2xl bg-muted text-sm font-semibold text-foreground transition-colors hover:bg-accent pressable"
        >
          취소
        </button>
        <button
          type="button"
          onClick={onSave}
          className="py-3.5 rounded-2xl bg-primary text-sm font-bold text-primary-foreground pressable"
        >
          저장하기
        </button>
      </div>
    </div>
  );
}

function ParticipantStrip({
  participants,
  onParticipantClick,
}: {
  participants?: ScheduleParticipant[];
  onParticipantClick?: (participant: ScheduleParticipant) => void;
}) {
  const {
    scrollRef,
    hasOverflow,
    startFadeOpacity,
    endFadeOpacity,
  } = useScrollAffordance<HTMLDivElement>({ axis: 'horizontal' });

  return (
    <section className="mt-5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-bold text-muted-foreground">참여인원</h3>
        {participants ? (
          <span className="text-[11px] font-semibold text-muted-foreground">{participants.length}명</span>
        ) : null}
      </div>

      {!participants ? (
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex w-14 shrink-0 flex-col items-center gap-1.5">
              <div className="h-11 w-11 animate-pulse rounded-full bg-muted" />
              <div className="h-2.5 w-10 animate-pulse rounded-full bg-muted" />
            </div>
          ))}
        </div>
      ) : participants.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/70 px-4 py-4 text-center text-xs text-muted-foreground">
          참여자 정보가 없습니다.
        </p>
      ) : (
        <div className="relative isolate overflow-hidden">
          <div ref={scrollRef} className="overflow-x-auto overscroll-x-contain scrollbar-hide">
            <div className="flex min-w-max gap-3 pr-2">
              {participants.map((participant) => (
                <ParticipantItem
                  key={participant.userId}
                  participant={participant}
                  onClick={onParticipantClick}
                />
              ))}
            </div>
          </div>
          {hasOverflow ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-black/20 via-black/10 to-transparent transition-opacity duration-150"
              style={{ opacity: startFadeOpacity }}
            />
          ) : null}
          {hasOverflow ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-black/20 via-black/10 to-transparent transition-opacity duration-150"
              style={{ opacity: endFadeOpacity }}
            />
          ) : null}
        </div>
      )}
    </section>
  );
}

function ParticipantItem({
  participant,
  onClick,
}: {
  participant: ScheduleParticipant;
  onClick?: (participant: ScheduleParticipant) => void;
}) {
  const name = participant.nickname || participant.userId;
  const content = (
    <>
      <Avatar className="h-11 w-11 border border-border/70">
        <AvatarImage src={participant.thumbnailUrl || participant.avatarUrl} alt={name} />
        <AvatarFallback className="bg-category-group-light text-sm font-bold text-category-group">
          {getParticipantFallback(participant)}
        </AvatarFallback>
      </Avatar>
      <span className="w-full truncate text-center text-[11px] font-semibold text-foreground">
        {name}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={() => onClick(participant)}
        className="flex w-14 shrink-0 flex-col items-center gap-1.5 rounded-xl text-center transition-opacity hover:opacity-80"
        aria-label={`${name} 프로필 보기`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex w-14 shrink-0 flex-col items-center gap-1.5">
      {content}
    </div>
  );
}

function getParticipantFallback(participant: ScheduleParticipant) {
  return (participant.nickname || participant.userId || '?').slice(0, 1);
}

const formatDateInputValue = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
};

const formatTimeInputValue = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export default ScheduleDetailModal;
