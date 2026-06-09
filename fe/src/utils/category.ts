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

const scheduleColorBase: Record<ScheduleCategory, { hue: number; saturation: number; lightness: number; softSaturation: number; softLightness: number; strongLightness: number }> = {
  task: { hue: 220, saturation: 65, lightness: 58, softSaturation: 40, softLightness: 95, strongLightness: 44 },
  appointment: { hue: 160, saturation: 50, lightness: 44, softSaturation: 35, softLightness: 94, strongLightness: 32 },
  important: { hue: 0, saturation: 60, lightness: 56, softSaturation: 45, softLightness: 95, strongLightness: 42 },
  group: { hue: 260, saturation: 45, lightness: 58, softSaturation: 35, softLightness: 95, strongLightness: 42 },
  repeat: { hue: 30, saturation: 60, lightness: 52, softSaturation: 40, softLightness: 95, strongLightness: 38 },
};

const scheduleHueOffsets = [-8, -4, 0, 4, 8];
const scheduleLightnessOffsets = [-2, 1, 0, -1, 2];

const hashScheduleKey = (schedule: Pick<Schedule, 'id' | 'title' | 'startTime'>) => {
  const source = `${schedule.id}:${schedule.title}:${schedule.startTime}`;
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }
  return hash;
};

export const getScheduleColorVariant = (schedule: Pick<Schedule, 'id' | 'title' | 'startTime'>) =>
  hashScheduleKey(schedule) % scheduleHueOffsets.length;

export const getScheduleColorStyle = (
  schedule: Pick<Schedule, 'id' | 'title' | 'startTime' | 'category'>,
  tone: 'soft' | 'solid' | 'strong' | 'line' = 'soft',
): CSSProperties => {
  const base = scheduleColorBase[schedule.category];
  const variant = getScheduleColorVariant(schedule);
  const hue = base.hue + scheduleHueOffsets[variant];
  const lightnessOffset = scheduleLightnessOffsets[variant];

  if (tone === 'line') {
    return {
      backgroundColor: `hsl(${hue} ${base.saturation}% ${base.lightness + lightnessOffset}%)`,
    };
  }

  if (tone === 'solid') {
    return {
      backgroundColor: `hsl(${hue} ${base.saturation}% ${base.lightness + lightnessOffset}%)`,
      color: 'hsl(var(--primary-foreground))',
      borderColor: `hsl(${hue} ${base.saturation}% ${Math.max(base.strongLightness, base.lightness - 8)}%)`,
    };
  }

  if (tone === 'strong') {
    return {
      backgroundColor: `hsl(${hue} ${base.saturation}% ${base.strongLightness + lightnessOffset}%)`,
      color: 'hsl(var(--primary-foreground))',
      borderColor: `hsl(${hue} ${base.saturation}% ${Math.max(24, base.strongLightness - 6)}%)`,
    };
  }

  return {
    backgroundColor: `hsl(${hue} ${base.softSaturation}% ${base.softLightness + lightnessOffset}%)`,
    color: `hsl(${hue} ${base.saturation}% ${base.strongLightness}%)`,
    borderColor: `hsl(${hue} ${base.saturation}% ${base.lightness}% / 0.24)`,
  };
};

export const getCategoryLabel = (category: ScheduleCategory) => {
  const labels: Record<ScheduleCategory, string> = {
    task: '과제',
    appointment: '약속',
    group: '그룹',
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
