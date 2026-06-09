import { Schedule } from '@/types/types';

export const TIMETABLE_HOUR_START = 0;
export const TIMETABLE_HOUR_END = 24;
export const TIMETABLE_DEFAULT_VISIBLE_HOUR = 7;
export const TIMETABLE_HOUR_HEIGHT = 48;
export const TIMETABLE_MIN_BLOCK_HOURS = 0.5;

export const getTimetableDraggedScrollTop = (startScrollTop: number, startY: number, currentY: number) =>
  startScrollTop - (currentY - startY);

export const toLocalDateKey = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const startOfLocalDay = (value: Date | string) => {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const getScheduleStartHour = (schedule: Pick<Schedule, 'startTime'>) => {
  const start = new Date(schedule.startTime);
  return start.getHours() + start.getMinutes() / 60;
};

export const getScheduleEndHour = (schedule: Pick<Schedule, 'startTime' | 'endTime' | 'duration'>) => {
  const start = new Date(schedule.startTime);
  const end = new Date(schedule.endTime);
  const startHour = start.getHours() + start.getMinutes() / 60;
  const endHour = end.getHours() + end.getMinutes() / 60;

  if (end.getTime() > start.getTime()) {
    if (toLocalDateKey(end) !== toLocalDateKey(start)) {
      return TIMETABLE_HOUR_END;
    }
    return endHour;
  }

  const fallbackDuration = schedule.duration > 0 ? schedule.duration : TIMETABLE_MIN_BLOCK_HOURS;
  return startHour + Math.max(fallbackDuration, TIMETABLE_MIN_BLOCK_HOURS);
};

export const isScheduleVisibleOnDate = (schedule: Schedule, date: Date) => {
  return toLocalDateKey(schedule.startTime) === toLocalDateKey(date);
};

export interface RenderedTimetableSegment {
  scheduleId: string;
  schedule: Schedule;
  top: number;
  height: number;
  left: string;
  width: string;
  overflowCount: number;
  isFirst: boolean;
  connectedTop: boolean;
  connectedBottom: boolean;
}

export function getH(timeStr: string): number {
  const d = new Date(timeStr);
  return d.getHours() + d.getMinutes() / 60;
}

export function layoutSchedules(daySchedules: Schedule[]): RenderedTimetableSegment[] {
  if (daySchedules.length === 0) return [];

  const boundaries = new Set<number>();
  for (const schedule of daySchedules) {
    const start = getScheduleStartHour(schedule);
    const end = getScheduleEndHour(schedule);
    if (end <= TIMETABLE_HOUR_START || start >= TIMETABLE_HOUR_END) {
      continue;
    }
    boundaries.add(Math.max(start, TIMETABLE_HOUR_START));
    boundaries.add(Math.min(end, TIMETABLE_HOUR_END));
  }

  const times = Array.from(boundaries).sort((a, b) => a - b);
  if (times.length < 2) return [];

  type SliceInfo = { start: number; end: number; active: Schedule[] };
  const slices: SliceInfo[] = [];
  for (let i = 0; i < times.length - 1; i++) {
    const start = times[i];
    const end = times[i + 1];
    const active = daySchedules.filter(schedule =>
      getScheduleStartHour(schedule) < end && getScheduleEndHour(schedule) > start
    );
    slices.push({ start, end, active });
  }

  const scheduleColumnMap = new Map<string, number>();
  type SliceLayout = {
    start: number;
    end: number;
    visible: { schedule: Schedule; column: number }[];
    hiddenCount: number;
  };
  const sliceLayouts: SliceLayout[] = [];

  for (const slice of slices) {
    const active = slice.active.sort((a, b) =>
      getScheduleStartHour(a) - getScheduleStartHour(b) || getScheduleEndHour(b) - getScheduleEndHour(a)
    );
    const assigned: { schedule: Schedule; column: number }[] = [];
    const usedCols = new Set<number>();

    for (const schedule of active) {
      const prevCol = scheduleColumnMap.get(schedule.id);
      if (prevCol !== undefined && prevCol < 2 && !usedCols.has(prevCol)) {
        assigned.push({ schedule, column: prevCol });
        usedCols.add(prevCol);
      }
    }

    const hidden: Schedule[] = [];
    for (const schedule of active) {
      if (assigned.some(assignment => assignment.schedule.id === schedule.id)) continue;
      let col = -1;
      if (!usedCols.has(0)) col = 0;
      else if (!usedCols.has(1)) col = 1;

      if (col >= 0) {
        assigned.push({ schedule, column: col });
        usedCols.add(col);
      } else {
        hidden.push(schedule);
      }
    }

    for (const assignment of assigned) {
      scheduleColumnMap.set(assignment.schedule.id, assignment.column);
    }
    for (const [id] of scheduleColumnMap) {
      if (!active.some(schedule => schedule.id === id)) {
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

  const scheduleSegments = new Map<string, {
    start: number;
    end: number;
    column: number;
    totalCols: number;
    overflowCount: number;
  }[]>();

  for (const sliceLayout of sliceLayouts) {
    const totalCols = sliceLayout.visible.length >= 2 || sliceLayout.hiddenCount > 0 ? 2 : sliceLayout.visible.length;
    const maxColumn = Math.max(...sliceLayout.visible.map(item => item.column));

    for (const visible of sliceLayout.visible) {
      const key = visible.schedule.id;
      if (!scheduleSegments.has(key)) scheduleSegments.set(key, []);
      const segments = scheduleSegments.get(key)!;
      const last = segments[segments.length - 1];
      const overflow = visible.column === maxColumn ? sliceLayout.hiddenCount : 0;

      if (last && last.end === sliceLayout.start && last.column === visible.column && last.totalCols === totalCols) {
        last.end = sliceLayout.end;
        last.overflowCount = Math.max(last.overflowCount, overflow);
      } else {
        segments.push({
          start: sliceLayout.start,
          end: sliceLayout.end,
          column: visible.column,
          totalCols,
          overflowCount: overflow,
        });
      }
    }
  }

  const renderedSegments: RenderedTimetableSegment[] = [];
  const scheduleFirstSeen = new Set<string>();
  for (const [scheduleId, segments] of scheduleSegments) {
    const schedule = daySchedules.find(item => item.id === scheduleId)!;
    for (let index = 0; index < segments.length; index++) {
      const segment = segments[index];
      const visibleStart = Math.max(segment.start, TIMETABLE_HOUR_START);
      const visibleEnd = Math.min(segment.end, TIMETABLE_HOUR_END);
      const top = (visibleStart - TIMETABLE_HOUR_START) * TIMETABLE_HOUR_HEIGHT;
      const height = Math.max((visibleEnd - visibleStart) * TIMETABLE_HOUR_HEIGHT, 16);

      const gap = 2;
      const left = segment.totalCols === 1 || segment.column === 0
        ? '2px'
        : `calc(50% + ${gap / 2}px)`;
      const width = segment.totalCols === 1
        ? 'calc(100% - 4px)'
        : segment.column === 0
          ? `calc(50% - ${gap / 2 + 1}px)`
          : `calc(50% - ${gap / 2 + 2}px)`;

      const isFirst = !scheduleFirstSeen.has(scheduleId);
      if (isFirst) scheduleFirstSeen.add(scheduleId);

      const prevSegment = index > 0 ? segments[index - 1] : null;
      const nextSegment = index < segments.length - 1 ? segments[index + 1] : null;

      renderedSegments.push({
        scheduleId,
        schedule,
        top,
        height,
        left,
        width,
        overflowCount: segment.overflowCount,
        isFirst,
        connectedTop: !!(prevSegment && prevSegment.end === segment.start),
        connectedBottom: !!(nextSegment && nextSegment.start === segment.end),
      });
    }
  }

  return renderedSegments;
}

export const isSchedulePastByEndDate = (schedule: Schedule, today = new Date()) => {
  const end = new Date(schedule.endTime);
  const fallbackEnd = new Date(schedule.startTime);
  if (end.getTime() <= fallbackEnd.getTime() && schedule.duration > 0) {
    fallbackEnd.setMinutes(fallbackEnd.getMinutes() + schedule.duration * 60);
  }

  const effectiveEnd = end.getTime() > fallbackEnd.getTime() ? end : fallbackEnd;
  return effectiveEnd < startOfLocalDay(today);
};

export const getDefaultTimetableStart = (today = new Date()) => startOfLocalDay(today);

export const getDefaultScheduleAnchor = (schedules: Schedule[], today = new Date()) => {
  const activeSchedules = [...schedules]
    .filter(schedule => !schedule.isCompleted)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const anchor = activeSchedules.find(schedule => !isSchedulePastByEndDate(schedule, today))
    ?? activeSchedules[activeSchedules.length - 1];
  const hasPreviousSchedules = anchor
    ? activeSchedules.some(schedule => new Date(schedule.startTime).getTime() < new Date(anchor.startTime).getTime())
    : false;

  return {
    anchorScheduleId: anchor?.id,
    hasPreviousSchedules,
  };
};
