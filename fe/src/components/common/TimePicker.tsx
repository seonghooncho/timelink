import React, { useState, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { getDraggedScrollTop } from './timePickerUtils';

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
  const listRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{ startY: number; startScrollTop: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (!open || !listRef.current) {
      return;
    }

    const selected = listRef.current.querySelector<HTMLElement>(`[data-hour="${value}"]`);
    selected?.scrollIntoView?.({ block: 'center' });
  }, [open, value]);

  const formatHour = (h: number) => {
    if (h === 0) return '오전 12:00';
    if (h < 12) return `오전 ${h}:00`;
    if (h === 12) return '오후 12:00';
    if (h === 24) return '오전 12:00';
    return `오후 ${h - 12}:00`;
  };

  const hours: number[] = [];
  for (let i = minHour; i <= maxHour; i++) hours.push(i);

  const getPointerY = (event: React.PointerEvent<HTMLDivElement>) => {
    if (Number.isFinite(event.clientY)) return event.clientY;
    if (Number.isFinite(event.pageY)) return event.pageY;
    if (Number.isFinite(event.screenY)) return event.screenY;
    return 0;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!listRef.current) {
      return;
    }

    dragStateRef.current = {
      startY: getPointerY(event),
      startScrollTop: listRef.current.scrollTop,
      moved: false,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!listRef.current || !dragStateRef.current) {
      return;
    }

    const deltaY = getPointerY(event) - dragStateRef.current.startY;
    if (Math.abs(deltaY) > 3) {
      dragStateRef.current.moved = true;
      suppressClickRef.current = true;
    }

    listRef.current.scrollTop = getDraggedScrollTop(
      dragStateRef.current.startScrollTop,
      dragStateRef.current.startY,
      getPointerY(event),
    );
  };

  const handlePointerEnd = () => {
    if (dragStateRef.current?.moved) {
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
    dragStateRef.current = null;
  };

  const handleSelect = (hour: number) => {
    if (suppressClickRef.current) {
      return;
    }
    onChange(hour);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card text-sm font-medium text-foreground hover:bg-muted transition-colors pressable"
      >
        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
        {label && <span className="text-muted-foreground text-xs">{label}</span>}
        <span>{formatHour(value)}</span>
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          aria-label={label ? `${label} 시간 선택` : '시간 선택'}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          className="absolute top-full mt-1 left-0 z-50 w-40 max-h-64 overflow-y-auto overscroll-contain bg-card border border-border rounded-xl shadow-elevated animate-fade-in scrollbar-hide cursor-grab active:cursor-grabbing select-none"
          style={{ touchAction: 'none' }}
        >
          {hours.map(h => (
            <button
              key={h}
              type="button"
              role="option"
              aria-selected={h === value}
              data-hour={h}
              onClick={() => handleSelect(h)}
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
