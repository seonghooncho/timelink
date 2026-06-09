import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Timetable from '@/components/schedule/Timetable';
import { getTimetableDraggedScrollTop } from '@/components/schedule/timetableUtils';
import type { Schedule } from '@/types/types';

describe('Timetable scroll behavior', () => {
  it('초기 표시 영역을 오전 7시로 맞춘다', async () => {
    render(
      <Timetable
        schedules={[]}
        startDate={new Date('2026-03-12T00:00:00')}
        days={4}
        onBlockClick={vi.fn()}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('timetable-scroll').scrollTop).toBe(336);
    });
  });

  it('드래그로 위아래 시간을 더 볼 수 있다', async () => {
    expect(getTimetableDraggedScrollTop(336, 240, 120)).toBe(456);
    expect(getTimetableDraggedScrollTop(336, 120, 240)).toBe(216);
  });

  it('일자 컬럼 수직선은 스크롤 가능한 전체 높이만큼 이어진다', () => {
    render(
      <Timetable
        schedules={[]}
        startDate={new Date('2026-03-12T00:00:00')}
        days={4}
        onBlockClick={vi.fn()}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    expect(screen.getByTestId('timetable-day-column-0')).toHaveStyle({ height: '1152px' });
  });

  it('일정 블럭은 시작 일시와 소요시간을 함께 표시한다', () => {
    const schedules: Schedule[] = [
      {
        id: 'one-hour',
        title: '회의',
        content: '',
        category: 'appointment',
        isImportant: false,
        startTime: '2026-03-12T09:00:00',
        endTime: '2026-03-12T09:00:00',
        duration: 1,
        isCompleted: false,
        hasAlarm: false,
      },
      {
        id: 'half-hour',
        title: '짧은 일정',
        content: '',
        category: 'task',
        isImportant: false,
        startTime: '2026-03-12T11:30:00',
        endTime: '2026-03-12T11:30:00',
        duration: 0.5,
        isCompleted: false,
        hasAlarm: false,
      },
    ];

    render(
      <Timetable
        schedules={schedules}
        startDate={new Date('2026-03-12T00:00:00')}
        days={1}
        onBlockClick={vi.fn()}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    expect(screen.getByText('3/12 9:00 · 1시간')).toBeInTheDocument();
    expect(screen.getByText('3/12 11:30 · 30분')).toBeInTheDocument();
  });
});
