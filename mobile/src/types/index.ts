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
  groupScheduleId?: string;
  groupScheduleCreatedBy?: string;
  groupScheduleOwner?: boolean;
  groupScheduleParticipant?: boolean;
  imageUrl?: string;
  imageId?: string;
  imageStatus?: ImageStatus;
  participants?: ScheduleParticipant[];
}

export interface ScheduleParticipant {
  userId: string;
  nickname: string;
  avatarUrl?: string;
  thumbnailUrl?: string;
  imageId?: string;
  imageStatus?: ImageStatus;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  imageId?: string;
  imageStatus?: ImageStatus;
  inviteCode?: string;
  visibility?: 'PRIVATE' | 'PUBLIC';
  memberCount: number;
  myRole: string;
  joinRequestStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  nextSchedule?: {
    id: string;
    title: string;
    startTime: string;
    duration?: number;
  } | null;
  upcomingScheduleCount?: number;
  activeCoordination?: CoordinationSummary | null;
  createdAt: string;
}

export interface GroupMember {
  id: string;
  userId: string;
  role: string;
  nickname: string;
  avatarUrl?: string;
  thumbnailUrl?: string;
  imageId?: string;
  imageStatus?: ImageStatus;
  joinedAt: string;
}

export interface GroupMemberActivity {
  id: string;
  type: 'POST' | string;
  title?: string;
  createdAt: string;
}

export interface GroupMemberProfile extends GroupMember {
  mine?: boolean;
  recentActivities: GroupMemberActivity[];
}

export interface Profile {
  id: string;
  nickname: string;
  avatarUrl?: string;
  thumbnailUrl?: string;
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
  /** @deprecated 모임 알림센터 수신은 서버 기본 정책이며, 푸시 여부는 pushAlarm을 기준으로 봅니다. */
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
  description?: string;
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
  description?: string;
  mode: string;
  dates: string[];
  startHour: number;
  endHour: number;
  status: string;
  heatmap: HeatmapEntry[];
  myResponses: SlotEntry[];
}

export type ImageStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface CommunityPost {
  id: string;
  title: string;
  content: string;
  groupId?: string;
  memberOnly?: boolean;
  locked?: boolean;
  anonymous?: boolean;
  imageUrl?: string;
  imageId?: string;
  imageStatus?: ImageStatus;
  authorUserId?: string;
  authorNickname: string;
  authorAvatarUrl?: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  mine: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityComment {
  id: string;
  postId: string;
  content: string;
  authorUserId: string;
  authorNickname: string;
  authorAvatarUrl?: string;
  mine: boolean;
  createdAt: string;
  updatedAt: string;
}
