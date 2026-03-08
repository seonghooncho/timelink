import React, { useMemo } from 'react';
import { Schedule } from '@/types/types';
import { getCategoryColor, getDayLabel } from '@/utils';

interface TimetableProps {
  schedules: Schedule[];
  startDate: Date;
  days: number;
  onBlockClick: (schedule: Schedule) => void;
  onPrev: () => void;
  onNext: () => void;
}

const HOUR_START = 7;
const HOUR_END = 20;
const HOUR_HEIGHT = 48;

interface RenderedSegment {
  scheduleId: string;
  schedule: Schedule;
  top: number;
  height: number;
  left: string;
  width: string;
  overflowCount: number;
  isFirst: boolean;
  connectedTop: boolean;    // has adjacent segment above (same schedule)
  connectedBottom: boolean;  // has adjacent segment below (same schedule)
}

function getH(timeStr: string): number {
  const d = new Date(timeStr);
  return d.getHours() + d.getMinutes() / 60;
}

function layoutSchedules(daySchedules: Schedule[]): RenderedSegment[] {
  if (daySchedules.length === 0) return [];

  // Collect all unique time boundaries
  const boundaries = new Set<number>();
  for (const s of daySchedules) {
    boundaries.add(getH(s.startTime));
    boundaries.add(getH(s.endTime));
  }
  const times = Array.from(boundaries).sort((a, b) => a - b);

  // For each schedule, track which segments it spans
  type SliceInfo = { start: number; end: number; active: Schedule[] };
  const slices: SliceInfo[] = [];
  for (let i = 0; i < times.length - 1; i++) {
    const start = times[i];
    const end = times[i + 1];
    const active = daySchedules.filter(s => getH(s.startTime) < end && getH(s.endTime) > start);
    slices.push({ start, end, active });
  }

  // For each slice, assign columns (max 2 visible)
  // We want continuity: if a schedule was in col 0 in the previous slice, keep it there
  const scheduleColumnMap = new Map<string, number>(); // persistent column assignment per schedule
  
  type SliceLayout = {
    start: number;
    end: number;
    visible: { schedule: Schedule; column: number }[];
    hiddenCount: number;
  };
  const sliceLayouts: SliceLayout[] = [];

  for (const slice of slices) {
    const active = slice.active.sort((a, b) => getH(a.startTime) - getH(b.startTime) || getH(b.endTime) - getH(a.endTime));
    
    // Try to preserve previous column assignments
    const assigned: { schedule: Schedule; column: number }[] = [];
    const usedCols = new Set<number>();
    
    // First pass: keep existing assignments
    for (const s of active) {
      const prevCol = scheduleColumnMap.get(s.id);
      if (prevCol !== undefined && prevCol < 2 && !usedCols.has(prevCol)) {
        assigned.push({ schedule: s, column: prevCol });
        usedCols.add(prevCol);
      }
    }
    
    // Second pass: assign unassigned to available columns
    const hidden: Schedule[] = [];
    for (const s of active) {
      if (assigned.some(a => a.schedule.id === s.id)) continue;
      let col = -1;
      if (!usedCols.has(0)) col = 0;
      else if (!usedCols.has(1)) col = 1;
      
      if (col >= 0) {
        assigned.push({ schedule: s, column: col });
        usedCols.add(col);
      } else {
        hidden.push(s);
      }
    }
    
    // Update persistent map
    for (const a of assigned) {
      scheduleColumnMap.set(a.schedule.id, a.column);
    }
    // Clear column for schedules no longer active
    for (const [id] of scheduleColumnMap) {
      if (!active.some(s => s.id === id)) {
        scheduleColumnMap.delete(id);
      }
    }

    sliceLayouts.push({
      start: slice.start,
      end: slice.end,
      visible: assigned.sort((a, b) => a.column - b.column),
      hiddenCount: hidden.length,
    });
  }

  // Now merge consecutive slices for each schedule where column and totalCols are the same
  const segments: RenderedSegment[] = [];
  const scheduleFirstSeen = new Set<string>();

  // Group slices into segments per schedule
  const scheduleSegments = new Map<string, { start: number; end: number; column: number; totalCols: number; overflowCount: number }[]>();
  
  for (const sl of sliceLayouts) {
    const totalCols = sl.visible.length >= 2 || sl.hiddenCount > 0 ? 2 : sl.visible.length;
    
    for (const v of sl.visible) {
      const key = v.schedule.id;
      if (!scheduleSegments.has(key)) scheduleSegments.set(key, []);
      const segs = scheduleSegments.get(key)!;
      const last = segs[segs.length - 1];
      
      const overflow = v.column === Math.max(...sl.visible.map(x => x.column)) ? sl.hiddenCount : 0;
      
      if (last && last.end === sl.start && last.column === v.column && last.totalCols === totalCols) {
        // Merge
        last.end = sl.end;
        last.overflowCount = Math.max(last.overflowCount, overflow);
      } else {
        segs.push({
          start: sl.start,
          end: sl.end,
          column: v.column,
          totalCols,
          overflowCount: overflow,
        });
      }
    }
  }

  // Convert to rendered segments
  for (const [schedId, segs] of scheduleSegments) {
    const schedule = daySchedules.find(s => s.id === schedId)!;
    for (let si = 0; si < segs.length; si++) {
      const seg = segs[si];
      const top = (Math.max(seg.start, HOUR_START) - HOUR_START) * HOUR_HEIGHT;
      const height = Math.max((Math.min(seg.end, HOUR_END) - Math.max(seg.start, HOUR_START)) * HOUR_HEIGHT, 16);
      
      const GAP = 2;
      let left: string, width: string;
      if (seg.totalCols === 1) {
        left = '2px';
        width = 'calc(100% - 4px)';
      } else {
        if (seg.column === 0) {
          left = '2px';
          width = `calc(50% - ${GAP / 2 + 1}px)`;
        } else {
          left = `calc(50% + ${GAP / 2}px)`;
          width = `calc(50% - ${GAP / 2 + 2}px)`;
        }
      }

      const isFirst = !scheduleFirstSeen.has(schedId);
      if (isFirst) scheduleFirstSeen.add(schedId);

      // Check adjacency for connected rendering
      const prevSeg = si > 0 ? segs[si - 1] : null;
      const nextSeg = si < segs.length - 1 ? segs[si + 1] : null;
      const connectedTop = !!(prevSeg && prevSeg.end === seg.start);
      const connectedBottom = !!(nextSeg && nextSeg.start === seg.end);

      segments.push({
        scheduleId: schedId,
        schedule,
        top,
        height,
        left,
        width,
        overflowCount: seg.overflowCount,
        isFirst,
        connectedTop,
        connectedBottom,
      });
    }
  }

  return segments;
}

