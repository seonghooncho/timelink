import { describe, expect, it } from 'vitest';
import {
  buildCoordinationSlotKey,
  formatCoordinationHourTime,
  getCoordinationDateWindowStarts,
  getRecommendedCoordinationAvailabilityWindow,
  getRecommendedCoordinationScheduleSlot,
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

  it('선택한 결과 슬롯이 유효하면 모임 일정 생성 후보로 우선 사용한다', () => {
    const selected = { date: '2026-03-13', hour: 15, count: 1 };

    expect(getRecommendedCoordinationScheduleSlot(
      [
        { date: '2026-03-12', hour: 9, count: 4 },
        selected,
      ],
      ['2026-03-12', '2026-03-13'],
      selected,
    )).toEqual(selected);
  });

  it('선택한 슬롯이 없으면 가장 많이 겹치는 빠른 시간으로 추천한다', () => {
    expect(getRecommendedCoordinationScheduleSlot(
      [
        { date: '2026-03-13', hour: 10, count: 0 },
        { date: '2026-03-13', hour: 12, count: 3 },
        { date: '2026-03-12', hour: 14, count: 3 },
        { date: '2026-03-12', hour: 9, count: 2 },
      ],
      ['2026-03-12', '2026-03-13'],
    )).toEqual({ date: '2026-03-12', hour: 14, count: 3 });
  });

  it('최대 투표수가 같으면 더 오래 연속으로 겹치는 구간을 추천한다', () => {
    expect(getRecommendedCoordinationAvailabilityWindow(
      [
        { date: '2026-03-12', hour: 9, count: 4 },
        { date: '2026-03-12', hour: 10, count: 4 },
        { date: '2026-03-13', hour: 9, count: 4 },
        { date: '2026-03-13', hour: 11, count: 4 },
        { date: '2026-03-12', hour: 11, count: 3 },
      ],
      ['2026-03-12', '2026-03-13'],
    )).toMatchObject({
      date: '2026-03-12',
      startHour: 9,
      endHour: 11,
      count: 4,
    });
  });

  it('조율 시간 슬롯을 일정 생성 폼 시간 형식으로 변환한다', () => {
    expect(formatCoordinationHourTime(9)).toBe('09:00');
    expect(formatCoordinationHourTime(15)).toBe('15:00');
  });

  it('조율 날짜가 5개를 넘으면 마지막 페이지도 5개가 보이도록 시작점을 겹쳐 잡는다', () => {
    expect(getCoordinationDateWindowStarts(3)).toEqual([0]);
    expect(getCoordinationDateWindowStarts(8)).toEqual([0, 3]);
    expect(getCoordinationDateWindowStarts(10)).toEqual([0, 5]);
    expect(getCoordinationDateWindowStarts(12)).toEqual([0, 5, 7]);
  });
});
