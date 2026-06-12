export const DEFAULT_SCHEDULE_DURATION = 1;
export const SCHEDULE_DURATION_STEP = 0.5;

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const HALF_HOUR_TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const totalMinutes = index * 30;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
});

export const DURATION_OPTIONS = Array.from({ length: 16 }, (_, index) => (index + 1) * SCHEDULE_DURATION_STEP);

export function formatLocalDateTime(date: string, time: string) {
  return `${date}T${time}:00`;
}

export function isHalfHourTime(time: string) {
  const match = timePattern.exec(time);
  if (!match) return false;
  const minutes = Number(match[2]);
  return minutes === 0 || minutes === 30;
}

export function addDuration(startIso: string, duration: number) {
  const start = new Date(startIso);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + duration * 60);
  return end;
}

export function getScheduleEnd(schedule: { startTime: string; duration?: number; endTime?: string }) {
  if (schedule.duration && Number.isFinite(schedule.duration)) {
    return addDuration(schedule.startTime, schedule.duration);
  }
  return schedule.endTime ? new Date(schedule.endTime) : addDuration(schedule.startTime, DEFAULT_SCHEDULE_DURATION);
}

export function isSameLocalDate(first: Date, second: Date) {
  return first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate();
}

export function validateScheduleDateTime(date: string, time: string, duration: number) {
  if (!date) return '날짜를 선택해주세요.';
  if (!time) return '시작 시간을 선택해주세요.';
  if (!isHalfHourTime(time)) return '시작 시간은 30분 단위로 선택해주세요.';
  if (!Number.isFinite(duration) || duration < SCHEDULE_DURATION_STEP) return '소요 시간은 30분 이상이어야 합니다.';
  if (!Number.isInteger(duration / SCHEDULE_DURATION_STEP)) return '소요 시간은 30분 단위로 선택해주세요.';

  const start = new Date(formatLocalDateTime(date, time));
  const end = addDuration(formatLocalDateTime(date, time), duration);
  if (!isSameLocalDate(start, end)) return '시작 시간과 소요시간은 같은 날짜 안에서 끝나야 합니다.';
  return null;
}

export function formatDurationLabel(duration: number) {
  if (duration === 0.5) return '30분';
  if (Number.isInteger(duration)) return `${duration}시간`;
  const hours = Math.floor(duration);
  return `${hours}시간 30분`;
}
