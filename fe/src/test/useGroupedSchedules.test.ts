import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Schedule } from '@/types/types';

// Extract the pure logic from useGroupedSchedules for testing
interface ScheduleGroup {
  date: string;
  label: string;
  schedules: Schedule[];
}

function groupSchedules(schedules: Schedule[], now: Date): ScheduleGroup[] {
  const upcoming = schedules
    .filter(s => !s.isCompleted)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const groups: ScheduleGroup[] = [];
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  upcoming.forEach(s => {
    const dateStr = s.startTime.slice(0, 10);
    let existing = groups.find(g => g.date === dateStr);
    if (!existing) {
      const sDate = new Date(dateStr);
      const diffDays = Math.round((sDate.getTime() - today.getTime()) / 86400000);
      let label: string;
      if (diffDays === 0) {
        label = `오늘 ${sDate.getMonth() + 1}/${sDate.getDate()}`;
      } else if (diffDays > 0) {
        label = `${diffDays}일 뒤 ${sDate.getMonth() + 1}/${sDate.getDate()}`;
      } else {
        label = `${Math.abs(diffDays)}일 전 ${sDate.getMonth() + 1}/${sDate.getDate()}`;
      }
      existing = { date: dateStr, label, schedules: [] };
      groups.push(existing);
    }
    existing.schedules.push(s);
  });

  return groups;
}

function makeSchedule(overrides: Partial<Schedule> & { id: string; startTime: string }): Schedule {
  return {
    title: 'Test',
    content: '',
    category: 'task',
    isImportant: false,
    endTime: overrides.startTime,
    duration: 1,
    isCompleted: false,
    hasAlarm: false,
    ...overrides,
  };
}

describe('groupSchedules logic', () => {
  const now = new Date('2025-03-08T10:00:00');

  it('returns empty array for no schedules', () => {
    expect(groupSchedules([], now)).toEqual([]);
  });

  it('filters out completed schedules', () => {
    const schedules = [
      makeSchedule({ id: '1', startTime: '2025-03-08T12:00:00', isCompleted: true }),
    ];
    expect(groupSchedules(schedules, now)).toEqual([]);
  });

  it('groups today schedules with "오늘" label', () => {
    const schedules = [
      makeSchedule({ id: '1', startTime: '2025-03-08T12:00:00' }),
      makeSchedule({ id: '2', startTime: '2025-03-08T15:00:00' }),
    ];
    const result = groupSchedules(schedules, now);
    expect(result).toHaveLength(1);
    expect(result[0].label).toContain('오늘');
    expect(result[0].schedules).toHaveLength(2);
  });

  it('groups future schedules with "N일 뒤" label', () => {
    const schedules = [
      makeSchedule({ id: '1', startTime: '2025-03-10T12:00:00' }),
    ];
    const result = groupSchedules(schedules, now);
    expect(result).toHaveLength(1);
    expect(result[0].label).toContain('2일 뒤');
  });

  it('sorts schedules by startTime within groups', () => {
    const schedules = [
      makeSchedule({ id: '2', startTime: '2025-03-08T15:00:00', title: 'Later' }),
      makeSchedule({ id: '1', startTime: '2025-03-08T09:00:00', title: 'Earlier' }),
    ];
    const result = groupSchedules(schedules, now);
    expect(result[0].schedules[0].title).toBe('Earlier');
    expect(result[0].schedules[1].title).toBe('Later');
  });

  it('sorts groups by date (earliest first)', () => {
    const schedules = [
      makeSchedule({ id: '2', startTime: '2025-03-10T12:00:00' }),
      makeSchedule({ id: '1', startTime: '2025-03-08T12:00:00' }),
    ];
    const result = groupSchedules(schedules, now);
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe('2025-03-08');
    expect(result[1].date).toBe('2025-03-10');
  });

  it('past schedules show "N일 전" label (fixed)', () => {
    const schedules = [
      makeSchedule({ id: '1', startTime: '2025-03-06T12:00:00' }),
    ];
    const result = groupSchedules(schedules, now);
    expect(result).toHaveLength(1);
    expect(result[0].label).toContain('2일 전');
  });
});
