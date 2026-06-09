import React from 'react';
import { Schedule } from '@/types/types';
import { getCategoryLabel, getScheduleColorStyle } from '@/utils';

interface ScheduleCardCompactProps {
  schedule: Schedule;
  onClick: (schedule: Schedule) => void;
  onComplete: (schedule: Schedule) => void;
}

const ScheduleCardCompact: React.FC<ScheduleCardCompactProps> = ({ schedule, onClick, onComplete }) => {
  const startDate = new Date(schedule.startTime);
  const timeStr = `${startDate.getHours()}:${String(startDate.getMinutes()).padStart(2, '0')}`;
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
        <p className="font-num text-xs font-semibold opacity-70">{timeStr}</p>
        <p className="text-[13px] font-bold mt-1 leading-snug line-clamp-2">
          {schedule.title}
        </p>
      </div>

      {/* Bottom */}
      <div className="flex items-end justify-between mt-auto pt-2">
        {schedule.duration > 0 && (
          <span className={`font-num text-[10px] font-medium ${isImportant ? 'opacity-60' : 'text-muted-foreground'}`}>
            {schedule.duration}h
          </span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onComplete(schedule); }}
          className={`w-5 h-5 rounded-md border-[1.5px] flex items-center justify-center shrink-0 transition-colors ${
            schedule.isCompleted
              ? 'bg-primary border-primary'
              : isImportant
                ? 'border-primary-foreground/40 hover:border-primary-foreground/70'
                : 'border-muted-foreground/30 hover:border-primary'
          }`}
        >
          {schedule.isCompleted && (
            <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default ScheduleCardCompact;
