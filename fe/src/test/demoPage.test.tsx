import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import DemoPage from '@/pages/DemoPage';

describe('DemoPage', () => {
  it('shows sample demo content without authentication', () => {
    render(
      <MemoryRouter initialEntries={['/demo']}>
        <DemoPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Timelink 데모')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다음 기능 둘러보기 >>' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '이전 기능' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '일정등록' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '시간조율(1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '시간조율(2)' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '캘린더' })).not.toBeInTheDocument();
    expect(screen.getAllByText('기획안 마감').length).toBeGreaterThan(0);
  });

  it('opens schedule creation and split coordination top nav items directly', () => {
    render(
      <MemoryRouter initialEntries={['/demo']}>
        <DemoPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: '일정등록' }));
    expect(screen.getByText('사진 속 약속 내용을 일정으로 정리합니다')).toBeInTheDocument();
    expect(screen.getAllByText('사진으로 일정 등록하기').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: '시간조율(1)' }));
    expect(screen.getByText('내 가능 시간 투표')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '시간조율(2)' }));
    expect(screen.getByText('겹치는 시간이 진하게 표시됩니다')).toBeInTheDocument();
  });

  it('nudges guests through home, schedule creation, coordination, group, and community demos', () => {
    render(
      <MemoryRouter initialEntries={['/demo']}>
        <DemoPage />
      </MemoryRouter>,
    );

    const nextButton = screen.getByRole('button', { name: '다음 기능 둘러보기 >>' });
    fireEvent.click(nextButton);
    expect(screen.getByText('사진 속 약속 내용을 일정으로 정리합니다')).toBeInTheDocument();
    expect(screen.getByText('글자를 인식해 일정으로 정리 중')).toBeInTheDocument();

    fireEvent.click(nextButton);
    expect(screen.getByText('내 가능 시간 투표')).toBeInTheDocument();
    expect(screen.getByText('내 일정을 보면서 빈 시간을 고릅니다')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '모두 가능한 시간 보기' })).not.toBeInTheDocument();

    fireEvent.click(nextButton);
    expect(screen.getByText('겹치는 시간이 진하게 표시됩니다')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '추천 시간으로 모임 일정 만들기' })).toBeInTheDocument();

    fireEvent.click(nextButton);
    expect(screen.getByText('내 모임')).toBeInTheDocument();
    expect(screen.getByText('모임 둘러보기')).toBeInTheDocument();
    expect(screen.getByText('러닝 초보 모임')).toBeInTheDocument();

    fireEvent.click(nextButton);
    expect(screen.getAllByText('커뮤니티').length).toBeGreaterThan(0);
  });

  it('moves backward through the coordination depth before returning to schedule creation and home', () => {
    render(
      <MemoryRouter initialEntries={['/demo']}>
        <DemoPage />
      </MemoryRouter>,
    );

    const nextButton = screen.getByRole('button', { name: '다음 기능 둘러보기 >>' });
    const prevButton = screen.getByRole('button', { name: '이전 기능' });

    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    expect(screen.getByText('겹치는 시간이 진하게 표시됩니다')).toBeInTheDocument();

    fireEvent.click(prevButton);
    expect(screen.getByText('내 가능 시간 투표')).toBeInTheDocument();

    fireEvent.click(prevButton);
    expect(screen.getByText('사진 속 약속 내용을 일정으로 정리합니다')).toBeInTheDocument();

    fireEvent.click(prevButton);
    expect(screen.getByText('홈 일정 카드')).toBeInTheDocument();
  });

  it('focuses the matching schedule card when a timetable block is selected', () => {
    render(
      <MemoryRouter initialEntries={['/demo']}>
        <DemoPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId('timetable-schedule-demo-focus-doc'));

    const selectedCard = document.querySelector('[data-selected="true"]');
    expect(selectedCard).toHaveTextContent('기획안 마감');

    fireEvent.click(selectedCard as Element);
    expect(screen.getByText('일정 상세를 보려면 로그인이 필요합니다')).toBeInTheDocument();
  });

  it('asks users to log in before persistent actions and preserves redirect', () => {
    render(
      <MemoryRouter initialEntries={['/demo']}>
        <Routes>
          <Route path="/demo" element={<DemoPage />} />
          <Route path="/login" element={<div>login-page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getAllByText('기획안 마감')[0]);
    expect(screen.getByText('일정 상세를 보려면 로그인이 필요합니다')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '로그인하고 계속' }));
    expect(screen.getByText('login-page')).toBeInTheDocument();
  });
});
