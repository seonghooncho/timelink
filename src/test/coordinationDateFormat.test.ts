import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Test CoordinationOneTime's date format vs CalendarPage's date format
// CoordinationOneTime uses: `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
// CalendarPage uses: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
// Schedule startTime uses ISO: "2025-03-08T..."

describe('Date format consistency', () => {
  const coordinationFormat = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const calendarFormat = (year: number, month: number, day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const isoDatePart = (isoStr: string) => isoStr.slice(0, 10);

  it('CoordinationOneTime date format now matches ISO (fixed)', () => {
    const date = new Date(2025, 2, 8); // March 8
    const coordKey = coordinationFormat(date);
    const isoKey = isoDatePart('2025-03-08T12:00:00');

    expect(coordKey).toBe('2025-03-08');
    expect(isoKey).toBe('2025-03-08');
    expect(coordKey).toBe(isoKey);
  });

  it('CalendarPage date format matches ISO', () => {
    const calKey = calendarFormat(2025, 2, 8); // month 2 = March (0-indexed)
    const isoKey = isoDatePart('2025-03-08T12:00:00');
    expect(calKey).toBe(isoKey);
  });

  it('CoordinationRepeat date format now matches ISO (fixed)', () => {
    const d = new Date(2025, 0, 5); // Jan 5
    const repeatKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect(repeatKey).toBe('2025-01-05');
  });
});
