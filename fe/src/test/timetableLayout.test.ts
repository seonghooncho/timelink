import { describe, it, expect } from 'vitest';
import { Schedule } from '@/types/types';
import {
  getDefaultScheduleAnchor,
  getDefaultTimetableStart,
  getH,
  getScheduleEndHour,
  layoutSchedules,
  toLocalDateKey,
} from '@/components/schedule/timetableUtils';

function makeSchedule(overrides: Partial<Schedule> & { id: string; startTime: string }): Schedule {
  return {
    id: overrides.id,
    title: overrides.title ?? `Schedule ${overrides.id}`,
    content: '',
    category: overrides.category ?? 'task',
    isImportant: overrides.isImportant ?? false,
    startTime: overrides.startTime,
    endTime: overrides.endTime ?? overrides.startTime,
    duration: overrides.duration ?? 0,
    isCompleted: overrides.isCompleted ?? false,
    hasAlarm: overrides.hasAlarm ?? false,
  };
}

describe('Timetable getH utility', () => {
  it('converts ISO time to decimal hours', () => {
    expect(getH('2025-03-08T09:00:00')).toBe(9);
    expect(getH('2025-03-08T09:30:00')).toBe(9.5);
    expect(getH('2025-03-08T14:15:00')).toBe(14.25);
  });
});

describe('Timetable schedule filtering', () => {
  const schedules: Schedule[] = [
    {
      id: '1', title: 'A', content: '', category: 'task',
      isImportant: false, startTime: '2025-03-08T10:00:00',
      endTime: '2025-03-08T12:00:00', duration: 2, isCompleted: false, hasAlarm: false,
    },
    {
      id: '2', title: 'B', content: '', category: 'task',
      isImportant: false, startTime: '2025-03-09T10:00:00',
      endTime: '2025-03-09T12:00:00', duration: 2, isCompleted: false, hasAlarm: false,
    },
  ];

  it('filters schedules by day correctly', () => {
    const dayStr = '2025-03-08';
    const filtered = schedules.filter(s => s.startTime.slice(0, 10) === dayStr);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('1');
  });

  it('uses local date keys instead of UTC ISO date keys', () => {
    const d = new Date(2025, 2, 8);
    const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    expect(toLocalDateKey(d)).toBe(localDate);
    expect(localDate).toBe('2025-03-08');
  });
});

