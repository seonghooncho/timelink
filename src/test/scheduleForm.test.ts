import { describe, it, expect } from 'vitest';
import { Schedule, ScheduleCategory } from '@/types/types';

// Test the schedule creation logic extracted from ScheduleFormPage
function createSchedule(params: {
  title: string;
  content: string;
  category: ScheduleCategory;
  isImportant: boolean;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  duration: string;
  hasAlarm: boolean;
}): Schedule {
  return {
    id: Date.now().toString(),
    title: params.title,
    content: params.content,
    category: params.category,
    isImportant: params.isImportant,
    startTime: `${params.startDate}T${params.startTime}:00`,
    endTime: params.endDate && params.endTime
      ? `${params.endDate}T${params.endTime}:00`
      : `${params.startDate}T${params.startTime}:00`,
    duration: parseFloat(params.duration) || 0,
    isCompleted: false,
    hasAlarm: params.hasAlarm,
  };
}

describe('Schedule creation logic', () => {
  it('creates schedule with all fields', () => {
    const s = createSchedule({
      title: '회의',
      content: '팀 회의',
      category: 'appointment',
      isImportant: true,
      startDate: '2025-03-08',
      startTime: '14:00',
      endDate: '2025-03-08',
      endTime: '16:00',
      duration: '2',
      hasAlarm: true,
    });
    expect(s.startTime).toBe('2025-03-08T14:00:00');
    expect(s.endTime).toBe('2025-03-08T16:00:00');
    expect(s.duration).toBe(2);
  });

  it('falls back endTime to startTime when end fields are empty', () => {
    const s = createSchedule({
      title: '회의',
      content: '',
      category: 'task',
      isImportant: false,
      startDate: '2025-03-08',
      startTime: '14:00',
      endDate: '',
      endTime: '',
      duration: '',
      hasAlarm: false,
    });
    // endTime should equal startTime
    expect(s.endTime).toBe('2025-03-08T14:00:00');
    expect(s.duration).toBe(0);
  });

  // BUG: if only endDate is set but not endTime (or vice versa),
  // the condition (endDate && endTime) is false, so endTime = startTime
  // This may confuse users who only fill one field
  it('BUG: partial end fields cause fallback to startTime', () => {
    const s = createSchedule({
      title: '회의',
      content: '',
      category: 'task',
      isImportant: false,
      startDate: '2025-03-08',
      startTime: '14:00',
      endDate: '2025-03-08',
      endTime: '', // only endDate set
      duration: '1',
      hasAlarm: false,
    });
    // Bug: endTime becomes startTime instead of using endDate
    expect(s.endTime).toBe('2025-03-08T14:00:00');
  });

  it('handles non-numeric duration gracefully', () => {
    const s = createSchedule({
      title: '회의',
      content: '',
      category: 'task',
      isImportant: false,
      startDate: '2025-03-08',
      startTime: '14:00',
      endDate: '2025-03-08',
      endTime: '15:00',
      duration: 'abc',
      hasAlarm: false,
    });
    expect(s.duration).toBe(0);
  });
});
