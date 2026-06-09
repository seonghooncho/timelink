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
  initialScheduleId?: string;
  hasPreviousSchedules?: boolean;
}

const ScheduleStrip: React.FC<ScheduleStripProps> = ({
  groups,
  onScheduleClick,
  onComplete,
  emptyMessage = '일정이 없습니다',
  initialScheduleId,
  hasPreviousSchedules = false,
}) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const scheduleRefs = React.useRef(new Map<string, HTMLDivElement>());
  const lastInitialScheduleIdRef = React.useRef<string | undefined>();

  React.useEffect(() => {
    if (!initialScheduleId || lastInitialScheduleIdRef.current === initialScheduleId) {
      return;
    }

    const container = scrollRef.current;
    const target = scheduleRefs.current.get(initialScheduleId);
    if (!container || !target) {
      return;
    }

    container.scrollTo({
      left: Math.max(target.offsetLeft - 14, 0),
      behavior: 'auto',
    });
    lastInitialScheduleIdRef.current = initialScheduleId;
  }, [groups, initialScheduleId]);

  if (groups.length === 0) {
    return <p className="text-xs text-muted-foreground/60 py-4 px-4">{emptyMessage}</p>;
  }

  return (
    <div className="relative">
      {hasPreviousSchedules && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-foreground/20 to-transparent"
        />
      )}
      <div ref={scrollRef} className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-0 px-0 min-w-max">
          {groups.map((group, gIdx) => (
            <React.Fragment key={group.date}>
              <div className="flex flex-col">
                <p className="text-[10px] font-semibold text-muted-foreground px-3 pb-1.5 pt-1">
                  {group.label}
                </p>
                <div className="flex gap-1.5 px-3">
                  {group.schedules.map(s => (
                    <div
                      key={s.id}
                      ref={(node) => {
                        if (node) scheduleRefs.current.set(s.id, node);
                        else scheduleRefs.current.delete(s.id);
                      }}
                    >
                      <ScheduleCardCompact
                        schedule={s}
                        onClick={onScheduleClick}
                        onComplete={onComplete}
                      />
                    </div>
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
    </div>
  );
};

export default ScheduleStrip;
