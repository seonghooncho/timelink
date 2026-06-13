import type { CSSProperties } from 'react';
import type { Schedule, ScheduleCategory } from '@/types/types';

// ── Category helpers ──

export const getCategoryColor = (category: ScheduleCategory, variant: 'default' | 'light' | 'strong' = 'default') => {
  const colors = {
    task: { default: 'bg-category-task text-primary-foreground', light: 'bg-category-task-light text-category-task-strong', strong: 'bg-category-task-strong text-primary-foreground' },
    appointment: { default: 'bg-category-appointment text-primary-foreground', light: 'bg-category-appointment-light text-category-appointment-strong', strong: 'bg-category-appointment-strong text-primary-foreground' },
    important: { default: 'bg-category-important text-primary-foreground', light: 'bg-category-important-light text-category-important-strong', strong: 'bg-category-important-strong text-primary-foreground' },
    group: { default: 'bg-category-group text-primary-foreground', light: 'bg-category-group-light text-category-group-strong', strong: 'bg-category-group-strong text-primary-foreground' },
    repeat: { default: 'bg-category-repeat text-primary-foreground', light: 'bg-category-repeat-light text-category-repeat-strong', strong: 'bg-category-repeat-strong text-primary-foreground' },
  };
  return colors[category][variant];
};

interface ScheduleColorToken {
  hue: number;
  saturation: number;
  lightness: number;
  softSaturation: number;
  softLightness: number;
  strongLightness: number;
}

const SCHEDULE_COLOR_VARIANT_COUNT = 5;

const scheduleColorPalettes: Record<ScheduleCategory, ScheduleColorToken[]> = {
  task: [
    { hue: 212, saturation: 74, lightness: 50, softSaturation: 68, softLightness: 88, strongLightness: 36 },
    { hue: 220, saturation: 72, lightness: 52, softSaturation: 66, softLightness: 89, strongLightness: 38 },
    { hue: 204, saturation: 76, lightness: 48, softSaturation: 70, softLightness: 87, strongLightness: 34 },
    { hue: 228, saturation: 68, lightness: 50, softSaturation: 64, softLightness: 88, strongLightness: 36 },
    { hue: 198, saturation: 72, lightness: 46, softSaturation: 66, softLightness: 87, strongLightness: 33 },
  ],
  appointment: [
    { hue: 156, saturation: 58, lightness: 40, softSaturation: 52, softLightness: 86, strongLightness: 30 },
    { hue: 166, saturation: 62, lightness: 38, softSaturation: 56, softLightness: 86, strongLightness: 29 },
    { hue: 146, saturation: 56, lightness: 42, softSaturation: 50, softLightness: 87, strongLightness: 31 },
    { hue: 174, saturation: 60, lightness: 39, softSaturation: 54, softLightness: 86, strongLightness: 29 },
    { hue: 138, saturation: 54, lightness: 40, softSaturation: 50, softLightness: 87, strongLightness: 30 },
  ],
  important: [
    { hue: 350, saturation: 72, lightness: 52, softSaturation: 70, softLightness: 88, strongLightness: 38 },
    { hue: 358, saturation: 70, lightness: 51, softSaturation: 68, softLightness: 88, strongLightness: 37 },
    { hue: 342, saturation: 68, lightness: 50, softSaturation: 66, softLightness: 88, strongLightness: 36 },
    { hue: 4, saturation: 70, lightness: 52, softSaturation: 68, softLightness: 89, strongLightness: 38 },
    { hue: 334, saturation: 66, lightness: 49, softSaturation: 64, softLightness: 88, strongLightness: 35 },
  ],
  group: [
    { hue: 262, saturation: 56, lightness: 56, softSaturation: 52, softLightness: 90, strongLightness: 42 },
    { hue: 270, saturation: 54, lightness: 55, softSaturation: 50, softLightness: 90, strongLightness: 41 },
    { hue: 254, saturation: 58, lightness: 57, softSaturation: 52, softLightness: 90, strongLightness: 43 },
    { hue: 278, saturation: 52, lightness: 54, softSaturation: 48, softLightness: 90, strongLightness: 40 },
    { hue: 246, saturation: 56, lightness: 56, softSaturation: 50, softLightness: 90, strongLightness: 42 },
  ],
  repeat: [
    { hue: 38, saturation: 78, lightness: 48, softSaturation: 74, softLightness: 87, strongLightness: 34 },
    { hue: 30, saturation: 76, lightness: 50, softSaturation: 72, softLightness: 88, strongLightness: 36 },
    { hue: 46, saturation: 78, lightness: 47, softSaturation: 72, softLightness: 87, strongLightness: 33 },
    { hue: 24, saturation: 74, lightness: 49, softSaturation: 70, softLightness: 88, strongLightness: 35 },
    { hue: 42, saturation: 76, lightness: 45, softSaturation: 72, softLightness: 87, strongLightness: 32 },
  ],
};

const hashScheduleKey = (schedule: Pick<Schedule, 'id' | 'title' | 'startTime'>) => {
  const source = `${schedule.id}:${schedule.title}:${schedule.startTime}`;
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }
  return hash;
};

export const getScheduleColorVariant = (schedule: Pick<Schedule, 'id' | 'title' | 'startTime'>) =>
  hashScheduleKey(schedule) % SCHEDULE_COLOR_VARIANT_COUNT;

export const getScheduleColorStyle = (
  schedule: Pick<Schedule, 'id' | 'title' | 'startTime' | 'category'>,
  tone: 'soft' | 'solid' | 'strong' | 'line' = 'soft',
): CSSProperties => {
  const palette = scheduleColorPalettes[schedule.category];
  const variant = getScheduleColorVariant(schedule);
  const color = palette[variant % palette.length];

  if (tone === 'line') {
    return {
      backgroundColor: `hsl(${color.hue} ${color.saturation}% ${color.lightness}%)`,
    };
  }

  if (tone === 'solid') {
    return {
      backgroundColor: `hsl(${color.hue} ${color.saturation}% ${color.lightness}%)`,
      color: 'hsl(var(--primary-foreground))',
      borderColor: `hsl(${color.hue} ${color.saturation}% ${Math.max(color.strongLightness, color.lightness - 8)}%)`,
    };
  }

  if (tone === 'strong') {
    return {
      backgroundColor: `hsl(${color.hue} ${color.saturation}% ${color.strongLightness}%)`,
      color: 'hsl(var(--primary-foreground))',
      borderColor: `hsl(${color.hue} ${color.saturation}% ${Math.max(24, color.strongLightness - 6)}%)`,
    };
  }

  return {
    backgroundColor: `hsl(${color.hue} ${color.softSaturation}% ${color.softLightness}%)`,
    color: `hsl(${color.hue} ${color.saturation}% ${color.strongLightness}%)`,
    borderColor: `hsl(${color.hue} ${color.saturation}% ${color.lightness}% / 0.28)`,
  };
};

export const getCategoryLabel = (category: ScheduleCategory) => {
  const labels: Record<ScheduleCategory, string> = {
    task: '할일',
    appointment: '약속',
    group: '모임',
    important: '중요',
    repeat: '반복',
  };
  return labels[category];
};

// ── Date/Time formatters ──

export const formatTime = (isoString: string) => {
  const date = new Date(isoString);
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export const formatDate = (isoString: string) => {
  const date = new Date(isoString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
};

export const getDayLabel = (isoString: string) => {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const date = new Date(isoString);
  return days[date.getDay()];
};
