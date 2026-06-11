import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ScheduleStrip from '@/components/schedule/ScheduleStrip';
import type { Schedule } from '@/types/types';

vi.mock('@/hooks/useScrollAffordance', () => ({
  useScrollAffordance: () => ({
    scrollRef: { current: null },
    refresh: () => {},
    hasOverflow: true,
    canScrollStart: true,
    canScrollEnd: true,
    startFadeOpacity: 0.43,
    endFadeOpacity: 1,
  }),
}));

const makeSchedule = (id: string): Schedule => ({
  id,
  title: `일정 ${id}`,
  content: '',
  category: 'appointment',
  isImportant: false,
  startTime: '2026-03-12T09:00:00',
  endTime: '2026-03-12T10:00:00',
  duration: 1,
  isCompleted: false,
  hasAlarm: false,
});

describe('ScheduleStrip', () => {
  it('홈 카드 스크롤 영역에 좌우 검은색 페이드를 표시한다', () => {
    const { container } = render(
      <ScheduleStrip
        groups={[{
          date: '2026-03-12',
          label: '오늘',
          schedules: [makeSchedule('1'), makeSchedule('2')],
        }]}
        onScheduleClick={vi.fn()}
        onComplete={vi.fn()}
      />,
    );

    const leftFade = container.querySelector('.bg-gradient-to-r');
    const rightFade = container.querySelector('.bg-gradient-to-l');

    expect(leftFade?.className).toContain('from-black/20');
    expect(leftFade?.className).toContain('via-black/10');
    expect(leftFade).toHaveStyle({ opacity: '0.43' });
    expect(rightFade?.className).toContain('from-black/20');
    expect(rightFade?.className).toContain('via-black/10');
    expect(rightFade).toHaveStyle({ opacity: '1' });
  });
});
