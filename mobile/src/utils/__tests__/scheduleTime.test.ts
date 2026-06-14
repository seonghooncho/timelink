import {
  DURATION_OPTIONS,
  HALF_HOUR_TIME_OPTIONS,
  formatDurationLabel,
  getScheduleEnd,
  validateScheduleDateTime,
} from '../scheduleTime';

describe('scheduleTime mobile boundaries', () => {
  it('exposes only 30 minute start slots', () => {
    expect(HALF_HOUR_TIME_OPTIONS).toHaveLength(48);
    expect(HALF_HOUR_TIME_OPTIONS[0]).toBe('00:00');
    expect(HALF_HOUR_TIME_OPTIONS[1]).toBe('00:30');
    expect(HALF_HOUR_TIME_OPTIONS[47]).toBe('23:30');
  });

  it('rejects non half-hour start times and invalid durations', () => {
    expect(validateScheduleDateTime('2026-06-14', '09:15', 1)).toContain('30분 단위');
    expect(validateScheduleDateTime('2026-06-14', '09:00', 0.25)).toContain('30분 이상');
    expect(validateScheduleDateTime('2026-06-14', '09:00', 0.75)).toContain('30분 단위');
  });

  it('rejects schedules that cross local date boundary', () => {
    expect(validateScheduleDateTime('2026-06-14', '23:30', 1)).toContain('같은 날짜');
    expect(validateScheduleDateTime('2026-06-14', '22:30', 1)).toBeNull();
  });

  it('prefers duration over deprecated endTime', () => {
    const end = getScheduleEnd({
      startTime: '2026-06-14T10:00:00',
      duration: 2,
      endTime: '2026-06-14T10:30:00',
    });
    expect(end.getHours()).toBe(12);
  });

  it('keeps duration options bounded and readable', () => {
    expect(DURATION_OPTIONS[0]).toBe(0.5);
    expect(DURATION_OPTIONS[DURATION_OPTIONS.length - 1]).toBe(8);
    expect(formatDurationLabel(0.5)).toBe('30분');
    expect(formatDurationLabel(1.5)).toBe('1시간 30분');
  });
});
