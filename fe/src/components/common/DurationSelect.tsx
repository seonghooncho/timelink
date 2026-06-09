import React from 'react';
import { formatDurationLabel, SCHEDULE_DURATION_OPTIONS } from '@/lib/scheduleTime';

interface DurationSelectProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
}

const DurationSelect: React.FC<DurationSelectProps> = ({ value, onChange, ariaLabel = '소요 시간' }) => (
  <select
    aria-label={ariaLabel}
    value={value}
    onChange={(event) => onChange(event.target.value)}
    className="w-full px-3 py-2.5 bg-muted rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
  >
    {SCHEDULE_DURATION_OPTIONS.map((duration) => (
      <option key={duration} value={String(duration)}>
        {formatDurationLabel(duration)}
      </option>
    ))}
  </select>
);

export default DurationSelect;
