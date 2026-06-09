import React, { useEffect, useMemo, useRef } from 'react';
import { Schedule } from '@/types/types';
import { getDayLabel, getScheduleColorStyle } from '@/utils';
import { formatScheduleSlotLabel } from '@/lib/scheduleTime';
import {
  getTimetableDraggedScrollTop,
  isScheduleVisibleOnDate,
  layoutSchedules,
  TIMETABLE_DEFAULT_VISIBLE_HOUR,
  TIMETABLE_HOUR_END,
  TIMETABLE_HOUR_HEIGHT,
  TIMETABLE_HOUR_START,
} from './timetableUtils';

interface TimetableProps {
  schedules: Schedule[];
  startDate: Date;
  days: number;
  onBlockClick: (schedule: Schedule) => void;
  onPrev: () => void;
  onNext: () => void;
}

const HOUR_START = TIMETABLE_HOUR_START;
const HOUR_END = TIMETABLE_HOUR_END;
const DEFAULT_VISIBLE_HOUR = TIMETABLE_DEFAULT_VISIBLE_HOUR;
const HOUR_HEIGHT = TIMETABLE_HOUR_HEIGHT;

const Timetable: React.FC<TimetableProps> = ({ schedules, startDate, days, onBlockClick, onPrev, onNext }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const dragStateRef = useRef<{ startY: number; startScrollTop: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);

  const dayDates = useMemo(() => {
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [startDate, days]);

  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const gridHeight = (HOUR_END - HOUR_START) * HOUR_HEIGHT;

  const dayLayouts = useMemo(() => {
    return dayDates.map(d => {
      const daySchedules = schedules.filter(s => isScheduleVisibleOnDate(s, d));
      return layoutSchedules(daySchedules);
    });
  }, [dayDates, schedules]);

  useEffect(() => {
    if (!scrollRef.current || initializedRef.current) {
      return;
    }

    scrollRef.current.scrollTop = DEFAULT_VISIBLE_HOUR * HOUR_HEIGHT;
    initializedRef.current = true;
  }, []);

  const getPointerY = (event: React.PointerEvent<HTMLDivElement>) => {
    if (Number.isFinite(event.clientY)) return event.clientY;
    if (Number.isFinite(event.pageY)) return event.pageY;
    if (Number.isFinite(event.screenY)) return event.screenY;
    return 0;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!scrollRef.current) {
      return;
    }

    dragStateRef.current = {
      startY: getPointerY(event),
      startScrollTop: scrollRef.current.scrollTop,
      moved: false,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!scrollRef.current || !dragStateRef.current) {
      return;
    }

    const deltaY = getPointerY(event) - dragStateRef.current.startY;
    if (Math.abs(deltaY) > 3) {
      dragStateRef.current.moved = true;
      suppressClickRef.current = true;
    }

    scrollRef.current.scrollTop = getTimetableDraggedScrollTop(
      dragStateRef.current.startScrollTop,
      dragStateRef.current.startY,
      getPointerY(event),
    );
  };

  const handlePointerEnd = () => {
    if (dragStateRef.current?.moved) {
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }

    dragStateRef.current = null;
  };

  return (
    <div className="relative">
      {/* Day headers */}
      <div className="flex border-b border-border sticky top-0 bg-card z-10">
        <button onClick={onPrev} className="w-8 shrink-0 flex items-center justify-center text-muted-foreground text-xs hover:text-foreground transition-colors">
          ‹
        </button>
        <div className="w-2 shrink-0" />
        {dayDates.map((d, i) => {
          const isToday = d.toDateString() === now.toDateString();
          return (
            <div key={i} className="flex-1 text-center py-2">
              <p className={`text-[10px] ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                {d.getMonth()+1}/{d.getDate()} ({getDayLabel(d.toISOString())})
              </p>
            </div>
          );
        })}
        <button onClick={onNext} className="w-8 shrink-0 flex items-center justify-center text-muted-foreground text-xs">
          ›
        </button>
      </div>

      {/* Grid */}
      <div
        ref={scrollRef}
        data-testid="timetable-scroll"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        className="flex relative overflow-y-auto scrollbar-hide cursor-grab active:cursor-grabbing select-none"
        style={{ height: 'calc(100vh - 260px)', minHeight: '300px', touchAction: 'none' }}
      >
        {/* Time labels */}
        <div className="w-10 shrink-0 relative" style={{ height: gridHeight }}>
          {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
            <div key={i} className="h-12 flex items-start justify-end pr-1.5 text-[10px] text-muted-foreground">
              {HOUR_START + i}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {dayDates.map((d, dayIdx) => {
          const isToday = d.toDateString() === now.toDateString();
          const segments = dayLayouts[dayIdx];

          return (
            <div
              key={dayIdx}
              className="flex-1 relative border-l border-border"
              data-testid={`timetable-day-column-${dayIdx}`}
              style={{ height: gridHeight }}
            >
              {/* Hour lines */}
              {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                <div key={i} className="h-12 border-b border-border/50" />
              ))}

              {/* Current time indicator */}
              {isToday && currentHour >= HOUR_START && currentHour <= HOUR_END && (
                <div
                  className="absolute left-0 right-0 h-0.5 bg-destructive z-20"
                  style={{ top: (currentHour - HOUR_START) * HOUR_HEIGHT }}
                >
                  <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-destructive" />
                </div>
              )}

              {/* Schedule segments */}
              {segments.map((seg, idx) => {
                const s = seg.schedule;
                // Dynamic border-radius: remove rounding on connected edges
                const radius = 6;
                const borderRadius = [
                  seg.connectedTop ? 0 : radius,   // top-left
                  seg.connectedTop ? 0 : radius,   // top-right
                  seg.connectedBottom ? 0 : radius, // bottom-right
                  seg.connectedBottom ? 0 : radius, // bottom-left
                ].map(r => `${r}px`).join(' ');

                return (
                  <React.Fragment key={`${seg.scheduleId}-${idx}`}>
                    <button
                      onClick={() => {
                        if (suppressClickRef.current) {
                          return;
                        }
                        onBlockClick(s);
                      }}
                      className="absolute px-1 py-0.5 text-left overflow-hidden border transition-transform active:scale-[0.97] z-10"
                      style={{
                        top: seg.connectedTop ? seg.top - 1 : seg.top,
                        height: seg.connectedTop ? seg.height + 1 : seg.height,
                        left: seg.left,
                        width: seg.width,
                        borderRadius,
                        ...getScheduleColorStyle(s, s.isImportant ? 'strong' : 'soft'),
                      }}
                    >
                      {seg.isFirst && (
                        <>
                          <p className="text-[8px] font-medium truncate">
                            {formatScheduleSlotLabel(s)}
                          </p>
                          {seg.height >= 34 && (
                            <p className="text-[10px] font-semibold truncate">{s.title}</p>
                          )}
                        </>
                      )}
                      {!seg.isFirst && seg.height > 20 && (
                        <p className="text-[10px] font-semibold truncate opacity-60">{s.title}</p>
                      )}
                    </button>

                    {/* Overflow badge */}
                    {seg.overflowCount > 0 && (
                      <div
                        className="absolute z-20"
                        style={{
                          top: seg.top + 1,
                          left: seg.left,
                          width: seg.width,
                        }}
                      >
                        <div className="absolute -right-0.5 -top-1">
                          <span className="text-[8px] font-bold bg-muted-foreground/80 text-background rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1 shadow-sm">
                            +{seg.overflowCount}
                          </span>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          );
        })}

        <div className="w-8 shrink-0" />
      </div>
    </div>
  );
};

export default Timetable;
