import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TimePicker from '@/components/common/TimePicker';
import { getDraggedScrollTop } from '@/components/common/timePickerUtils';

describe('TimePicker', () => {
  it('클릭으로 시간을 선택할 수 있다', () => {
    const handleChange = vi.fn();

    render(<TimePicker value={9} onChange={handleChange} />);

    fireEvent.click(screen.getByRole('button', { name: /오전 9:00/ }));
    fireEvent.click(screen.getByRole('option', { name: /오전 7:00/ }));

    expect(handleChange).toHaveBeenCalledWith(7);
  });

  it('드래그 스크롤 계산이 위아래 이동 방향에 맞게 동작한다', () => {
    expect(getDraggedScrollTop(120, 180, 80)).toBe(220);
    expect(getDraggedScrollTop(120, 80, 180)).toBe(20);
  });
});
