import { ScheduleCreateRequest } from '@/services/api';
import { ScheduleCategory } from '@/types/types';
import {
  DEFAULT_SCHEDULE_DURATION_HOURS,
  SCHEDULE_DURATION_STEP_HOURS,
} from '@/lib/scheduleTime';

export const SCHEDULE_TIME_STEP_SECONDS = 30 * 60;
const HALF_HOUR_MINUTES = 30;
const MIN_DURATION_HOURS = SCHEDULE_DURATION_STEP_HOURS;

export interface ScheduleFormValues {
  title: string;
  content: string;
  category: ScheduleCategory;
  isImportant: boolean;
  startDate: string;
  startTime: string;
  duration: string;
  hasAlarm: boolean;
  groupId?: string;
}

export type ScheduleFormResult =
  | { ok: true; data: ScheduleCreateRequest }
  | { ok: false; message: string; description?: string };

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const HALF_HOUR_TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const totalMinutes = index * HALF_HOUR_MINUTES;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
});

export const formatHalfHourTimeLabel = (time: string) => {
  const match = timePattern.exec(time);
  if (!match) return time;

  const hour = Number(match[1]);
  const minute = match[2];
  const period = hour < 12 ? '오전' : '오후';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${period} ${displayHour}:${minute}`;
};

export const isHalfHourTime = (time: string) => {
  const match = timePattern.exec(time);
  if (!match) return false;

  const minutes = Number(match[2]);
  return minutes === 0 || minutes === HALF_HOUR_MINUTES;
};

export const normalizeTimeToHalfHour = (time: string) => {
  const match = timePattern.exec(time);
  if (!match) return time;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const roundedMinutes = Math.round((hour * 60 + minute) / HALF_HOUR_MINUTES) * HALF_HOUR_MINUTES;
  const clampedMinutes = Math.min(23 * 60 + HALF_HOUR_MINUTES, Math.max(0, roundedMinutes));
  const normalizedHour = Math.floor(clampedMinutes / 60);
  const normalizedMinute = clampedMinutes % 60;

  return `${String(normalizedHour).padStart(2, '0')}:${String(normalizedMinute).padStart(2, '0')}`;
};

const getLocalDateTime = (date: string, time: string) => new Date(`${date}T${time}:00`);
const formatLocalDateTime = (date: string, time: string) => `${date}T${time}:00`;

const parseDuration = (duration: string): ScheduleFormResult | { ok: true; duration: number } => {
  const trimmed = duration.trim();
  if (!trimmed) {
    return { ok: true, duration: DEFAULT_SCHEDULE_DURATION_HOURS };
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < MIN_DURATION_HOURS) {
    return {
      ok: false,
      message: '소요 시간을 확인해주세요',
      description: '소요 시간은 30분 이상이어야 합니다.',
    };
  }

  if (!Number.isInteger(parsed / SCHEDULE_DURATION_STEP_HOURS)) {
    return {
      ok: false,
      message: '소요 시간을 확인해주세요',
      description: '소요 시간은 30분(0.5시간) 단위로 입력해주세요.',
    };
  }

  return { ok: true, duration: parsed };
};

const isSameLocalDate = (first: Date, second: Date) =>
  first.getFullYear() === second.getFullYear()
  && first.getMonth() === second.getMonth()
  && first.getDate() === second.getDate();

// 프론트 입력 검증은 백엔드의 startTime + duration 정책과 같은 기준을 사용한다.
export const buildScheduleCreateRequest = (values: ScheduleFormValues): ScheduleFormResult => {
  const title = values.title.trim();
  if (!title) {
    return { ok: false, message: '제목을 입력해주세요' };
  }

  if (!values.startDate) {
    return { ok: false, message: '시작 날짜를 선택해주세요' };
  }

  if (!values.startTime) {
    return { ok: false, message: '시작 시간을 선택해주세요' };
  }

  if (!isHalfHourTime(values.startTime)) {
    return {
      ok: false,
      message: '시작 시간을 확인해주세요',
      description: '시간은 30분 단위로 선택해주세요.',
    };
  }

  const parsedDuration = parseDuration(values.duration);
  if (!parsedDuration.ok) {
    return parsedDuration;
  }

  const start = getLocalDateTime(values.startDate, values.startTime);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + parsedDuration.duration * 60);
  if (!isSameLocalDate(start, end)) {
    return {
      ok: false,
      message: '소요 시간을 확인해주세요',
      description: '시작 시간과 소요시간은 같은 날짜 안에서 끝나야 합니다.',
    };
  }

  return {
    ok: true,
    data: {
      title,
      content: values.content.trim(),
      category: values.category,
      isImportant: values.isImportant,
      startTime: formatLocalDateTime(values.startDate, values.startTime),
      duration: parsedDuration.duration,
      hasAlarm: values.hasAlarm,
      groupId: values.category === 'group' ? values.groupId : undefined,
    },
  };
};
