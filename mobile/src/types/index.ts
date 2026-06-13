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
  imageStatus?: ImageStatus;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  imageId?: string;
  imageStatus?: ImageStatus;
  inviteCode: string;
  memberCount: number;
  myRole: string;
  createdAt: string;
}

export interface GroupMember {
  id: string;
  userId: string;
  role: string;
  nickname: string;
  avatarUrl?: string;
  joinedAt: string;
}

export interface Profile {
  id: string;
  nickname: string;
  avatarUrl?: string;
  imageId?: string;
  imageStatus?: ImageStatus;
  requiredConsentCompleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  content: string;
  category?: string;
  isImportant?: boolean;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationSettings {
  scheduleAlarm: boolean;
  /** @deprecated 그룹 알림센터 수신은 서버 기본 정책이며, 푸시 여부는 pushAlarm을 기준으로 봅니다. */
  groupAlarm: boolean;
  pushAlarm: boolean;
  remindOneDayBefore: boolean;
  remindOneDayBeforeTime: string;
  remindSameDay: boolean;
  remindSameDayTime: string;
  importantAlarm: boolean;
  importantAlarmTime: string;
}

export interface CoordinationSummary {
  id: string;
  title: string;
  mode: string;
  dates: string[];
  startHour: number;
  endHour: number;
  status: string;
  responseCount: number;
  createdBy: string;
  createdAt: string;
}

export interface HeatmapEntry {
  date: string;
  hour: number;
  count: number;
  users: string[];
}

export interface SlotEntry {
  date: string;
  hour: number;
}

export interface CoordinationDetail {
  id: string;
  title: string;
  mode: string;
  dates: string[];
  startHour: number;
  endHour: number;
  status: string;
  heatmap: HeatmapEntry[];
  myResponses: SlotEntry[];
}

export type ImageStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED';
