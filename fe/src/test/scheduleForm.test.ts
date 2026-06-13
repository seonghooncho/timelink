import { describe, it, expect } from 'vitest';
import {
  buildScheduleCreateRequest,
  formatHalfHourTimeLabel,
  HALF_HOUR_TIME_OPTIONS,
  isHalfHourTime,
  normalizeTimeToHalfHour,
  SCHEDULE_CONTENT_MAX_LENGTH,
  SCHEDULE_TITLE_MAX_LENGTH,
  SCHEDULE_TIME_STEP_SECONDS,
  ScheduleFormValues,
} from '@/lib/scheduleForm';

function makeValues(overrides: Partial<ScheduleFormValues> = {}): ScheduleFormValues {
  return {
    title: '회의',
    content: '팀 회의',
    category: 'appointment',
    isImportant: true,
    startDate: '2025-03-08',
    startTime: '14:00',
    duration: '2',
    hasAlarm: true,
    ...overrides,
  };
}

describe('Schedule form logic', () => {
  it('creates schedule payload with all fields', () => {
    const result = buildScheduleCreateRequest(makeValues());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.startTime).toBe('2025-03-08T14:00:00');
    expect(result.data.duration).toBe(2);
    expect('endTime' in result.data).toBe(false);
  });

  it('uses one hour as the default duration', () => {
    const result = buildScheduleCreateRequest(makeValues({
      duration: '',
    }));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.duration).toBe(1);
  });

  it('requires title, start date, and start time with specific validation messages', () => {
    expect(buildScheduleCreateRequest(makeValues({ title: '   ' }))).toMatchObject({
      ok: false,
      message: '제목을 입력해주세요',
    });
    expect(buildScheduleCreateRequest(makeValues({ startDate: '' }))).toMatchObject({
      ok: false,
      message: '시작 날짜를 선택해주세요',
    });
    expect(buildScheduleCreateRequest(makeValues({ startTime: '' }))).toMatchObject({
      ok: false,
      message: '시작 시간을 선택해주세요',
    });
  });

  it('rejects overly long title and content', () => {
    expect(buildScheduleCreateRequest(makeValues({ title: '가'.repeat(SCHEDULE_TITLE_MAX_LENGTH + 1) }))).toMatchObject({
      ok: false,
      message: '제목이 너무 깁니다',
    });
    expect(buildScheduleCreateRequest(makeValues({ content: '나'.repeat(SCHEDULE_CONTENT_MAX_LENGTH + 1) }))).toMatchObject({
      ok: false,
      message: '내용이 너무 깁니다',
    });
  });

  it('uses 30 minute time steps and rejects off-step times', () => {
    expect(SCHEDULE_TIME_STEP_SECONDS).toBe(1800);
    expect(HALF_HOUR_TIME_OPTIONS).toHaveLength(48);
    expect(HALF_HOUR_TIME_OPTIONS[0]).toBe('00:00');
    expect(HALF_HOUR_TIME_OPTIONS[1]).toBe('00:30');
    expect(HALF_HOUR_TIME_OPTIONS[47]).toBe('23:30');
    expect(isHalfHourTime('09:00')).toBe(true);
    expect(isHalfHourTime('09:30')).toBe(true);
    expect(isHalfHourTime('09:15')).toBe(false);

    const result = buildScheduleCreateRequest(makeValues({ startTime: '14:15' }));

    expect(result).toMatchObject({
      ok: false,
      message: '시작 시간을 확인해주세요',
    });
  });

  it('normalizes manual time input to the nearest half hour', () => {
    expect(normalizeTimeToHalfHour('09:14')).toBe('09:00');
    expect(normalizeTimeToHalfHour('09:16')).toBe('09:30');
    expect(normalizeTimeToHalfHour('23:46')).toBe('23:30');
  });

  it('formats half hour options for compact mobile selection', () => {
    expect(formatHalfHourTimeLabel('00:00')).toBe('오전 12:00');
    expect(formatHalfHourTimeLabel('09:30')).toBe('오전 9:30');
    expect(formatHalfHourTimeLabel('12:00')).toBe('오후 12:00');
    expect(formatHalfHourTimeLabel('18:30')).toBe('오후 6:30');
  });

  it('rejects a duration that crosses into the next date', () => {
    expect(buildScheduleCreateRequest(makeValues({ startTime: '23:30', duration: '1' }))).toMatchObject({
      ok: false,
      message: '소요 시간을 확인해주세요',
      description: '시작 시간과 소요시간은 같은 날짜 안에서 끝나야 합니다.',
    });
  });

  it('rejects invalid duration values', () => {
    expect(buildScheduleCreateRequest(makeValues({ duration: '0' }))).toMatchObject({
      ok: false,
      message: '소요 시간을 확인해주세요',
    });
    expect(buildScheduleCreateRequest(makeValues({ duration: 'abc' }))).toMatchObject({
      ok: false,
      message: '소요 시간을 확인해주세요',
    });
    expect(buildScheduleCreateRequest(makeValues({ duration: '1.25' }))).toMatchObject({
      ok: false,
      description: '소요 시간은 30분(0.5시간) 단위로 입력해주세요.',
    });
  });
});
