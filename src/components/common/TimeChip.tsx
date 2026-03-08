import React from 'react';

interface TimeChipProps {
  label: string;
  active?: boolean;
}

const TimeChip: React.FC<TimeChipProps> = ({ label, active }) => (
  <span className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
    active ? 'border-foreground bg-card text-foreground' : 'border-border bg-muted text-muted-foreground'
  }`}>
    {label}
  </span>
);

export default TimeChip;
