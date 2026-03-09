import { ScheduleCategory } from '@/types/types';

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
