import { getScheduleEndDate } from '@/lib/scheduleTime';
import type { Schedule } from '@/types/types';

export const buildCoordinationSlotKey = (dateIndex: number, hour: number) => `${dateIndex}-${hour}`;

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

  return scheduleStart.getTime() < slotEnd.getTime() && scheduleEnd.getTime() > slotStart.getTime();
};

export const groupSchedulesByCoordinationSlot = (
  schedules: Schedule[],
  dates: Date[],
  hours: number[],
) => {
  const map: Record<string, Schedule[]> = {};

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
