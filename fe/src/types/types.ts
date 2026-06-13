export type ScheduleCategory = 'task' | 'appointment' | 'group' | 'important' | 'repeat';

export interface Schedule {
  id: string;
  title: string;
  content: string;
  category: ScheduleCategory;
  isImportant: boolean;
  startTime: string;
  /** @deprecated 일정 표시는 startTime + duration을 기준으로 계산합니다. */
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
  visibility?: 'PRIVATE' | 'PUBLIC';
  memberCount?: number;
  myRole?: string;
  joinRequestStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  nextSchedule?: {
    id: string;
    title: string;
    startTime: string;
    duration?: number;
  } | null;
  schedules: Schedule[];
}
