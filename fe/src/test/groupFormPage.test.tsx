import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GroupFormPage from '@/pages/GroupFormPage';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  useCreateGroup: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

vi.mock('@/hooks/useGroups', () => ({
  useCreateGroup: mocks.useCreateGroup,
}));

describe('GroupFormPage', () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.useCreateGroup.mockReset();
    mocks.useCreateGroup.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ id: 'group-new' }),
    });
  });

  it('keeps private group creation lightweight by default', () => {
    render(
      <MemoryRouter>
        <GroupFormPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('초대 링크를 받은 사람만 참여할 수 있습니다.')).toBeInTheDocument();
    expect(screen.queryByLabelText('공개 모임 미리보기')).not.toBeInTheDocument();
  });

  it('shows public meetup prompts and preview without changing the create payload contract', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ id: 'group-new' });
    mocks.useCreateGroup.mockReturnValue({ mutateAsync });

    render(
      <MemoryRouter>
        <GroupFormPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: '공개' }));

    expect(screen.getByText('공개 모임은 소개가 첫인상이에요')).toBeInTheDocument();
    expect(screen.getByLabelText('공개 모임 미리보기')).toBeInTheDocument();
    expect(screen.getByText('참여 규칙')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('모임 이름을 입력하세요'), { target: { value: '주말 러닝' } });
    fireEvent.change(screen.getByPlaceholderText(/대학생 사이드프로젝트 모임/), {
      target: { value: '초보도 함께 달리는 온라인 기록 모임입니다.' },
    });
    fireEvent.click(screen.getByRole('button', { name: '모임 만들기' }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({
      name: '주말 러닝',
      description: '초보도 함께 달리는 온라인 기록 모임입니다.',
      imageId: undefined,
      imageUrl: undefined,
      visibility: 'PUBLIC',
    }));
  });
});