describe('Timetable overlap handling', () => {
  it('handles completely overlapping schedules', () => {
    // Two schedules at the exact same time should both be visible (side by side)
    const s1: Schedule = {
      id: '1', title: 'A', content: '', category: 'task',
      isImportant: false, startTime: '2025-03-08T10:00:00',
      endTime: '2025-03-08T12:00:00', duration: 2, isCompleted: false, hasAlarm: false,
    };
    const s2: Schedule = {
      id: '2', title: 'B', content: '', category: 'appointment',
      isImportant: false, startTime: '2025-03-08T10:00:00',
      endTime: '2025-03-08T12:00:00', duration: 2, isCompleted: false, hasAlarm: false,
    };
    const segments = layoutSchedules([s1, s2]);
    const visibleIds = new Set(segments.map(segment => segment.scheduleId));

    expect(visibleIds).toEqual(new Set(['1', '2']));
    expect(segments.some(segment => segment.left.startsWith('calc(50%'))).toBe(true);
  });

  it('3+ overlapping schedules: 3rd becomes overflow', () => {
    // The Timetable layout only shows max 2 columns
    // 3rd+ schedules become hidden with overflow count
    // This is by design but worth documenting
    const overlapping = Array.from({ length: 4 }, (_, i) => ({
      id: String(i),
      title: `Schedule ${i}`,
      content: '',
      category: 'task' as const,
      isImportant: false,
      startTime: '2025-03-08T10:00:00',
      endTime: '2025-03-08T12:00:00',
      duration: 2,
      isCompleted: false,
      hasAlarm: false,
    }));
    const segments = layoutSchedules(overlapping);

    expect(new Set(segments.map(segment => segment.scheduleId)).size).toBe(2);
    expect(segments.some(segment => segment.overflowCount === 2)).toBe(true);
  });

  it('renders a block from duration when endTime equals startTime', () => {
    const schedule = makeSchedule({
      id: 'duration',
      startTime: '2025-03-08T14:00:00',
      endTime: '2025-03-08T14:00:00',
      duration: 2,
    });

    const segments = layoutSchedules([schedule]);

    expect(getScheduleEndHour(schedule)).toBe(16);
    expect(segments).toHaveLength(1);
    expect(segments[0].top).toBe(14 * 48);
    expect(segments[0].height).toBe(2 * 48);
  });

  it('prefers duration over a stale endTime', () => {
    const schedule = makeSchedule({
      id: 'stale-end',
      startTime: '2025-03-08T14:00:00',
      endTime: '2025-03-08T15:00:00',
      duration: 3,
    });

    const segments = layoutSchedules([schedule]);

    expect(getScheduleEndHour(schedule)).toBe(17);
    expect(segments).toHaveLength(1);
    expect(segments[0].height).toBe(3 * 48);
  });

  it('renders a minimum block for zero-duration schedules', () => {
    const schedule = makeSchedule({
      id: 'zero',
      startTime: '2025-03-08T09:30:00',
      endTime: '2025-03-08T09:30:00',
      duration: 0,
    });

    const segments = layoutSchedules([schedule]);

    expect(segments).toHaveLength(1);
    expect(segments[0].height).toBeGreaterThanOrEqual(16);
  });

  it('keeps partially overlapping schedules visible when starts differ', () => {
    const schedules = [
      makeSchedule({
        id: 'a',
        startTime: '2025-03-08T10:00:00',
        endTime: '2025-03-08T12:00:00',
        duration: 2,
      }),
      makeSchedule({
        id: 'b',
        startTime: '2025-03-08T10:30:00',
        endTime: '2025-03-08T11:30:00',
        duration: 1,
      }),
      makeSchedule({
        id: 'c',
        startTime: '2025-03-08T11:00:00',
        endTime: '2025-03-08T12:30:00',
        duration: 1.5,
      }),
    ];

    const segments = layoutSchedules(schedules);
    const visibleIds = new Set(segments.map(segment => segment.scheduleId));

    expect(visibleIds.has('a')).toBe(true);
    expect(visibleIds.size).toBeGreaterThanOrEqual(2);
    expect(segments.some(segment => segment.overflowCount > 0)).toBe(true);
  });
});

describe('Timetable default anchor', () => {
  it('keeps the timetable date on today while cards start from the first non-past schedule', () => {
    const schedules = [
      makeSchedule({
        id: 'past',
        startTime: '2026-03-08T10:00:00',
        endTime: '2026-03-08T11:00:00',
      }),
      makeSchedule({
        id: 'future',
        startTime: '2026-03-11T09:00:00',
        endTime: '2026-03-11T10:00:00',
      }),
    ];

    const anchor = getDefaultScheduleAnchor(schedules, new Date('2026-03-10T15:00:00'));

    expect(toLocalDateKey(getDefaultTimetableStart(new Date('2026-03-10T15:00:00')))).toBe('2026-03-10');
    expect(anchor.anchorScheduleId).toBe('future');
    expect(anchor.hasPreviousSchedules).toBe(true);
  });

  it('falls back to the closest past card when every active schedule is before today', () => {
    const schedules = [
      makeSchedule({
        id: 'older-past',
        startTime: '2026-03-06T10:00:00',
        endTime: '2026-03-06T11:00:00',
      }),
      makeSchedule({
        id: 'recent-past',
        startTime: '2026-03-08T10:00:00',
        endTime: '2026-03-08T11:00:00',
      }),
    ];

    const anchor = getDefaultScheduleAnchor(schedules, new Date('2026-03-10T15:00:00'));

    expect(toLocalDateKey(getDefaultTimetableStart(new Date('2026-03-10T15:00:00')))).toBe('2026-03-10');
    expect(anchor.anchorScheduleId).toBe('recent-past');
    expect(anchor.hasPreviousSchedules).toBe(true);
  });
});