const Timetable: React.FC<TimetableProps> = ({ schedules, startDate, days, onBlockClick, onPrev, onNext }) => {
  const dayDates = useMemo(() => {
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [startDate, days]);

  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;

  const dayLayouts = useMemo(() => {
    return dayDates.map(d => {
      const dayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const daySchedules = schedules.filter(s => s.startTime.slice(0, 10) === dayStr);
      return layoutSchedules(daySchedules);
    });
  }, [dayDates, schedules]);

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
      <div className="flex relative overflow-y-auto scrollbar-hide" style={{ height: 'calc(100vh - 260px)', minHeight: '300px' }}>
        {/* Time labels */}
        <div className="w-10 shrink-0 relative">
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
            <div key={dayIdx} className="flex-1 relative border-l border-border">
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
                      onClick={() => onBlockClick(s)}
                      className={`absolute px-1 py-0.5 text-left overflow-hidden transition-transform active:scale-[0.97] z-10 ${
                        s.isImportant ? getCategoryColor(s.category, 'strong') : getCategoryColor(s.category, 'light')
                      }`}
                      style={{
                        top: seg.connectedTop ? seg.top - 1 : seg.top,
                        height: seg.connectedTop ? seg.height + 1 : seg.height,
                        left: seg.left,
                        width: seg.width,
                        borderRadius,
                      }}
                    >
                      {seg.isFirst && (
                        <>
                          <p className="text-[9px] font-medium truncate">
                            {new Date(s.startTime).getHours()}:{String(new Date(s.startTime).getMinutes()).padStart(2, '0')}
                          </p>
                          <p className="text-[10px] font-semibold truncate">{s.title}</p>
                        </>
                      )}
                      {!seg.isFirst && seg.height > 20 && (
                        <p className="text-[10px] font-semibold truncate opacity-60">{s.title}</p>
                      )}
                      {seg.height > 48 && <p className="text-[9px] opacity-75 truncate">{s.duration}h</p>}
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
