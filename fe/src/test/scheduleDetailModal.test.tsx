import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ScheduleDetailModal from '@/components/schedule/ScheduleDetailModal';
import { appToast } from '@/lib/appToast';
import type { Schedule } from '@/types/types';

vi.mock('@/lib/appToast', () => ({
  appToast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const makeSchedule = (overrides: Partial<Schedule> = {}): Schedule => ({
  id: 'schedule-1',
  title: '회의',
  content: '논의할 내용',
  category: 'appointment',
  isImportant: false,
  startTime: '2026-03-12T09:00:00',
  endTime: '2026-03-12T09:00:00',
  duration: 1,
  isCompleted: false,
  hasAlarm: false,
  ...overrides,
});

describe('ScheduleDetailModal', () => {
  it('일정 클릭 시 수정 폼이 아니라 읽기 전용 상세로 먼저 열린다', () => {
    render(<ScheduleDetailModal schedule={makeSchedule()} open onClose={vi.fn()} onUpdate={vi.fn()} />);

    expect(screen.getByText('회의')).toBeInTheDocument();
    expect(screen.getByText('3/12 9:00')).toBeInTheDocument();
    expect(screen.getByText('1시간')).toBeInTheDocument();
    expect(screen.queryByLabelText('일정 제목')).not.toBeInTheDocument();
  });

  it('수정 버튼 이후 일시와 소요시간을 함께 저장한다', () => {
    const onUpdate = vi.fn();
    render(<ScheduleDetailModal schedule={makeSchedule()} open onClose={vi.fn()} onUpdate={onUpdate} />);

    fireEvent.click(screen.getByRole('button', { name: '수정하기' }));
    fireEvent.change(screen.getByLabelText('일정 제목'), { target: { value: '변경된 회의' } });
    fireEvent.change(screen.getByLabelText('일정 날짜'), { target: { value: '2026-03-13' } });
    fireEvent.change(screen.getByLabelText('일정 시작 시간'), { target: { value: '10:30' } });
    fireEvent.change(screen.getByLabelText('소요 시간'), { target: { value: '1.5' } });
    fireEvent.click(screen.getByRole('button', { name: '저장하기' }));

    expect(onUpdate).toHaveBeenCalledWith('schedule-1', {
      title: '변경된 회의',
      content: '논의할 내용',
      startTime: '2026-03-13T10:30:00',
      duration: 1.5,
    });
  });

  it('읽기 전용 상세에서 작은 일정 삭제 버튼으로 삭제를 요청한다', () => {
    const schedule = makeSchedule();
    const onDelete = vi.fn();

    render(<ScheduleDetailModal schedule={schedule} open onClose={vi.fn()} onUpdate={vi.fn()} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole('button', { name: '일정 삭제' }));

    expect(onDelete).toHaveBeenCalledWith(schedule);
  });

  it('닫혔다 다시 열리면 항상 읽기 전용 상세로 시작한다', () => {
    const { rerender } = render(
      <ScheduleDetailModal schedule={makeSchedule()} open onClose={vi.fn()} onUpdate={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', { name: '수정하기' }));
    expect(screen.getByLabelText('일정 제목')).toBeInTheDocument();

    rerender(<ScheduleDetailModal schedule={makeSchedule()} open={false} onClose={vi.fn()} onUpdate={vi.fn()} />);
    rerender(<ScheduleDetailModal schedule={makeSchedule()} open onClose={vi.fn()} onUpdate={vi.fn()} />);

    expect(screen.queryByLabelText('일정 제목')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '수정하기' })).toBeInTheDocument();
  });

  it('수정한 시작시간과 소요시간이 날짜를 넘기면 저장하지 않고 토스트로 알린다', () => {
    const onUpdate = vi.fn();
    render(<ScheduleDetailModal schedule={makeSchedule()} open onClose={vi.fn()} onUpdate={onUpdate} />);

    fireEvent.click(screen.getByRole('button', { name: '수정하기' }));
    fireEvent.change(screen.getByLabelText('일정 시작 시간'), { target: { value: '23:30' } });
    fireEvent.change(screen.getByLabelText('소요 시간'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: '저장하기' }));

    expect(onUpdate).not.toHaveBeenCalled();
    expect(appToast.error).toHaveBeenCalledWith(
      '소요 시간을 확인해주세요',
      '시작 시간과 소요시간은 같은 날짜 안에서 끝나야 합니다.',
    );
  });

  it('모임 일정 작성자가 아니면 수정/삭제 대신 약속 빠지기를 보여준다', () => {
    const onLeaveGroupSchedule = vi.fn();
    render(
      <ScheduleDetailModal
        schedule={makeSchedule({
          groupId: 'group-1',
          groupScheduleId: 'group-schedule-1',
          groupScheduleCreatedBy: 'owner-user',
          groupScheduleOwner: false,
        })}
        open
        onClose={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onLeaveGroupSchedule={onLeaveGroupSchedule}
      />,
    );

    expect(screen.queryByRole('button', { name: '수정하기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '일정 삭제' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /약속 빠지기/ }));

    expect(onLeaveGroupSchedule).toHaveBeenCalledWith(expect.objectContaining({ id: 'schedule-1' }));
  });

  it('참여자로 선택되지 않은 모임 일정은 읽기 전용으로 보여준다', () => {
    render(
      <ScheduleDetailModal
        schedule={makeSchedule({
          groupId: 'group-1',
          groupScheduleId: 'group-schedule-1',
          groupScheduleCreatedBy: 'owner-user',
          groupScheduleOwner: false,
          groupScheduleParticipant: false,
        })}
        open
        onClose={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onLeaveGroupSchedule={vi.fn()}
      />,
    );

    expect(screen.getByText('참여자로 선택되지 않은 모임 약속입니다.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '수정하기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '일정 삭제' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /약속 빠지기/ })).not.toBeInTheDocument();
  });

  it('모임 일정 상세에서 참여인원 프로필을 보여준다', () => {
    render(
      <ScheduleDetailModal
        schedule={makeSchedule({
          groupId: 'group-1',
          groupScheduleId: 'group-schedule-1',
          category: 'group',
          participants: [
            { userId: 'user-1', nickname: '민지', avatarUrl: '' },
            { userId: 'user-2', nickname: '현우', avatarUrl: '' },
          ],
        })}
        open
        onClose={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );

    expect(screen.getByText('참여인원')).toBeInTheDocument();
    expect(screen.getByText('2명')).toBeInTheDocument();
    expect(screen.getByText('민지')).toBeInTheDocument();
    expect(screen.getByText('현우')).toBeInTheDocument();
  });

  it('참여인원 클릭 시 참여자와 일정을 전달한다', () => {
    const onParticipantClick = vi.fn();
    render(
      <ScheduleDetailModal
        schedule={makeSchedule({
          groupId: 'group-1',
          groupScheduleId: 'group-schedule-1',
          category: 'group',
          participants: [
            { userId: 'user-1', nickname: '민지', avatarUrl: '' },
          ],
        })}
        open
        onClose={vi.fn()}
        onUpdate={vi.fn()}
        onParticipantClick={onParticipantClick}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '민지 프로필 보기' }));

    expect(onParticipantClick).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', nickname: '민지' }),
      expect.objectContaining({ id: 'schedule-1', groupId: 'group-1' }),
    );
  });
});
