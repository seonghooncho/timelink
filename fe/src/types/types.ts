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
  imageUrl?: string;
  imageId?: string;
  imageStatus?: 'PROCESSING' | 'COMPLETED' | 'FAILED';
}

export interface Group {
  id: string;
  name: string;
  description: string;
  image?: string;
  imageId?: string;
  imageStatus?: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  inviteCode?: string;
  memberCount?: number;
  myRole?: string;
  schedules: Schedule[];
}
