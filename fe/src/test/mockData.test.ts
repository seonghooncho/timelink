import { describe, it, expect } from 'vitest';
import { getCategoryColor, getCategoryLabel, formatTime, formatDate, getDayLabel } from '@/utils';
import { ScheduleCategory } from '@/types/types';

describe('getCategoryColor', () => {
  const categories: ScheduleCategory[] = ['task', 'appointment', 'important', 'group', 'repeat'];

  it('returns default variant for all categories', () => {
    categories.forEach(cat => {
      const result = getCategoryColor(cat);
      expect(result).toBeTruthy();
      expect(result).toContain('bg-category-');
    });
  });

  it('returns light variant for all categories', () => {
    categories.forEach(cat => {
      const result = getCategoryColor(cat, 'light');
      expect(result).toContain('-light');
    });
  });

  it('returns strong variant for all categories', () => {
    categories.forEach(cat => {
      const result = getCategoryColor(cat, 'strong');
      expect(result).toContain('-strong');
    });
  });
});

describe('getCategoryLabel', () => {
  it('returns correct Korean labels', () => {
    expect(getCategoryLabel('task')).toBe('과제');
    expect(getCategoryLabel('appointment')).toBe('약속');
    expect(getCategoryLabel('group')).toBe('그룹');
    expect(getCategoryLabel('important')).toBe('중요');
    expect(getCategoryLabel('repeat')).toBe('반복');
  });
});

describe('formatTime', () => {
  it('formats time correctly', () => {
    expect(formatTime('2025-03-08T09:00:00')).toBe('9:00');
    expect(formatTime('2025-03-08T14:05:00')).toBe('14:05');
    expect(formatTime('2025-03-08T00:00:00')).toBe('0:00');
  });
});

describe('formatDate', () => {
  it('formats date correctly', () => {
    expect(formatDate('2025-03-08T09:00:00')).toBe('3/8');
    expect(formatDate('2025-12-25T00:00:00')).toBe('12/25');
  });
});

describe('getDayLabel', () => {
  it('returns correct day of week in Korean', () => {
    // 2025-03-08 is Saturday
    expect(getDayLabel('2025-03-08T00:00:00')).toBe('토');
    // 2025-03-09 is Sunday
    expect(getDayLabel('2025-03-09T00:00:00')).toBe('일');
    // 2025-03-10 is Monday
    expect(getDayLabel('2025-03-10T00:00:00')).toBe('월');
  });
});
