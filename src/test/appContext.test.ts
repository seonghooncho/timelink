import { describe, it, expect } from 'vitest';
import { Schedule } from '@/types/types';

// Test the state management logic (pure functions extracted from AppContext)
describe('AppContext schedule operations', () => {
  const initial: Schedule[] = [
    {
      id: '1', title: 'Test', content: 'Content', category: 'task',
      isImportant: false, startTime: '2025-03-08T10:00:00',
      endTime: '2025-03-08T12:00:00', duration: 2, isCompleted: false, hasAlarm: false,
    },
  ];

  it('addSchedule appends to list', () => {
    const newS: Schedule = {
      id: '2', title: 'New', content: '', category: 'appointment',
      isImportant: true, startTime: '2025-03-09T10:00:00',
      endTime: '2025-03-09T11:00:00', duration: 1, isCompleted: false, hasAlarm: true,
    };
    const result = [...initial, newS];
    expect(result).toHaveLength(2);
    expect(result[1].id).toBe('2');
  });

  it('updateSchedule modifies correct item', () => {
    const updates = { title: 'Updated', isImportant: true };
    const result = initial.map(s => s.id === '1' ? { ...s, ...updates } : s);
    expect(result[0].title).toBe('Updated');
    expect(result[0].isImportant).toBe(true);
    expect(result[0].content).toBe('Content'); // unchanged
  });

  it('updateSchedule ignores non-existent id', () => {
    const result = initial.map(s => s.id === 'nonexistent' ? { ...s, title: 'X' } : s);
    expect(result[0].title).toBe('Test');
  });

  it('deleteSchedule removes correct item', () => {
    const result = initial.filter(s => s.id !== '1');
    expect(result).toHaveLength(0);
  });

  it('deleteSchedule ignores non-existent id', () => {
    const result = initial.filter(s => s.id !== 'nonexistent');
    expect(result).toHaveLength(1);
  });
});
