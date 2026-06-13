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
    expect(screen.getByText('샘플 데이터로 먼저 확인해보세요')).toBeInTheDocument();
    expect(screen.getAllByText('기획안 마감').length).toBeGreaterThan(0);
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

    fireEvent.click(screen.getByRole('button', { name: '내 일정 만들기' }));
    expect(screen.getByText('일정을 저장하려면 로그인이 필요합니다')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '로그인하고 계속' }));
    expect(screen.getByText('login-page')).toBeInTheDocument();
  });
});
