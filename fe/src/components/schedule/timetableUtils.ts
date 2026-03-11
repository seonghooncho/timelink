export const TIMETABLE_HOUR_START = 0;
export const TIMETABLE_HOUR_END = 24;
export const TIMETABLE_DEFAULT_VISIBLE_HOUR = 7;
export const TIMETABLE_HOUR_HEIGHT = 48;

export const getTimetableDraggedScrollTop = (startScrollTop: number, startY: number, currentY: number) =>
  startScrollTop - (currentY - startY);
