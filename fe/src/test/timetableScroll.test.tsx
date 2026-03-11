import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Timetable from '@/components/schedule/Timetable';
import { getTimetableDraggedScrollTop } from '@/components/schedule/timetableUtils';

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
});
