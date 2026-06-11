import crypto from 'k6/crypto';
import encoding from 'k6/encoding';
import http from 'k6/http';
import { check, group, sleep } from 'k6';

const API_BASE = (__ENV.TIMELINK_API_BASE || 'https://timelink.cloud/api/planner/v1').replace(/\/+$/, '');
const JWT_SECRET = __ENV.TIMELINK_JWT_SECRET;
const RUN_ID = __ENV.TIMELINK_RUN_ID || `tl-load-${Date.now()}`;
const USER_COUNT = Number(__ENV.TIMELINK_USER_COUNT || 12);
const LOAD_PROFILE = __ENV.TIMELINK_LOAD_PROFILE || 'baseline';
const DATE_BASE = new Date(Date.now() + 24 * 60 * 60 * 1000);

if (!JWT_SECRET) {
  throw new Error('TIMELINK_JWT_SECRET is required');
}

const profiles = {
  smoke: {
    scenarios: {
      home_read: { executor: 'constant-vus', exec: 'homeRead', vus: 1, duration: '30s' },
      group_read: { executor: 'constant-vus', exec: 'groupRead', vus: 1, duration: '30s' },
    },
  },
  baseline: {
    scenarios: {
      home_read: { executor: 'constant-vus', exec: 'homeRead', vus: 4, duration: '2m' },
      group_read: { executor: 'constant-vus', exec: 'groupRead', vus: 3, duration: '2m' },
      coordination_read: { executor: 'constant-vus', exec: 'coordinationRead', vus: 1, duration: '2m' },
      schedule_write: { executor: 'constant-vus', exec: 'scheduleWrite', vus: 1, duration: '2m' },
      notification_toggle: { executor: 'constant-vus', exec: 'notificationToggle', vus: 1, duration: '45s' },
    },
  },
  quota_probe: {
    scenarios: {
      home_read: { executor: 'constant-vus', exec: 'homeRead', vus: 8, duration: '45s' },
      group_read: { executor: 'constant-vus', exec: 'groupRead', vus: 5, duration: '45s' },
      coordination_read: { executor: 'constant-vus', exec: 'coordinationRead', vus: 3, duration: '45s' },
    },
  },
};

export const options = {
  ...(profiles[LOAD_PROFILE] || profiles.baseline),
  setupTimeout: '180s',
  teardownTimeout: '60s',
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

function b64url(value) {
  return encoding.b64encode(value, 'rawurl');
}

function jwtFor(userId) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ sub: userId, iat: now, exp: now + 6 * 60 * 60 }));
  const unsigned = `${header}.${payload}`;
  const signature = crypto.hmac('sha256', JWT_SECRET, unsigned, 'base64url').replace(/=+$/g, '');
  return `${unsigned}.${signature}`;
}

function authHeaders(user) {
  return {
    headers: {
      Authorization: `Bearer ${user.token}`,
      'Content-Type': 'application/json',
    },
  };
}

function api(user, method, path, body) {
  const params = authHeaders(user);
  const url = `${API_BASE}${path}`;
  const payload = body === undefined ? undefined : JSON.stringify(body);
  const res = http.request(method, url, payload, params);
  check(res, {
    [`${method} ${path} < 500`]: (r) => r.status < 500,
    [`${method} ${path} auth ok`]: (r) => r.status !== 401 && r.status !== 403,
    [`${method} ${path} ok`]: (r) => r.status >= 200 && r.status < 400,
  });
  return res;
}

function apiOk(user, method, path, body) {
  const res = api(user, method, path, body);
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`${method} ${path} failed with ${res.status}: ${String(res.body).slice(0, 200)}`);
  }
  return res;
}

function retryApiOk(user, method, path, body, attempts = 8) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return apiOk(user, method, path, body);
    } catch (error) {
      lastError = error;
      sleep(Math.min(0.5 * attempt, 3));
    }
  }
  throw lastError;
}

function jsonData(res) {
  try {
    return res.json('data');
  } catch (_) {
    return null;
  }
}

