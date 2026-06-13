import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Timetable from '@/components/schedule/Timetable';
import { getInitialTimetableScrollTop, getTimetableDraggedScrollTop } from '@/components/schedule/timetableUtils';
import type { Schedule } from '@/types/types';

describe('Timetable scroll behavior', () => {
  it('오늘이 표시 범위에 없으면 초기 표시 영역을 오전 7시로 맞춘다', async () => {
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

  it('오늘 타임테이블은 현재 시간보다 약 2시간 전을 초기에 보여준다', () => {
    const visibleDates = [
      new Date('2026-03-12T00:00:00'),
      new Date('2026-03-13T00:00:00'),
    ];

    expect(getInitialTimetableScrollTop(
      visibleDates,
      new Date('2026-03-12T15:00:00'),
      528,
    )).toBe(624);
  });

  it('새벽 시간대에는 0시부터 보이도록 맨 위에서 시작한다', () => {
    expect(getInitialTimetableScrollTop(
      [new Date('2026-03-12T00:00:00')],
      new Date('2026-03-12T01:00:00'),
      528,
    )).toBe(0);
  });

  it('현재 시간 기준 위치가 너무 아래면 가능한 가장 아래 위치로 보정한다', () => {
    expect(getInitialTimetableScrollTop(
      [new Date('2026-03-12T00:00:00')],
      new Date('2026-03-12T23:00:00'),
      528,
    )).toBe(624);
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

  it('일정 블럭은 시작시간만 간략히 표시한다', () => {
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

    expect(screen.getByText('9:00')).toBeInTheDocument();
    expect(screen.getByText('11:30')).toBeInTheDocument();
    expect(screen.queryByText('3/12 9:00 · 1시간')).not.toBeInTheDocument();
    expect(screen.queryByText('3/12 11:30 · 30분')).not.toBeInTheDocument();
  });

  it('일정 블럭 클릭과 빈 영역 클릭을 분리한다', () => {
    const schedule: Schedule = {
      id: 'focus-me',
      title: '회의',
      content: '',
      category: 'appointment',
      isImportant: false,
      startTime: '2026-03-12T09:00:00',
      endTime: '2026-03-12T09:00:00',
      duration: 1,
      isCompleted: false,
      hasAlarm: false,
    };
    const onBlockClick = vi.fn();
    const onEmptyBlockClick = vi.fn();

    render(
      <Timetable
        schedules={[schedule]}
        startDate={new Date('2026-03-12T00:00:00')}
        days={1}
        onBlockClick={onBlockClick}
        onEmptyBlockClick={onEmptyBlockClick}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        selectedScheduleId="focus-me"
      />,
    );

    const block = screen.getByTestId('timetable-schedule-focus-me');
    expect(block).toHaveClass('ring-2');

    fireEvent.click(block);
    expect(onBlockClick).toHaveBeenCalledWith(schedule);
    expect(onEmptyBlockClick).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('timetable-day-column-0'));
    expect(onEmptyBlockClick).toHaveBeenCalledTimes(1);
  });
});
