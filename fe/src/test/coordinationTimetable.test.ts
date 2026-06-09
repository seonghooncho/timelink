import { describe, expect, it } from 'vitest';
import {
  buildCoordinationSlotKey,
  groupSchedulesByCoordinationSlot,
  scheduleOverlapsCoordinationSlot,
} from '@/lib/coordinationTimetable';
import type { Schedule } from '@/types/types';

const makeSchedule = (overrides: Partial<Schedule> & { id: string; startTime: string; duration: number }): Schedule => ({
  title: '일정',
  content: '',
  category: 'appointment',
  isImportant: false,
  endTime: overrides.startTime,
  isCompleted: false,
  hasAlarm: false,
  ...overrides,
});

describe('coordination timetable slot helpers', () => {
  it('30분 경계에 걸친 기존 일정을 겹치는 시간 슬롯에 모두 배치한다', () => {
    const date = new Date(2026, 2, 12);
    const schedule = makeSchedule({
      id: 'schedule-1',
      title: '면담',
      startTime: '2026-03-12T09:30:00',
      duration: 1,
    });

    expect(scheduleOverlapsCoordinationSlot(schedule, date, 9)).toBe(true);
    expect(scheduleOverlapsCoordinationSlot(schedule, date, 10)).toBe(true);
    expect(scheduleOverlapsCoordinationSlot(schedule, date, 11)).toBe(false);

    const grouped = groupSchedulesByCoordinationSlot([schedule], [date], [9, 10, 11]);

    expect(grouped[buildCoordinationSlotKey(0, 9)]).toEqual([schedule]);
    expect(grouped[buildCoordinationSlotKey(0, 10)]).toEqual([schedule]);
    expect(grouped[buildCoordinationSlotKey(0, 11)]).toBeUndefined();
  });

  it('종료 시각이 슬롯 시작과 같으면 다음 슬롯에는 표시하지 않는다', () => {
    const date = new Date(2026, 2, 12);
    const schedule = makeSchedule({
      id: 'schedule-2',
      title: '회의',
      startTime: '2026-03-12T09:00:00',
      duration: 1,
    });

    expect(scheduleOverlapsCoordinationSlot(schedule, date, 9)).toBe(true);
    expect(scheduleOverlapsCoordinationSlot(schedule, date, 10)).toBe(false);
  });
});
