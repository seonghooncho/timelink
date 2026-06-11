import { clearStoredSession, getAccessToken } from '@/services/session';

const API_BASE = '/api/planner/v1';
const AI_BASE = '/api/ai/v1';

export interface ApiPageMeta {
  perPage: number;
  nextCursor?: string | null;
}

export interface ApiEnvelope<T> {
  data: T;
  meta?: ApiPageMeta;
}

export interface PaginationParams {
  cursor?: string | null;
  limit?: number;
}

function getAuthHeaders(contentType = 'application/json'): Record<string, string> {
  const token = getAccessToken();
  return {
    ...(contentType ? { 'Content-Type': contentType } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(method: string, path: string, body?: unknown, requiresAuth = true): Promise<T> {
  const envelope = await requestEnvelope<T>(method, path, body, requiresAuth);
  return envelope.data;
}

async function requestEnvelope<T>(
  method: string,
  path: string,
  body?: unknown,
  requiresAuth = true,
): Promise<ApiEnvelope<T>> {
  const headers = requiresAuth ? getAuthHeaders() : { 'Content-Type': 'application/json' };
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (res.status === 204) return { data: undefined as T };

  const json = await res.json();
  if (!res.ok) {
    if (res.status === 401) {
      clearStoredSession();
    }
    throw new Error(json?.error?.message || `API Error ${res.status}`);
  }
  return {
    data: json.data as T,
    meta: json.meta as ApiPageMeta | undefined,
  };
}

async function uploadFile<T>(path: string, file: File): Promise<T> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: getAuthHeaders(''),
    body: formData,
  });

  const json = await res.json();
  if (!res.ok) {
    if (res.status === 401) {
      clearStoredSession();
    }
    throw new Error(json?.error?.message || `API Error ${res.status}`);
  }

  return json.data as T;
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

async function requestPage<T>(path: string, pagination?: PaginationParams, requiresAuth = true): Promise<ApiEnvelope<T[]>> {
  return requestEnvelope<T[]>('GET', withPagination(path, pagination), undefined, requiresAuth);
}

// ── Auth ──

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
    return `${API_BASE}/auth/oauth/${provider}/start?${params.toString()}`;
  },
};

// ── Schedules ──

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
    const qs = query.toString();
    return requestPage<ScheduleResponse>(`/schedules${qs ? `?${qs}` : ''}`, params);
  },
  getById: (id: string) => request<ScheduleResponse>('GET', `/schedules/${id}`),
  create: (data: ScheduleCreateRequest) => request<ScheduleResponse>('POST', '/schedules', data),
  update: (id: string, data: ScheduleUpdateRequest) => request<ScheduleResponse>('PATCH', `/schedules/${id}`, data),
  delete: (id: string) => request<void>('DELETE', `/schedules/${id}`),
};

// ── Profiles ──

export interface ProfileResponse {
  id: string;
  nickname: string;
  avatarUrl: string;
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
  updateMe: (data: { nickname?: string; avatarUrl?: string }) =>
    request<ProfileResponse>('PATCH', '/profiles/me', data),
  agreeRequiredConsents: () => request<ProfileResponse>('POST', '/profiles/me/consents/required'),
};

// ── Groups ──

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

// ── Coordinations ──

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
    const qs = query.toString();
    return requestPage<CoordinationResponse>(`/groups/${groupId}/coordinations${qs ? `?${qs}` : ''}`, params);
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

// ── Notifications ──

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
    const qs = query.toString();
    return requestPage<NotificationResponse>(`/notifications${qs ? `?${qs}` : ''}`, params);
  },
  markRead: (id: string) => request<void>('PATCH', `/notifications/${id}/read`),
  markAllRead: () => request<{ updatedCount: number }>('PATCH', '/notifications/read-all'),
  delete: (id: string) => request<void>('DELETE', `/notifications/${id}`),
};

// ── Notification Settings ──

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

export const settingsApi = {
  getNotifications: () => request<NotificationSettingsResponse>('GET', '/settings/notifications'),
  updateNotifications: (data: Partial<NotificationSettingsResponse>) =>
    request<NotificationSettingsResponse>('PATCH', '/settings/notifications', data),
};

// ── Push Notifications ──

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

// ── Storage ──

export interface ImageUploadResponse {
  objectKey: string;
  url: string;
}

export const storageApi = {
  uploadProfileImage: (file: File) => uploadFile<ImageUploadResponse>('/storage/images/profile', file),
  uploadGroupImage: (file: File) => uploadFile<ImageUploadResponse>('/storage/images/group', file),
};

// ── AI (FastAPI) ──

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
    const res = await fetch(`${AI_BASE}/extract-schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64 }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.detail || `AI API Error ${res.status}`);
    }
    return res.json();
  },
};
