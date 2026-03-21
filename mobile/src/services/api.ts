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

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface UploadFileAsset {
  uri: string;
  name: string;
  type: string;
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

function withCursor(path: string, cursor?: string | null) {
  const [pathname, search = ''] = path.split('?');
  const params = new URLSearchParams(search);

  if (cursor) {
    params.set('cursor', cursor);
  } else {
    params.delete('cursor');
  }

  const qs = params.toString();
  return `${pathname}${qs ? `?${qs}` : ''}`;
}

async function requestAllPages<T>(path: string) {
  const items: T[] = [];
  let cursor: string | null | undefined;
  const seen = new Set<string>();

  while (true) {
    const response = await requestEnvelope<T[]>('GET', env.plannerApiBaseUrl, withCursor(path, cursor));
    items.push(...response.data);
    const nextCursor = response.meta?.nextCursor;
    if (!nextCursor || seen.has(nextCursor)) {
      break;
    }
    seen.add(nextCursor);
    cursor = nextCursor;
  }

  return items;
}

async function uploadFile<T>(path: string, file: UploadFileAsset) {
  const formData = new FormData();
  formData.append('file', file as unknown as Blob);

  const res = await fetch(`${env.plannerApiBaseUrl}${path}`, {
    method: 'POST',
    headers: await getAuthHeaders(''),
    body: formData,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      await clearStoredSession();
    }
    throw new ApiError(res.status, json?.error?.message || `API Error ${res.status}`);
  }

  return json.data as T;
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

export interface ScheduleResponse {
  id: string;
  title: string;
  content: string;
  category: string;
  isImportant: boolean;
  startTime: string;
  endTime: string;
  duration: number;
  isCompleted: boolean;
  hasAlarm: boolean;
  groupId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleCreateRequest {
  title: string;
  content?: string;
  category: string;
  isImportant?: boolean;
  startTime: string;
  endTime: string;
  duration?: number;
  hasAlarm?: boolean;
  groupId?: string;
}

export interface ScheduleUpdateRequest {
  title?: string;
  content?: string;
  category?: string;
  isImportant?: boolean;
  startTime?: string;
  endTime?: string;
  duration?: number;
  isCompleted?: boolean;
  hasAlarm?: boolean;
}

export interface ProfileResponse {
  id: string;
  nickname: string;
  avatarUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupListResponse {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
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
  inviteCode: string;
  createdBy: string;
  members: GroupMemberResponse[];
  createdAt: string;
}

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

export interface NotificationSettingsResponse {
  scheduleAlarm: boolean;
  groupAlarm: boolean;
  remindOneDayBefore: boolean;
  remindOneDayBeforeTime: string;
  remindSameDay: boolean;
  remindSameDayTime: string;
  importantAlarm: boolean;
  importantAlarmTime: string;
}

export interface ImageUploadResponse {
  objectKey: string;
  url: string;
}

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

export const scheduleApi = {
  getAll: (params?: { startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams();
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    const qs = query.toString();
    return requestAllPages<ScheduleResponse>(`/schedules${qs ? `?${qs}` : ''}`);
  },
  getById: (id: string) => request<ScheduleResponse>('GET', `/schedules/${id}`),
  create: (data: ScheduleCreateRequest) => request<ScheduleResponse>('POST', '/schedules', data),
  update: (id: string, data: ScheduleUpdateRequest) => request<ScheduleResponse>('PATCH', `/schedules/${id}`, data),
  delete: (id: string) => request<void>('DELETE', `/schedules/${id}`),
};

export const profileApi = {
  getMe: () => request<ProfileResponse>('GET', '/profiles/me'),
  updateMe: (data: { nickname?: string; avatarUrl?: string }) =>
    request<ProfileResponse>('PATCH', '/profiles/me', data),
};

export const groupApi = {
  getAll: () => request<GroupListResponse[]>('GET', '/groups'),
  getById: (id: string) => request<GroupDetailResponse>('GET', `/groups/${id}`),
  create: (data: { name: string; description?: string; imageUrl?: string }) =>
    request<GroupDetailResponse>('POST', '/groups', data),
  update: (id: string, data: { name?: string; description?: string; imageUrl?: string }) =>
    request<GroupDetailResponse>('PATCH', `/groups/${id}`, data),
  delete: (id: string) => request<void>('DELETE', `/groups/${id}`),
  join: (inviteCode: string) => request<GroupDetailResponse>('POST', '/groups/join', { inviteCode }),
  getMembers: (groupId: string) => request<GroupMemberResponse[]>('GET', `/groups/${groupId}/members`),
  leaveGroup: (groupId: string) => request<void>('DELETE', `/groups/${groupId}/members/me`),
};

export const coordinationApi = {
  getAll: (groupId: string, status?: string) => {
    const qs = status ? `?status=${status}` : '';
    return requestAllPages<CoordinationResponse>(`/groups/${groupId}/coordinations${qs}`);
  },
  getById: (groupId: string, coordId: string) =>
    request<CoordinationDetailResponse>('GET', `/groups/${groupId}/coordinations/${coordId}`),
  create: (groupId: string, data: { title: string; mode: string; dates: string[]; startHour: number; endHour: number }) =>
    request<CoordinationResponse>('POST', `/groups/${groupId}/coordinations`, data),
  submitResponses: (groupId: string, coordId: string, slots: SlotEntry[]) =>
    request<{ submittedCount: number }>('PUT', `/groups/${groupId}/coordinations/${coordId}/responses/me`, { slots }),
  deleteMyResponses: (groupId: string, coordId: string) =>
    request<void>('DELETE', `/groups/${groupId}/coordinations/${coordId}/responses/me`),
};

export const notificationApi = {
  getAll: (params?: { type?: string; isRead?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.type) query.set('type', params.type);
    if (params?.isRead !== undefined) query.set('isRead', String(params.isRead));
    const qs = query.toString();
    return requestAllPages<NotificationResponse>(`/notifications${qs ? `?${qs}` : ''}`);
  },
  markRead: (id: string) => request<void>('PATCH', `/notifications/${id}/read`),
  markAllRead: () => request<{ updatedCount: number }>('PATCH', '/notifications/read-all'),
  delete: (id: string) => request<void>('DELETE', `/notifications/${id}`),
};

export const settingsApi = {
  getNotifications: () => request<NotificationSettingsResponse>('GET', '/settings/notifications'),
  updateNotifications: (data: Partial<NotificationSettingsResponse>) =>
    request<NotificationSettingsResponse>('PATCH', '/settings/notifications', data),
};

export const storageApi = {
  uploadProfileImage: (file: UploadFileAsset) => uploadFile<ImageUploadResponse>('/storage/images/profile', file),
  uploadGroupImage: (file: UploadFileAsset) => uploadFile<ImageUploadResponse>('/storage/images/group', file),
};

export const aiApi = {
  extractSchedule: async (imageBase64: string) => {
    const res = await fetch(`${env.aiApiBaseUrl}/extract-schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64 }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.detail || `AI API Error ${res.status}`);
    }
    return res.json() as Promise<ExtractScheduleResponse>;
  },
};
