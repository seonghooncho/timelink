import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HalfHourTimeSelect from '@/components/common/HalfHourTimeSelect';

describe('HalfHourTimeSelect', () => {
  it('renders only half-hour choices and emits selected values', () => {
    const handleChange = vi.fn();

    render(
      <HalfHourTimeSelect
        value=""
        onChange={handleChange}
        ariaLabel="시작 시간"
      />,
    );

    const select = screen.getByLabelText('시작 시간');
    const optionLabels = Array.from(select.querySelectorAll('option')).map(option => option.textContent);
    const optionValues = Array.from(select.querySelectorAll('option')).map(option => option.getAttribute('value'));

    expect(optionLabels).toContain('오전 9:30');
    expect(optionLabels).not.toContain('오전 9:15');
    expect(optionValues).toHaveLength(49);
    expect(optionValues).toContain('09:30');
    expect(optionValues).not.toContain('09:15');

    fireEvent.change(select, { target: { value: '09:30' } });

    expect(handleChange).toHaveBeenCalledWith('09:30');
  });
});
