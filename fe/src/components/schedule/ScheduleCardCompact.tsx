import React from 'react';
import { Check } from 'lucide-react';
import { Schedule } from '@/types/types';
import { getCategoryLabel, getScheduleColorStyle } from '@/utils';
import { formatDurationLabel, formatScheduleClock } from '@/lib/scheduleTime';

interface ScheduleCardCompactProps {
  schedule: Schedule;
  onClick: (schedule: Schedule) => void;
  onComplete: (schedule: Schedule) => void;
}

const ScheduleCardCompact: React.FC<ScheduleCardCompactProps> = ({ schedule, onClick, onComplete }) => {
  const isImportant = schedule.isImportant;
  const cardColorStyle = getScheduleColorStyle(schedule, isImportant ? 'solid' : 'soft');
  const dotColorStyle = getScheduleColorStyle(schedule, 'line');

  return (
    <div
      className="relative flex flex-col justify-between min-w-[120px] w-[120px] h-[144px] rounded-2xl border p-3.5 cursor-pointer pressable shrink-0 shadow-soft"
      style={cardColorStyle}
      onClick={() => onClick(schedule)}
    >
      {/* Top */}
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          {!isImportant && (
            <div className="w-1.5 h-1.5 rounded-full" style={dotColorStyle} />
          )}
          <span className={`text-[10px] font-medium ${isImportant ? 'opacity-80' : 'opacity-75'}`}>
            {getCategoryLabel(schedule.category)}
          </span>
        </div>
        <p className="font-num text-xs font-semibold opacity-70">{formatScheduleClock(schedule.startTime)}</p>
        <p className="text-[13px] font-bold mt-1 leading-snug line-clamp-2">
          {schedule.title}
        </p>
      </div>

      {/* Bottom */}
      <div className="flex items-end justify-between mt-auto pt-2">
        <span className={`font-num text-[10px] font-medium ${isImportant ? 'opacity-60' : 'text-muted-foreground'}`}>
          {formatDurationLabel(schedule.duration)}
        </span>
        <button
          type="button"
          aria-label={schedule.isCompleted ? '완료 해제' : '완료'}
          onClick={(e) => { e.stopPropagation(); onComplete(schedule); }}
          className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center shrink-0 transition-colors ${
            schedule.isCompleted
              ? 'bg-primary border-primary'
              : isImportant
                ? 'border-primary-foreground/40 hover:border-primary-foreground/70'
                : 'border-muted-foreground/30 hover:border-primary'
          }`}
        >
          {schedule.isCompleted && (
            <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />
          )}
        </button>
      </div>
    </div>
  );
};

export default ScheduleCardCompact;
