import React from 'react';
import ScheduleCardCompact from './ScheduleCardCompact';
import { Schedule } from '@/types/types';

interface ScheduleGroup {
  date: string;
  label: string;
  schedules: Schedule[];
}

interface ScheduleStripProps {
  groups: ScheduleGroup[];
  onScheduleClick: (schedule: Schedule) => void;
  onComplete: (schedule: Schedule) => void;
  emptyMessage?: string;
}

const ScheduleStrip: React.FC<ScheduleStripProps> = ({
  groups,
  onScheduleClick,
  onComplete,
  emptyMessage = '일정이 없습니다',
}) => {
  if (groups.length === 0) {
    return <p className="text-xs text-muted-foreground/60 py-4 px-4">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto scrollbar-hide">
      <div className="flex gap-0 px-0 min-w-max">
        {groups.map((group, gIdx) => (
          <React.Fragment key={group.date}>
            <div className="flex flex-col">
              <p className="text-[10px] font-semibold text-muted-foreground px-3 pb-1.5 pt-1">
                {group.label}
              </p>
              <div className="flex gap-1.5 px-3">
                {group.schedules.map(s => (
                  <ScheduleCardCompact
                    key={s.id}
                    schedule={s}
                    onClick={onScheduleClick}
                    onComplete={onComplete}
                  />
                ))}
              </div>
            </div>
            {gIdx < groups.length - 1 && (
              <div className="flex items-stretch py-6">
                <div className="w-px bg-border mx-1.5" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default ScheduleStrip;
