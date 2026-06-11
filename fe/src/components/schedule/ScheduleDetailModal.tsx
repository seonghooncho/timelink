import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, X } from 'lucide-react';
import { Schedule } from '@/types/types';
import CategoryBadge from '@/components/common/CategoryBadge';
import DurationSelect from '@/components/common/DurationSelect';
import HalfHourTimeSelect from '@/components/common/HalfHourTimeSelect';
import { appToast } from '@/lib/appToast';
import { buildScheduleCreateRequest, normalizeTimeToHalfHour } from '@/lib/scheduleForm';
import { DEFAULT_SCHEDULE_DURATION_HOURS, formatDurationLabel, formatScheduleDateClock } from '@/lib/scheduleTime';

interface ScheduleDetailModalProps {
  schedule: Schedule | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Schedule>) => void;
  onDelete?: (schedule: Schedule) => void;
}

const ScheduleDetailModal: React.FC<ScheduleDetailModalProps> = ({ schedule, open, onClose, onUpdate, onDelete }) => {
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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-x-0 top-0 z-[90] flex items-end justify-center app-bottom-sheet-root"
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

                {schedule.content && (
                  <div className="mt-5 p-4 bg-muted rounded-2xl">
                    <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{schedule.content}</p>
                  </div>
                )}

                <div className="mt-5 flex items-center gap-2">
                  {onDelete ? (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="inline-flex h-11 items-center gap-1.5 rounded-2xl border border-destructive/20 px-3 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10 pressable"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      일정 삭제
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleEdit}
                    className="h-11 flex-1 rounded-2xl bg-muted text-sm font-semibold text-foreground transition-colors hover:bg-accent pressable"
                  >
                    수정하기
                  </button>
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
          className="w-full rounded-xl bg-muted px-4 py-3 text-lg font-bold text-foreground outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">내용</label>
        <textarea
          aria-label="일정 내용"
          value={content}
          onChange={e => onContentChange(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-xl bg-muted px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
        />
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
