import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import InviteRedirectPage from '@/pages/InviteRedirectPage';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

describe('InviteRedirectPage', () => {
  it('redirects invite links with coordination query to the protected join flow', async () => {
    mocks.navigate.mockReset();

    render(
      <MemoryRouter initialEntries={['/invite/ABC123?coord=coord-1']}>
        <Routes>
          <Route path="/invite/:inviteCode" element={<InviteRedirectPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('초대 링크를 확인하고 있어요')).toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/groups/join/ABC123?coord=coord-1', { replace: true });
    });
  });

  it('preserves safe redirect query for invite links', async () => {
    mocks.navigate.mockReset();

    render(
      <MemoryRouter initialEntries={['/invite/ABC123?redirect=/groups/group-1/intro']}>
        <Routes>
          <Route path="/invite/:inviteCode" element={<InviteRedirectPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/groups/join/ABC123?redirect=%2Fgroups%2Fgroup-1%2Fintro', { replace: true });
    });
  });
});
