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

export type ImagePurpose = 'MEMBER' | 'GROUP' | 'SCHEDULE';
export type ImageStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface ScheduleResponse {
  id: string;
  title: string;
  content: string;
  category: string;
  isImportant: boolean;
  startTime: string;
  endTime?: string;
  duration: number;
  isCompleted: boolean;
  hasAlarm: boolean;
  groupId?: string;
  imageUrl?: string;
  imageId?: string;
  imageStatus?: ImageStatus;
  createdAt: string;
  updatedAt: string;
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
};

export interface ProfileResponse {
  id: string;
  nickname: string;
  avatarUrl: string;
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
  imageId?: string;
  imageStatus?: ImageStatus;
  inviteCode: string;
  memberCount: number;
  myRole: string;
  createdAt: string;
}

export interface GroupMemberResponse {
  id: string;
  userId: string;
  role: string;
  nickname: string;
  avatarUrl?: string;
  joinedAt: string;
}

export interface GroupDetailResponse {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  imageId?: string;
  imageStatus?: ImageStatus;
  inviteCode: string;
  createdBy: string;
  members: GroupMemberResponse[];
  createdAt: string;
}

export const groupApi = {
  getPage: (params?: PaginationParams) => requestPage<GroupListResponse>('/groups', params),
  getAll: () => requestAllPages<GroupListResponse>('/groups', 20),
  getById: (id: string) => request<GroupDetailResponse>('GET', `/groups/${id}`),
  create: (data: { name: string; description?: string; imageUrl?: string; imageId?: string }) =>
    request<GroupDetailResponse>('POST', '/groups', data),
  update: (id: string, data: { name?: string; description?: string; imageUrl?: string; imageId?: string }) =>
    request<GroupDetailResponse>('PATCH', `/groups/${id}`, data),
  delete: (id: string) => request<void>('DELETE', `/groups/${id}`),
  join: (inviteCode: string) => request<GroupDetailResponse>('POST', '/groups/join', { inviteCode }),
  getMembers: (groupId: string) => request<GroupMemberResponse[]>('GET', `/groups/${groupId}/members`),
  leaveGroup: (groupId: string) => request<void>('DELETE', `/groups/${groupId}/members/me`),
  removeMember: (groupId: string, memberUserId: string) =>
    request<void>('DELETE', `/groups/${groupId}/members/${encodeURIComponent(memberUserId)}`),
};

export interface CoordinationResponse {
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

export interface CoordinationDetailResponse {
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
  create: (groupId: string, data: { title: string; mode: string; dates: string[]; startHour: number; endHour: number }) =>
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
