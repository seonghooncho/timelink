export type ScheduleCategory = 'task' | 'appointment' | 'group' | 'important' | 'repeat';

export interface Schedule {
  id: string;
  title: string;
  content: string;
  category: ScheduleCategory;
  isImportant: boolean;
  startTime: string;
  endTime?: string;
  duration: number;
  isCompleted: boolean;
  hasAlarm: boolean;
  groupId?: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  image?: string;
  inviteCode?: string;
  memberCount?: number;
  schedules: Schedule[];
}
