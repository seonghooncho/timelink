import { useMemo } from 'react';
import { Schedule } from '@/types/types';

interface ScheduleGroup {
  date: string;
  label: string;
  schedules: Schedule[];
}

export function useGroupedSchedules(schedules: Schedule[]): ScheduleGroup[] {
  return useMemo(() => {
    const upcoming = schedules
      .filter(s => !s.isCompleted)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const groups: ScheduleGroup[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    upcoming.forEach(s => {
      const dateStr = s.startTime.slice(0, 10);
      let existing = groups.find(g => g.date === dateStr);
      if (!existing) {
        const sDate = new Date(dateStr);
        const diffDays = Math.round((sDate.getTime() - today.getTime()) / 86400000);
        let label: string;
        if (diffDays === 0) {
          label = `오늘 ${sDate.getMonth() + 1}/${sDate.getDate()}`;
        } else if (diffDays > 0) {
          label = `${diffDays}일 뒤 ${sDate.getMonth() + 1}/${sDate.getDate()}`;
        } else {
          label = `${Math.abs(diffDays)}일 전 ${sDate.getMonth() + 1}/${sDate.getDate()}`;
        }
        existing = { date: dateStr, label, schedules: [] };
        groups.push(existing);
      }
      existing.schedules.push(s);
    });

    return groups;
  }, [schedules]);
}
