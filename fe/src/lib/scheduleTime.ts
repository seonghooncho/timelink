import type { Schedule } from '@/types/types';

export const DEFAULT_SCHEDULE_DURATION_HOURS = 1;
export const SCHEDULE_DURATION_STEP_HOURS = 0.5;
export const MIN_SCHEDULE_DURATION_HOURS = 0.5;
export const MAX_SCHEDULE_DURATION_HOURS = 23.5;

const MINUTES_PER_HOUR = 60;

export const SCHEDULE_DURATION_OPTIONS = Array.from(
  { length: Math.floor(MAX_SCHEDULE_DURATION_HOURS / SCHEDULE_DURATION_STEP_HOURS) },
  (_, index) => (index + 1) * SCHEDULE_DURATION_STEP_HOURS,
);

export const getScheduleDurationMinutes = (duration?: number) => {
  if (!Number.isFinite(duration) || !duration || duration <= 0) {
    return DEFAULT_SCHEDULE_DURATION_HOURS * MINUTES_PER_HOUR;
  }

  return Math.round(duration * MINUTES_PER_HOUR);
};

export const getScheduleEndDate = (
  schedule: Pick<Schedule, 'startTime' | 'duration' | 'endTime'>,
) => {
  const start = new Date(schedule.startTime);
  if (!Number.isFinite(schedule.duration) || schedule.duration <= 0) {
    const explicitEnd = schedule.endTime ? new Date(schedule.endTime) : null;
    if (explicitEnd && explicitEnd.getTime() > start.getTime()) {
      return explicitEnd;
    }
  }

  const end = new Date(start);
  end.setMinutes(end.getMinutes() + getScheduleDurationMinutes(schedule.duration));

  if (Number.isNaN(end.getTime()) && schedule.endTime) {
    return new Date(schedule.endTime);
  }

  return end;
};

export const formatDurationLabel = (duration?: number) => {
  const normalized = getScheduleDurationMinutes(duration) / MINUTES_PER_HOUR;
  if (Number.isInteger(normalized)) {
    return `${normalized}시간`;
  }

  const hours = Math.floor(normalized);
  const minutes = Math.round((normalized - hours) * MINUTES_PER_HOUR);
  return hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`;
};

export const formatScheduleClock = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export const formatScheduleDateClock = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getMonth() + 1}/${date.getDate()} ${formatScheduleClock(date)}`;
};

export const formatScheduleSlotLabel = (
  schedule: Pick<Schedule, 'startTime'>,
) => formatScheduleClock(schedule.startTime);