function isoDay(offsetDays, hour = 10) {
  const d = new Date(DATE_BASE.getTime());
  d.setUTCDate(d.getUTCDate() + offsetDays);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

function localDate(offsetDays) {
  return isoDay(offsetDays, 0).slice(0, 10);
}

function setupUser(user) {
  apiOk(user, 'GET', '/auth/me');
  apiOk(user, 'POST', '/profiles/me/consents/required');
  apiOk(user, 'PATCH', '/profiles/me', {
    nickname: `부하테스트 ${user.index}`,
    avatarUrl: `https://timelink.cloud/uploads/load-test/${RUN_ID}-${user.index}.png`,
  });
}

function createSchedule(user, index, hasAlarm = false) {
  return apiOk(user, 'POST', '/schedules', {
    title: `${RUN_ID} 개인 일정 ${user.index}-${index}`,
    content: `${RUN_ID} load schedule`,
    category: index % 2 === 0 ? 'appointment' : 'task',
    startTime: isoDay(index % 5, 9 + (index % 8)),
    duration: 1,
    hasAlarm,
    isImportant: index % 3 === 0,
  });
}

export function setup() {
  const users = Array.from({ length: USER_COUNT }, (_, i) => {
    const userId = `${RUN_ID}-u${String(i + 1).padStart(2, '0')}`;
    return { userId, token: jwtFor(userId), index: i + 1 };
  });

  users.forEach(setupUser);
  users.forEach((user) => {
    for (let i = 0; i < 3; i += 1) {
      createSchedule(user, i, false);
    }
  });

  createSchedule(users[0], 99, true);

  const groupRes = apiOk(users[0], 'POST', '/groups', {
    name: `${RUN_ID} 성능 그룹`,
    description: `${RUN_ID} cleanup target`,
  });
  const createdGroup = jsonData(groupRes);
  const groupId = createdGroup && createdGroup.id;
  const inviteCode = createdGroup && createdGroup.inviteCode;

  if (!groupId || !inviteCode) {
    throw new Error('failed to create load-test group');
  }

  users.slice(1).forEach((user) => {
    retryApiOk(user, 'POST', '/groups/join', { inviteCode });
  });

  const coordinationRes = apiOk(users[0], 'POST', `/groups/${groupId}/coordinations`, {
    title: `${RUN_ID} 조율`,
    mode: 'once',
    dates: [localDate(0), localDate(1), localDate(2), localDate(3), localDate(4)],
    startHour: 9,
    endHour: 18,
  });
  const coordination = jsonData(coordinationRes);
  const coordinationId = coordination && coordination.id;
  if (!coordinationId) {
    throw new Error('failed to create load-test coordination');
  }

  users.forEach((user, idx) => {
    const slots = [
      { date: localDate(0), hour: 9 },
      { date: localDate(0), hour: 10 },
      { date: localDate(1), hour: 13 + (idx % 2) },
      { date: localDate(2), hour: 15 },
    ];
    retryApiOk(user, 'PUT', `/groups/${groupId}/coordinations/${coordinationId}/responses/me`, { slots });
  });

  return { runId: RUN_ID, users, groupId, coordinationId };
}

function userFor(data) {
  return data.users[(__VU - 1) % data.users.length];
}

export function homeRead(data) {
  const user = userFor(data);
  group('home read', () => {
    api(user, 'GET', '/auth/me');
    api(user, 'GET', `/schedules?startDate=${encodeURIComponent(isoDay(-7, 0))}&endDate=${encodeURIComponent(isoDay(45, 23))}&limit=50`);
    api(user, 'GET', '/settings/notifications');
  });
  sleep(1);
}

export function groupRead(data) {
  const user = userFor(data);
  group('group read', () => {
    api(user, 'GET', '/groups?limit=20');
    api(user, 'GET', `/groups/${data.groupId}`);
    api(user, 'GET', `/groups/${data.groupId}/members`);
    api(user, 'GET', `/groups/${data.groupId}/coordinations?status=active&limit=10`);
  });
  sleep(1.2);
}

export function coordinationRead(data) {
  const user = userFor(data);
  group('coordination read', () => {
    api(user, 'GET', `/groups/${data.groupId}/coordinations/${data.coordinationId}`);
    api(user, 'GET', `/groups/${data.groupId}/coordinations/${data.coordinationId}/responses/me`);
  });
  sleep(1);
}

export function scheduleWrite(data) {
  const user = userFor(data);
  const res = api(user, 'POST', '/schedules', {
    title: `${RUN_ID} 쓰기 일정 ${__VU}-${__ITER}`,
    content: `${RUN_ID} write path`,
    category: 'task',
    startTime: isoDay((__ITER % 10) + 1, 12),
    duration: 1,
    hasAlarm: false,
  });
  const schedule = jsonData(res);
  if (schedule && schedule.id) {
    api(user, 'PATCH', `/schedules/${schedule.id}`, { isCompleted: true });
  }
  sleep(2);
}

export function notificationToggle(data) {
  const user = data.users[0];
  group('notification toggle', () => {
    api(user, 'PATCH', '/settings/notifications', {
      scheduleAlarm: true,
      remindSameDay: true,
      remindOneDayBefore: false,
      importantAlarm: false,
    });
    sleep(3);
    api(user, 'PATCH', '/settings/notifications', {
      scheduleAlarm: false,
      remindSameDay: false,
      remindOneDayBefore: false,
      importantAlarm: false,
    });
  });
  sleep(5);
}
