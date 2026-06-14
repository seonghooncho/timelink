import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import PageHeader from '@/components/layout/PageHeader';

const GroupDetailStub = () => (
  <>
    <PageHeader title="나의 모임" showBack backTo="/groups" />
    <main>group-detail-page</main>
  </>
);

describe('PageHeader', () => {
  it('uses the configured fallback when there is no reliable app history', () => {
    render(
      <MemoryRouter initialEntries={['/groups/group-1']}>
        <Routes>
          <Route path="/groups/:id" element={<GroupDetailStub />} />
          <Route path="/groups" element={<main>groups-page</main>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: '이전 페이지로 이동' }));

    expect(screen.getByText('groups-page')).toBeInTheDocument();
  });
});
