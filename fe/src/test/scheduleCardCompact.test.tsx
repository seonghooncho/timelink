import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ScheduleCardCompact from '@/components/schedule/ScheduleCardCompact';
import type { Schedule } from '@/types/types';

const makeSchedule = (overrides: Partial<Schedule> = {}): Schedule => ({
  id: 'schedule-1',
  title: '회의',
  content: '',
  category: 'appointment',
  isImportant: false,
  startTime: '2026-03-12T09:00:00',
  endTime: '2026-03-12T09:00:00',
  duration: 1,
  isCompleted: false,
  hasAlarm: false,
  ...overrides,
});

describe('ScheduleCardCompact', () => {
  it('완료 버튼은 카드 클릭과 분리되어 완료 토글을 요청한다', () => {
    const onClick = vi.fn();
    const onComplete = vi.fn();
    const schedule = makeSchedule();

    render(<ScheduleCardCompact schedule={schedule} onClick={onClick} onComplete={onComplete} />);

    fireEvent.click(screen.getByRole('button', { name: '완료' }));

    expect(onComplete).toHaveBeenCalledWith(schedule);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('완료된 일정은 원형 버튼이 초록색으로 채워진 상태로 보인다', () => {
    render(
      <ScheduleCardCompact
        schedule={makeSchedule({ isCompleted: true })}
        onClick={vi.fn()}
        onComplete={vi.fn()}
      />,
    );

    const completeButton = screen.getByRole('button', { name: '완료 해제' });

    expect(completeButton).toHaveClass('rounded-full');
    expect(completeButton).toHaveClass('bg-primary');
    expect(completeButton).toHaveClass('border-primary');
  });

  it('완료 핸들러가 없으면 완료 버튼을 표시하지 않는다', () => {
    render(<ScheduleCardCompact schedule={makeSchedule()} onClick={vi.fn()} />);

    expect(screen.queryByRole('button', { name: '완료' })).not.toBeInTheDocument();
  });

  it('선택된 일정 카드는 강조 상태를 표시한다', () => {
    render(<ScheduleCardCompact schedule={makeSchedule()} onClick={vi.fn()} selected />);

    const card = screen.getByText('회의').closest('[data-selected="true"]');

    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('ring-2');
  });
});
