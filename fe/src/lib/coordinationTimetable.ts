import { getScheduleEndDate } from '@/lib/scheduleTime';
import type { Schedule } from '@/types/types';

export const buildCoordinationSlotKey = (dateIndex: number, hour: number) => `${dateIndex}-${hour}`;

export const COORDINATION_DATE_WINDOW_SIZE = 5;

export interface CoordinationAvailabilitySlot {
  date: string;
  hour: number;
  count: number;
}

export interface CoordinationAvailabilityWindow {
  date: string;
  startHour: number;
  endHour: number;
  count: number;
  slots: CoordinationAvailabilitySlot[];
}

const isSchedulableSlot = (slot: CoordinationAvailabilitySlot, dates: string[]) =>
  Boolean(slot.date)
  && Number.isFinite(slot.hour)
  && slot.count > 0
  && dates.includes(slot.date);

export const formatCoordinationHourTime = (hour: number) =>
  `${String(hour).padStart(2, '0')}:00`;

export const getCoordinationDateWindowStarts = (
  totalDates: number,
  windowSize = COORDINATION_DATE_WINDOW_SIZE,
) => {
  if (totalDates <= windowSize) return [0];

  const starts: number[] = [];
  const maxStart = Math.max(0, totalDates - windowSize);

  // 마지막 묶음도 windowSize만큼 보이도록 필요하면 이전 날짜를 중복해서 보여준다.
  for (let start = 0; start < totalDates; start += windowSize) {
    const nextStart = Math.min(start, maxStart);
    if (!starts.includes(nextStart)) starts.push(nextStart);
  }

  return starts;
};

export const getRecommendedCoordinationAvailabilityWindow = (
  heatmap: CoordinationAvailabilitySlot[] = [],
  dates: string[] = [],
): CoordinationAvailabilityWindow | null => {
  const validSlots = heatmap.filter((slot) => isSchedulableSlot(slot, dates));
  if (validSlots.length === 0) return null;

  const maxCount = Math.max(...validSlots.map((slot) => slot.count));
  const bestSlots = validSlots
    .filter((slot) => slot.count === maxCount)
    .sort((a, b) => {
      const dateOrder = dates.indexOf(a.date) - dates.indexOf(b.date);
      if (dateOrder !== 0) return dateOrder;
      return a.hour - b.hour;
    });

  const windows: CoordinationAvailabilityWindow[] = [];

  // 최다 득표 슬롯 중 같은 날짜에서 연속된 시간대를 하나의 추천 구간으로 묶는다.
  bestSlots.forEach((slot) => {
    const lastWindow = windows[windows.length - 1];
    const lastSlot = lastWindow?.slots[lastWindow.slots.length - 1];

    if (lastWindow && lastSlot && lastWindow.date === slot.date && lastSlot.hour + 1 === slot.hour) {
      lastWindow.slots.push(slot);
      lastWindow.endHour = slot.hour + 1;
      return;
    }

    windows.push({
      date: slot.date,
      startHour: slot.hour,
      endHour: slot.hour + 1,
      count: slot.count,
      slots: [slot],
    });
  });

  return windows.sort((a, b) => {
    if (b.slots.length !== a.slots.length) return b.slots.length - a.slots.length;

    const dateOrder = dates.indexOf(a.date) - dates.indexOf(b.date);
    if (dateOrder !== 0) return dateOrder;

    return a.startHour - b.startHour;
  })[0] ?? null;
};

export const getRecommendedCoordinationScheduleSlot = (
  heatmap: CoordinationAvailabilitySlot[] = [],
  dates: string[] = [],
  selectedSlot?: CoordinationAvailabilitySlot | null,
) => {
  if (selectedSlot && isSchedulableSlot(selectedSlot, dates)) {
    return selectedSlot;
  }

  // 사용자가 고른 슬롯이 없으면 추천 구간의 첫 시간을 모임 일정 후보로 사용한다.
  return getRecommendedCoordinationAvailabilityWindow(heatmap, dates)?.slots[0] ?? null;
};

const getHourSlotRange = (date: Date, hour: number) => {
  const start = new Date(date);
  start.setHours(hour, 0, 0, 0);

  const end = new Date(start);
  end.setHours(hour + 1, 0, 0, 0);

  return { start, end };
};

export const scheduleOverlapsCoordinationSlot = (
  schedule: Pick<Schedule, 'startTime' | 'duration' | 'endTime'>,
  date: Date,
  hour: number,
) => {
  const scheduleStart = new Date(schedule.startTime);
  const scheduleEnd = getScheduleEndDate(schedule);
  const { start: slotStart, end: slotEnd } = getHourSlotRange(date, hour);

  if (
    Number.isNaN(scheduleStart.getTime())
    || Number.isNaN(scheduleEnd.getTime())
    || Number.isNaN(slotStart.getTime())
    || Number.isNaN(slotEnd.getTime())
  ) {
    return false;
  }

  // 끝과 시작이 맞닿는 경우는 같은 시간 점유로 보지 않는다.
  return scheduleStart.getTime() < slotEnd.getTime() && scheduleEnd.getTime() > slotStart.getTime();
};

export const groupSchedulesByCoordinationSlot = (
  schedules: Schedule[],
  dates: Date[],
  hours: number[],
) => {
  const map: Record<string, Schedule[]> = {};

  // 기존 일정을 먼저 깔아두기 위해 후보 슬롯별 겹치는 일정을 모아둔다.
  schedules.forEach((schedule) => {
    dates.forEach((date, dateIndex) => {
      hours.forEach((hour) => {
        if (!scheduleOverlapsCoordinationSlot(schedule, date, hour)) return;

        const key = buildCoordinationSlotKey(dateIndex, hour);
        if (!map[key]) map[key] = [];
        map[key].push(schedule);
      });
    });
  });

  Object.values(map).forEach((slotSchedules) => {
    slotSchedules.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  });

  return map;
};
