import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BottomNav from '@/components/layout/BottomNav';
import PwaInstallPrompt from '@/components/pwa/PwaInstallPrompt';
import ScheduleStrip from '@/components/schedule/ScheduleStrip';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
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

describe('design layers', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('하단 내비게이션은 navigation 레이어를 사용한다', () => {
    render(
      <MemoryRouter>
        <BottomNav />
      </MemoryRouter>,
    );

    expect(screen.getByRole('navigation')).toHaveClass('app-layer-navigation');
  });

  it('PWA 설치 안내는 notice 레이어를 사용한다', async () => {
    render(<PwaInstallPrompt />);

    const prompt = await screen.findByLabelText('Timelink 설치 안내');

    expect(prompt.parentElement).toHaveClass('app-layer-notice');
  });

  it('Dialog는 overlay와 modal 레이어를 분리한다', async () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>레이어 확인</DialogTitle>
          <DialogDescription>오버레이와 모달 레이어를 확인합니다.</DialogDescription>
        </DialogContent>
      </Dialog>,
    );

    await waitFor(() => {
      expect(document.querySelector('.app-layer-overlay')).toBeInTheDocument();
    });
    expect(screen.getByRole('dialog')).toHaveClass('app-layer-modal');
  });

  it('홈 일정 카드 페이드는 유효한 검은색 그라데이션 클래스를 사용한다', () => {
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

    expect(leftFade?.className).toContain('from-black/25');
    expect(leftFade?.className).toContain('via-black/10');
    expect(leftFade).toHaveStyle({ opacity: '0.43' });
    expect(rightFade?.className).toContain('from-black/25');
    expect(rightFade?.className).toContain('via-black/10');
    expect(rightFade).toHaveStyle({ opacity: '1' });
  });
});
