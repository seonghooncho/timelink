import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CoordinationOneTime from '@/components/coordination/CoordinationOneTime';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  create: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

vi.mock('@/services/api', () => ({
  coordinationApi: {
    create: mocks.create,
  },
}));

describe('CoordinationOneTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-13T10:00:00+09:00'));
    mocks.navigate.mockReset();
    mocks.create.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('moves months and summarizes selected future dates', () => {
    render(
      <MemoryRouter>
        <CoordinationOneTime groupId="group-1" />
      </MemoryRouter>,
    );

    expect(screen.getByText('2026.06')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '이전 달' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '다음 달' }));

    expect(screen.getByText('2026.07')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '7/1' }));

    expect(screen.getByText('1일 선택 · 7/1')).toBeInTheDocument();
  });
});
