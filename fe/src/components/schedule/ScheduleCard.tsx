import React from 'react';
import { Check } from 'lucide-react';
import { Schedule } from '@/types/types';
import CategoryBadge from '@/components/common/CategoryBadge';
import { getScheduleColorStyle } from '@/utils';
import { formatDurationLabel, formatScheduleClock } from '@/lib/scheduleTime';

interface ScheduleCardProps {
  schedule: Schedule;
  onClick: (schedule: Schedule) => void;
  onComplete: (schedule: Schedule) => void;
}

const ScheduleCard: React.FC<ScheduleCardProps> = ({ schedule, onClick, onComplete }) => {
  const timeStr = `${formatScheduleClock(schedule.startTime)} · ${formatDurationLabel(schedule.duration)}`;

  return (
    <div
      className="flex items-start gap-3.5 p-4 bg-card rounded-2xl shadow-soft hover:shadow-card transition-all cursor-pointer pressable"
      onClick={() => onClick(schedule)}
    >
      {/* Left color bar */}
      <div className="w-1 self-stretch rounded-full" style={getScheduleColorStyle(schedule, 'line')} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1.5">
          <CategoryBadge category={schedule.category} />
          {schedule.isImportant && <CategoryBadge category="important" />}
        </div>
        <h3 className="text-sm font-bold text-foreground">{schedule.title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{schedule.content}</p>
        <p className="font-num text-[11px] text-muted-foreground mt-1.5">{timeStr}</p>
      </div>

      {/* Checkbox */}
      <button
        type="button"
        aria-label={schedule.isCompleted ? '완료 해제' : '완료'}
        onClick={(e) => {
          e.stopPropagation();
          onComplete(schedule);
        }}
        className={`mt-1 w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center shrink-0 transition-colors ${
          schedule.isCompleted
            ? 'bg-primary border-primary'
            : 'border-muted-foreground/25 hover:border-primary'
        }`}
      >
        {schedule.isCompleted && (
          <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />
        )}
      </button>
    </div>
  );
};

export default ScheduleCard;
