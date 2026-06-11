const pad2 = (value: number) => String(value).padStart(2, '0');

export const addLocalDays = (value: Date, days: number) => {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
};

export const startOfLocalMonth = (value: Date) => new Date(value.getFullYear(), value.getMonth(), 1);

export const endOfLocalMonth = (value: Date) => new Date(value.getFullYear(), value.getMonth() + 1, 0);

export const minLocalDate = (...dates: Date[]) =>
  new Date(Math.min(...dates.map(date => date.getTime())));

export const maxLocalDate = (...dates: Date[]) =>
  new Date(Math.max(...dates.map(date => date.getTime())));

export const toLocalDateTimeParam = (value: Date, endOfDay = false) => {
  const hour = endOfDay ? 23 : 0;
  const minute = endOfDay ? 59 : 0;
  const second = endOfDay ? 59 : 0;
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}T${pad2(hour)}:${pad2(minute)}:${pad2(second)}`;
};
