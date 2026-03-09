export type ScheduleCategory = 'task' | 'appointment' | 'group' | 'important' | 'repeat';

export interface Schedule {
  id: string;
  title: string;
  content: string;
  category: ScheduleCategory;
  isImportant: boolean;
  startTime: string;
  endTime: string;
  duration: number;
  isCompleted: boolean;
  hasAlarm: boolean;
  groupId?: string;
}

export interface GroupMember {
  id: string;
  name: string;
  role: 'manager' | 'member';
  avatar: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  image?: string;
  members: GroupMember[];
  schedules: Schedule[];
}

export interface TimeCoordination {
  id: string;
  title: string;
  groupId: string;
  dates: string[];
  startHour: number;
  endHour: number;
  memberIds: string[];
  mode: 'once' | 'repeat';
  status: 'active' | 'closed';
  createdAt: string;
  responses: TimeSlotResponse[];
}

export interface TimeSlotResponse {
  userId: string;
  date: string;
  hour: number;
}

export interface TimeSlot {
  date: string;
  hour: number;
  selectedBy: string[];
}

export interface Notification {
  id: string;
  type: 'schedule' | 'system';
  title: string;
  content: string;
  time: string;
  category?: ScheduleCategory;
  isImportant?: boolean;
  isRead: boolean;
}

export interface UserProfile {
  id: string;
  nickname: string;
  avatar: string;
  notificationSettings: {
    scheduleAlarm: boolean;
    groupAlarm: boolean;
    remindOneDayBefore: boolean;
    remindOneDayBeforeTime: string;
    remindSameDay: boolean;
    remindSameDayTime: string;
    importantAlarm: boolean;
    importantAlarmTime: string;
  };
}
