import React from 'react';
import { ChevronDown } from 'lucide-react';
import { formatHalfHourTimeLabel, HALF_HOUR_TIME_OPTIONS } from '@/lib/scheduleForm';

interface HalfHourTimeSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel: string;
}

const HalfHourTimeSelect: React.FC<HalfHourTimeSelectProps> = ({
  value,
  onChange,
  placeholder = '시간 선택',
  ariaLabel,
}) => {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel}
        className="w-full appearance-none rounded-lg bg-muted px-3 py-2.5 pr-9 text-sm text-foreground outline-none transition-colors focus:ring-2 focus:ring-ring"
      >
        <option value="">{placeholder}</option>
        {HALF_HOUR_TIME_OPTIONS.map((time) => (
          <option key={time} value={time}>
            {formatHalfHourTimeLabel(time)}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
};

export default HalfHourTimeSelect;
