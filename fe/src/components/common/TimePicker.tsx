import React, { useState, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface TimePickerProps {
  value: number; // hour (0-23)
  onChange: (hour: number) => void;
  label?: string;
  minHour?: number;
  maxHour?: number;
}

const TimePicker: React.FC<TimePickerProps> = ({ value, onChange, label, minHour = 0, maxHour = 24 }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const formatHour = (h: number) => {
    if (h === 0) return '오전 12:00';
    if (h < 12) return `오전 ${h}:00`;
    if (h === 12) return '오후 12:00';
    if (h === 24) return '오전 12:00';
    return `오후 ${h - 12}:00`;
  };

  const hours: number[] = [];
  for (let i = minHour; i <= maxHour; i++) hours.push(i);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card text-sm font-medium text-foreground hover:bg-muted transition-colors pressable"
      >
        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
        {label && <span className="text-muted-foreground text-xs">{label}</span>}
        <span>{formatHour(value)}</span>
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 w-36 max-h-48 overflow-y-auto bg-card border border-border rounded-xl shadow-elevated animate-fade-in scrollbar-hide">
          {hours.map(h => (
            <button
              key={h}
              onClick={() => { onChange(h); setOpen(false); }}
              className={`w-full text-left px-3.5 py-2.5 text-xs transition-colors ${
                h === value 
                  ? 'bg-primary/10 text-primary font-semibold' 
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              {formatHour(h)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TimePicker;
