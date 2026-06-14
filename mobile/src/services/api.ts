import { env } from '../config/env';
import { clearStoredSession, getAccessToken } from './session';

export interface ApiPageMeta {
  perPage: number;
  nextCursor?: string | null;
}

interface ApiEnvelope<T> {
  data: T;
  meta?: ApiPageMeta;
}

export interface PaginationParams {
  cursor?: string | null;
  limit?: number;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function getAuthHeaders(contentType = 'application/json') {
  const token = await getAccessToken();
  return {
    ...(contentType ? { 'Content-Type': contentType } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function requestEnvelope<T>(
  method: string,
  baseUrl: string,
  path: string,
  body?: unknown,
  requiresAuth = true,
): Promise<ApiEnvelope<T>> {
  const headers = requiresAuth ? await getAuthHeaders() : { 'Content-Type': 'application/json' };
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (res.status === 204) {
    return { data: undefined as T };
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      await clearStoredSession();
    }
    throw new ApiError(res.status, json?.error?.message || json?.detail || `API Error ${res.status}`);
  }

  return {
    data: json.data as T,
    meta: json.meta as ApiPageMeta | undefined,
  };
}

async function request<T>(method: string, path: string, body?: unknown, requiresAuth = true) {
  const envelope = await requestEnvelope<T>(method, env.plannerApiBaseUrl, path, body, requiresAuth);
  return envelope.data;
}

function withPagination(path: string, pagination?: PaginationParams) {
  const [pathname, search = ''] = path.split('?');
  const params = new URLSearchParams(search);

  Object.entries(pagination ?? {}).forEach(([key, value]) => {
    if (key === 'cursor' || key === 'limit') return;
    if (value === undefined || value === null || value === '') {
      params.delete(key);
      return;
    }
    params.set(key, String(value));
  });

  if (pagination?.cursor) {
    params.set('cursor', pagination.cursor);
  } else {
    params.delete('cursor');
  }

  if (pagination?.limit) {
    params.set('limit', String(pagination.limit));
  }

  const qs = params.toString();
  return `${pathname}${qs ? `?${qs}` : ''}`;
}

async function requestPage<T>(path: string, pagination?: PaginationParams, requiresAuth = true) {
  return requestEnvelope<T[]>('GET', env.plannerApiBaseUrl, withPagination(path, pagination), undefined, requiresAuth);
}

async function requestAllPages<T>(path: string, limit = 20) {
  const items: T[] = [];
  let cursor: string | null = null;
  const seen = new Set<string>();

  do {
    const page: ApiEnvelope<T[]> = await requestPage<T>(path, { cursor, limit });
    items.push(...page.data);
    cursor = page.meta?.nextCursor ?? null;
    if (cursor && seen.has(cursor)) break;
    if (cursor) seen.add(cursor);
  } while (cursor);

  return items;
}

export interface AuthLoginRequest {
  userId: string;
  nickname?: string;
}

export interface AuthSessionResponse {
  accessToken: string;
  userId: string;
}

export type SocialAuthProvider = 'google' | 'kakao';

export interface AuthProvidersResponse {
  google: boolean;
  kakao: boolean;
}

export const authApi = {
  login: (data: AuthLoginRequest) => request<AuthSessionResponse>('POST', '/auth/login', data, false),
  getMe: () => request<AuthSessionResponse>('GET', '/auth/me'),
  getProviders: () => request<AuthProvidersResponse>('GET', '/auth/providers', undefined, false),
  getOAuthStartUrl: (provider: SocialAuthProvider, frontendOrigin: string, redirectPath: string) => {
    const params = new URLSearchParams({
      frontendOrigin,
      redirect: redirectPath || '/',
    });
    return `${env.plannerApiBaseUrl}/auth/oauth/${provider}/start?${params.toString()}`;
  },
};

export type ImagePurpose = 'MEMBER' | 'GROUP' | 'SCHEDULE' | 'GROUP_INTRO' | 'GROUP_POST' | 'COMMUNITY_POST';
export type ImageStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface ScheduleResponse {
  id: string;
  title: string;
  content: string;
  category: string;
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
  participants?: ScheduleParticipantResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleParticipantResponse {
  userId: string;
  nickname: string;
  avatarUrl?: string;
  thumbnailUrl?: string;
  imageId?: string;
  imageStatus?: ImageStatus;
}

export interface ScheduleCreateRequest {
  title: string;
  content?: string;
  category: string;
  isImportant?: boolean;
  startTime: string;
  duration: number;
  hasAlarm?: boolean;
  groupId?: string;
  participantUserIds?: string[];
  imageUrl?: string;
  imageId?: string;
}

export interface ScheduleUpdateRequest {
  title?: string;
  content?: string;
  category?: string;
  isImportant?: boolean;
  startTime?: string;
  duration?: number;
  isCompleted?: boolean;
  hasAlarm?: boolean;
  imageUrl?: string;
  imageId?: string;
}

export interface ScheduleListRequest extends PaginationParams {
  startDate?: string;
  endDate?: string;
}

export const scheduleApi = {
  getPage: (params?: ScheduleListRequest) => {
    const query = new URLSearchParams();
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    return requestPage<ScheduleResponse>(`/schedules${query.toString() ? `?${query.toString()}` : ''}`, params);
  },
  getAll: (params?: ScheduleListRequest) => {
    const query = new URLSearchParams();
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    return requestAllPages<ScheduleResponse>(`/schedules${query.toString() ? `?${query.toString()}` : ''}`, params?.limit ?? 50);
  },
  getById: (id: string) => request<ScheduleResponse>('GET', `/schedules/${id}`),
  create: (data: ScheduleCreateRequest) => request<ScheduleResponse>('POST', '/schedules', data),
  update: (id: string, data: ScheduleUpdateRequest) => request<ScheduleResponse>('PATCH', `/schedules/${id}`, data),
  delete: (id: string) => request<void>('DELETE', `/schedules/${id}`),
  leaveParticipation: (id: string) => request<void>('DELETE', `/schedules/${id}/participation`),
};

export interface ProfileResponse {
  id: string;
  nickname: string;
  avatarUrl: string;
  thumbnailUrl?: string;
  imageId?: string;
  imageStatus?: ImageStatus;
  termsVersion?: string;
  termsAgreedAt?: string;
  privacyVersion?: string;
  privacyAgreedAt?: string;
  requiredConsentCompleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export const profileApi = {
  getMe: () => request<ProfileResponse>('GET', '/profiles/me'),
  updateMe: (data: { nickname?: string; avatarUrl?: string; imageId?: string }) =>
    request<ProfileResponse>('PATCH', '/profiles/me', data),
  agreeRequiredConsents: () => request<ProfileResponse>('POST', '/profiles/me/consents/required'),
};

export interface GroupListResponse {
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
  activeCoordination?: GroupCoordinationSummaryResponse | null;
  createdAt: string;
}

export interface GroupCoordinationSummaryResponse {
  id: string;
  title: string;
  description?: string;
  mode: string;
  dates: string[];
  startHour: number;
  endHour: number;
  status: string;
  responseCount: number;
  createdAt: string;
}

export interface GroupMemberResponse {
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

export interface GroupMemberActivityResponse {
  id: string;
  type: 'POST' | string;
  title?: string;
  createdAt: string;
}

export interface GroupMemberProfileResponse extends GroupMemberResponse {
  mine?: boolean;
  recentActivities: GroupMemberActivityResponse[];
}

export interface GroupDetailResponse {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  imageId?: string;
  imageStatus?: ImageStatus;
  inviteCode: string;
  visibility?: 'PRIVATE' | 'PUBLIC';
  myRole?: string;
  createdBy: string;
  members: GroupMemberResponse[];
  createdAt: string;
}

export interface GroupJoinRequestResponse {
  id?: string;
  groupId: string;
  userId: string;
  message?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  nickname?: string;
  avatarUrl?: string;
  createdAt?: string;
  decidedAt?: string;
}

export interface GroupIntroImageResponse {
  imageId: string;
  url?: string;
  status?: ImageStatus;
}

export interface GroupIntroNoticeResponse {
  id: string;
  title: string;
  content: string;
  authorUserId: string;
  authorNickname: string;
  authorAvatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupIntroPostPreviewResponse {
  id: string;
  title?: string;
  contentSnippet?: string;
  authorNickname?: string;
  memberOnly?: boolean;
  locked?: boolean;
  createdAt: string;
}

export interface GroupIntroPostResponse {
  id: string;
  title?: string;
  content?: string;
  contentSnippet?: string;
  authorUserId?: string;
  authorNickname?: string;
  authorAvatarUrl?: string;
  likeCount: number;
  commentCount: number;
  likedByMe?: boolean;
  mine?: boolean;
  memberOnly?: boolean;
  locked?: boolean;
  imageUrl?: string;
  imageId?: string;
  imageStatus?: ImageStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface GroupIntroResponse {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  imageId?: string;
  imageStatus?: ImageStatus;
  visibility?: 'PRIVATE' | 'PUBLIC';
  memberCount: number;
  myRole?: string | null;
  joinRequestStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  introText?: string;
  images: GroupIntroImageResponse[];
  notices: GroupIntroNoticeResponse[];
  postPreviews: GroupIntroPostPreviewResponse[];
  memberPreviews?: GroupMemberResponse[];
  member: boolean;
  canEditIntro: boolean;
  canWriteNotice: boolean;
}

export const groupApi = {
  getPage: (params?: PaginationParams) => requestPage<GroupListResponse>('/groups', params),
  getPublicPage: (params?: PaginationParams & { q?: string }) => requestPage<GroupListResponse>('/groups/public', params),
  getAll: () => requestAllPages<GroupListResponse>('/groups', 20),
  getById: (id: string) => request<GroupDetailResponse>('GET', `/groups/${id}`),
  getIntro: (id: string) => request<GroupIntroResponse>('GET', `/groups/${id}/intro`),
  getIntroPosts: (id: string, params?: PaginationParams) =>
    requestPage<GroupIntroPostResponse>(`/groups/${id}/intro/posts`, params),
  updateIntro: (id: string, data: { introText?: string; imageIds?: string[] }) =>
    request<GroupIntroResponse>('PATCH', `/groups/${id}/intro`, data),
  createNotice: (id: string, data: { title: string; content: string }) =>
    request<GroupIntroNoticeResponse>('POST', `/groups/${id}/notices`, data),
  getNotices: (id: string) => request<GroupIntroNoticeResponse[]>('GET', `/groups/${id}/notices`),
  create: (data: { name: string; description?: string; imageUrl?: string; imageId?: string; visibility?: 'PRIVATE' | 'PUBLIC' }) =>
    request<GroupDetailResponse>('POST', '/groups', data),
  update: (id: string, data: { name?: string; description?: string; imageUrl?: string; imageId?: string; visibility?: 'PRIVATE' | 'PUBLIC' }) =>
    request<GroupDetailResponse>('PATCH', `/groups/${id}`, data),
  delete: (id: string) => request<void>('DELETE', `/groups/${id}`),
  join: (inviteCode: string) => request<GroupDetailResponse>('POST', '/groups/join', { inviteCode }),
  getMembers: (groupId: string) => request<GroupMemberResponse[]>('GET', `/groups/${groupId}/members`),
  getSchedules: (groupId: string, params?: ScheduleListRequest) =>
    requestPage<ScheduleResponse>(`/groups/${groupId}/schedules`, params),
  getMemberProfile: (groupId: string, memberUserId: string) =>
    request<GroupMemberProfileResponse>('GET', `/groups/${groupId}/members/${encodeURIComponent(memberUserId)}/profile`),
  updateMyMemberProfile: (groupId: string, data: { nickname?: string; avatarUrl?: string; imageId?: string }) =>
    request<GroupMemberProfileResponse>('PATCH', `/groups/${groupId}/members/me/profile`, data),
  requestToJoin: (groupId: string, message?: string) =>
    request<GroupJoinRequestResponse>('POST', `/groups/${groupId}/join-requests`, { message }),
  getJoinRequests: (groupId: string) =>
    request<GroupJoinRequestResponse[]>('GET', `/groups/${groupId}/join-requests`),
  decideJoinRequest: (groupId: string, memberUserId: string, status: 'APPROVED' | 'REJECTED') =>
    request<GroupJoinRequestResponse>('PATCH', `/groups/${groupId}/join-requests/${encodeURIComponent(memberUserId)}`, { status }),
  leaveGroup: (groupId: string) => request<void>('DELETE', `/groups/${groupId}/members/me`),
  removeMember: (groupId: string, memberUserId: string) =>
    request<void>('DELETE', `/groups/${groupId}/members/${encodeURIComponent(memberUserId)}`),
};

export interface CommunityPostResponse {
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

export interface CommunityActivityResponse {
  id: string;
  type: 'POST' | string;
  title?: string;
  createdAt: string;
}

export interface CommunityPublicGroupResponse {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  imageStatus?: ImageStatus;
  memberCount: number;
  myRole?: string | null;
  joinRequestStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
}

export interface CommunityPublicProfileResponse {
  userId: string;
  nickname: string;
  avatarUrl?: string;
  thumbnailUrl?: string;
  publicGroups: CommunityPublicGroupResponse[];
  recentActivities: CommunityActivityResponse[];
}

export interface CommunityCommentResponse {
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

export const communityApi = {
  getPosts: (params?: PaginationParams) => requestPage<CommunityPostResponse>('/community/posts', params),
  createPost: (data: { title: string; content: string; anonymous?: boolean }) =>
    request<CommunityPostResponse>('POST', '/community/posts', data),
  getPost: (postId: string) => request<CommunityPostResponse>('GET', `/community/posts/${postId}`),
  updatePost: (postId: string, data: { title?: string; content?: string; imageId?: string }) =>
    request<CommunityPostResponse>('PATCH', `/community/posts/${postId}`, data),
  deletePost: (postId: string) => request<void>('DELETE', `/community/posts/${postId}`),
  likePost: (postId: string) => request<CommunityPostResponse>('PUT', `/community/posts/${postId}/like`),
  unlikePost: (postId: string) => request<CommunityPostResponse>('DELETE', `/community/posts/${postId}/like`),
  getComments: (postId: string, params?: PaginationParams) =>
    requestPage<CommunityCommentResponse>(`/community/posts/${postId}/comments`, params),
  createComment: (postId: string, content: string) =>
    request<CommunityCommentResponse>('POST', `/community/posts/${postId}/comments`, { content }),
  updateComment: (postId: string, commentId: string, content: string) =>
    request<CommunityCommentResponse>('PATCH', `/community/posts/${postId}/comments/${commentId}`, { content }),
  deleteComment: (postId: string, commentId: string) =>
    request<void>('DELETE', `/community/posts/${postId}/comments/${commentId}`),
  getPublicProfile: (userId: string) =>
    request<CommunityPublicProfileResponse>('GET', `/community/profiles/${encodeURIComponent(userId)}`),
};

export const groupPostApi = {
  getPosts: (groupId: string, params?: PaginationParams) =>
    requestPage<CommunityPostResponse>(`/groups/${groupId}/posts`, params),
  createPost: (groupId: string, data: { title: string; content: string; memberOnly?: boolean }) =>
    request<CommunityPostResponse>('POST', `/groups/${groupId}/posts`, data),
  getPost: (groupId: string, postId: string) =>
    request<CommunityPostResponse>('GET', `/groups/${groupId}/posts/${postId}`),
  updatePost: (groupId: string, postId: string, data: { title?: string; content?: string; imageId?: string }) =>
    request<CommunityPostResponse>('PATCH', `/groups/${groupId}/posts/${postId}`, data),
  deletePost: (groupId: string, postId: string) =>
    request<void>('DELETE', `/groups/${groupId}/posts/${postId}`),
  likePost: (groupId: string, postId: string) =>
    request<CommunityPostResponse>('PUT', `/groups/${groupId}/posts/${postId}/like`),
  unlikePost: (groupId: string, postId: string) =>
    request<CommunityPostResponse>('DELETE', `/groups/${groupId}/posts/${postId}/like`),
  getComments: (groupId: string, postId: string, params?: PaginationParams) =>
    requestPage<CommunityCommentResponse>(`/groups/${groupId}/posts/${postId}/comments`, params),
  createComment: (groupId: string, postId: string, content: string) =>
    request<CommunityCommentResponse>('POST', `/groups/${groupId}/posts/${postId}/comments`, { content }),
  updateComment: (groupId: string, postId: string, commentId: string, content: string) =>
    request<CommunityCommentResponse>('PATCH', `/groups/${groupId}/posts/${postId}/comments/${commentId}`, { content }),
  deleteComment: (groupId: string, postId: string, commentId: string) =>
    request<void>('DELETE', `/groups/${groupId}/posts/${postId}/comments/${commentId}`),
};

export interface CoordinationResponse {
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

export interface CoordinationDetailResponse {
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

export const coordinationApi = {
  getPage: (groupId: string, params?: { status?: string } & PaginationParams) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    return requestPage<CoordinationResponse>(
      `/groups/${groupId}/coordinations${query.toString() ? `?${query.toString()}` : ''}`,
      params,
    );
  },
  getAll: (groupId: string, status?: string) => {
    const query = new URLSearchParams();
    if (status) query.set('status', status);
    return requestAllPages<CoordinationResponse>(
      `/groups/${groupId}/coordinations${query.toString() ? `?${query.toString()}` : ''}`,
      20,
    );
  },
  getById: (groupId: string, coordId: string) =>
    request<CoordinationDetailResponse>('GET', `/groups/${groupId}/coordinations/${coordId}`),
  create: (groupId: string, data: { title: string; description?: string; mode: string; dates: string[]; startHour: number; endHour: number }) =>
    request<CoordinationResponse>('POST', `/groups/${groupId}/coordinations`, data),
  update: (groupId: string, coordId: string, data: { status: string }) =>
    request<CoordinationResponse>('PATCH', `/groups/${groupId}/coordinations/${coordId}`, data),
  delete: (groupId: string, coordId: string) =>
    request<void>('DELETE', `/groups/${groupId}/coordinations/${coordId}`),
  submitResponses: (groupId: string, coordId: string, slots: SlotEntry[]) =>
    request<{ submittedCount: number }>('PUT', `/groups/${groupId}/coordinations/${coordId}/responses/me`, { slots }),
  getMyResponses: (groupId: string, coordId: string) =>
    request<{ slots: SlotEntry[] }>('GET', `/groups/${groupId}/coordinations/${coordId}/responses/me`),
  deleteMyResponses: (groupId: string, coordId: string) =>
    request<void>('DELETE', `/groups/${groupId}/coordinations/${coordId}/responses/me`),
};

export interface NotificationResponse {
  id: string;
  type: string;
  title: string;
  content: string;
  category?: string;
  targetType?: string;
  targetId?: string;
  targetUrl?: string;
  isImportant?: boolean;
  isRead: boolean;
  createdAt: string;
}

export const notificationApi = {
  getPage: (params?: { type?: string; isRead?: boolean } & PaginationParams) => {
    const query = new URLSearchParams();
    if (params?.type) query.set('type', params.type);
    if (params?.isRead !== undefined) query.set('isRead', String(params.isRead));
    return requestPage<NotificationResponse>(
      `/notifications${query.toString() ? `?${query.toString()}` : ''}`,
      params,
    );
  },
  getAll: (params?: { type?: string; isRead?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.type) query.set('type', params.type);
    if (params?.isRead !== undefined) query.set('isRead', String(params.isRead));
    return requestAllPages<NotificationResponse>(`/notifications${query.toString() ? `?${query.toString()}` : ''}`, 30);
  },
  markRead: (id: string) => request<void>('PATCH', `/notifications/${id}/read`),
  markAllRead: () => request<{ updatedCount: number }>('PATCH', '/notifications/read-all'),
  delete: (id: string) => request<void>('DELETE', `/notifications/${id}`),
};

export interface NotificationSettingsResponse {
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

export const settingsApi = {
  getNotifications: () => request<NotificationSettingsResponse>('GET', '/settings/notifications'),
  updateNotifications: (data: Partial<NotificationSettingsResponse>) =>
    request<NotificationSettingsResponse>('PATCH', '/settings/notifications', data),
};

export interface PushVapidPublicKeyResponse {
  enabled: boolean;
  publicKey?: string;
}

export interface PushSubscriptionRequest {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
}

export const pushApi = {
  getVapidPublicKey: () => request<PushVapidPublicKeyResponse>('GET', '/push/vapid-public-key'),
  saveSubscription: (data: PushSubscriptionRequest) =>
    request<PushVapidPublicKeyResponse>('POST', '/push/subscriptions', data),
  deleteSubscription: (data: PushSubscriptionRequest) =>
    request<void>('DELETE', '/push/subscriptions', data),
};

export interface ImageUploadResponse {
  imageId?: string;
  objectKey?: string;
  uploadKey?: string;
  publicKey?: string;
  thumbnailKey?: string;
  thumbnailUrl?: string;
  url?: string;
  status?: ImageStatus;
  failureReason?: string;
}

export interface PresignImageUploadRequest {
  purpose: ImagePurpose;
  fileName: string;
  contentType: string;
  contentLength: number;
  targetId?: string;
}

export interface PresignImageUploadResponse {
  imageId: string;
  uploadKey: string;
  uploadUrl: string;
  method: 'PUT';
  headers: Record<string, string>;
  maxSizeBytes: number;
  status: ImageStatus;
}

export const storageApi = {
  createImageUpload: (data: PresignImageUploadRequest) =>
    request<PresignImageUploadResponse>('POST', '/storage/images/presign', data),
  getImageUpload: (imageId: string) => request<ImageUploadResponse>('GET', `/storage/images/${imageId}`),
  uploadToPresignedUrl: async (uploadUrl: string, file: Blob, headers: Record<string, string>) => {
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers,
      body: file,
    });

    if (!res.ok) {
      throw new ApiError(res.status, `이미지 업로드에 실패했습니다 (${res.status})`);
    }
  },
};

export interface ExtractScheduleResponse {
  title: string;
  content: string;
  category: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  duration: number;
  isImportant: boolean;
}

export const aiApi = {
  extractSchedule: async (imageBase64: string): Promise<ExtractScheduleResponse> => {
    const res = await fetch(`${env.aiApiBaseUrl}/extract-schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64 }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiError(res.status, err?.detail || `AI API Error ${res.status}`);
    }
    return res.json();
  },
};
