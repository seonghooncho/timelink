import crypto from 'k6/crypto';
import encoding from 'k6/encoding';
import http from 'k6/http';
import { check, group, sleep } from 'k6';

const API_BASE = (__ENV.TIMELINK_API_BASE || 'https://timelink.cloud/api/planner/v1').replace(/\/+$/, '');
const JWT_SECRET = __ENV.TIMELINK_JWT_SECRET;
const RUN_ID = __ENV.TIMELINK_RUN_ID || `tl-load-${Date.now()}`;
const LOAD_PROFILE = __ENV.TIMELINK_LOAD_PROFILE || 'baseline_20vu';
const DATE_BASE = new Date(Date.now() + 24 * 60 * 60 * 1000);
const RUN_SHORT = RUN_ID.replace(/^tl-load-/, '').slice(-12);

if (!JWT_SECRET) {
  throw new Error('TIMELINK_JWT_SECRET is required');
}

const profileConfigs = {
  smoke_prod: {
    userCount: 6,
    schedulesPerUser: 2,
    communityPosts: 4,
    groupPosts: 4,
    groupSchedules: 1,
    coordinationCount: 1,
    responseUserLimit: 6,
    setupTimeout: '5m',
    scenarios: {
      home_read: { executor: 'constant-vus', exec: 'homeRead', vus: 1, duration: '30s' },
      group_read: { executor: 'constant-vus', exec: 'groupRead', vus: 1, duration: '30s' },
    },
  },
  baseline_20vu: {
    userCount: 24,
    schedulesPerUser: 3,
    communityPosts: 16,
    groupPosts: 16,
    groupSchedules: 3,
    coordinationCount: 2,
    responseUserLimit: 24,
    setupTimeout: '8m',
    scenarios: {
      mixed_traffic: { executor: 'constant-vus', exec: 'mixedTraffic', vus: 20, duration: '5m' },
    },
  },
  reserved_limit_50vu: {
    userCount: 60,
    schedulesPerUser: 3,
    communityPosts: 24,
    groupPosts: 24,
    groupSchedules: 4,
    coordinationCount: 2,
    responseUserLimit: 60,
    setupTimeout: '12m',
    scenarios: {
      reserved_limit: { executor: 'constant-vus', exec: 'mixedTraffic', vus: 50, duration: '5m' },
    },
  },
  probe_75vu_short: {
    userCount: 80,
    schedulesPerUser: 2,
    communityPosts: 24,
    groupPosts: 24,
    groupSchedules: 2,
    coordinationCount: 2,
    responseUserLimit: 80,
    setupTimeout: '14m',
    scenarios: {
      read_heavy_probe: { executor: 'constant-vus', exec: 'readHeavyTraffic', vus: 75, duration: '90s' },
    },
  },
  group_scale_read: {
    userCount: 50,
    schedulesPerUser: 2,
    communityPosts: 10,
    groupPosts: 100,
    groupSchedules: 8,
    coordinationCount: 5,
    responseUserLimit: 50,
    setupTimeout: '15m',
    scenarios: {
      group_scale_read: { executor: 'constant-vus', exec: 'groupScaleRead', vus: 30, duration: '3m' },
    },
  },
  coordination_heatmap_scale: {
    userCount: 50,
    schedulesPerUser: 2,
    communityPosts: 8,
    groupPosts: 8,
    groupSchedules: 1,
    coordinationCount: 1,
    coordinationDays: 5,
    coordinationStartHour: 9,
    coordinationEndHour: 19,
    responseUserLimit: 50,
    setupTimeout: '12m',
    scenarios: {
      coordination_heatmap: { executor: 'constant-vus', exec: 'coordinationHeatmapScale', vus: 30, duration: '3m' },
    },
  },
  community_group_post_mix: {
    userCount: 40,
    schedulesPerUser: 1,
    communityPosts: 80,
    groupPosts: 80,
    commentsPerPostSeed: 1,
    groupSchedules: 1,
    coordinationCount: 1,
    responseUserLimit: 40,
    setupTimeout: '14m',
    scenarios: {
      post_mix: { executor: 'constant-vus', exec: 'communityGroupPostMix', vus: 25, duration: '3m' },
    },
  },
  write_burst_schedule_notification: {
    userCount: 30,
    schedulesPerUser: 1,
    communityPosts: 4,
    groupPosts: 4,
    groupSchedules: 1,
    coordinationCount: 1,
    responseUserLimit: 30,
    setupTimeout: '8m',
    scenarios: {
      write_burst: { executor: 'constant-vus', exec: 'writeBurstScheduleNotification', vus: 20, duration: '3m' },
    },
  },
  boundary_contract_smoke: {
    userCount: 12,
    schedulesPerUser: 2,
    communityPosts: 12,
    groupPosts: 12,
    groupSchedules: 3,
    coordinationCount: 1,
    responseUserLimit: 12,
    commentsPerPostSeed: 1,
    setupTimeout: '8m',
    scenarios: {
      boundary_contract: { executor: 'constant-vus', exec: 'boundaryContractSmoke', vus: 4, duration: '1m' },
    },
  },
};

profileConfigs.smoke = profileConfigs.smoke_prod;
profileConfigs.baseline = profileConfigs.baseline_20vu;
profileConfigs.quota_probe = profileConfigs.probe_75vu_short;

const profileConfig = profileConfigs[LOAD_PROFILE] || profileConfigs.baseline_20vu;
const USER_COUNT = Number(__ENV.TIMELINK_USER_COUNT || profileConfig.userCount);

export const options = {
  scenarios: profileConfig.scenarios,
  setupTimeout: profileConfig.setupTimeout || '10m',
  teardownTimeout: '90s',
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
    throw new Error(`${method} ${path} failed with ${res.status}: ${String(res.body).slice(0, 300)}`);
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
      sleep(Math.min(0.4 * attempt, 3));
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

function isoDay(offsetDays, hour = 10, minute = 0) {
  const d = new Date(DATE_BASE.getTime());
  d.setUTCDate(d.getUTCDate() + offsetDays);
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
}

function localDate(offsetDays) {
  return isoDay(offsetDays, 0).slice(0, 10);
}

function qs(params) {
  const pairs = [];
  Object.keys(params).forEach((key) => {
    if (params[key] !== undefined && params[key] !== null) {
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`);
    }
  });
  return pairs.length > 0 ? `?${pairs.join('&')}` : '';
}

function pick(values, offset = 0) {
  if (!values || values.length === 0) return null;
  return values[(__VU + __ITER + offset) % values.length];
}

function clampText(value, max) {
  return String(value).length <= max ? String(value) : String(value).slice(0, max);
}

function loadTitle(prefix, index, max = 40) {
  return clampText(`${prefix} ${RUN_SHORT} ${index}`, max);
}

function setupUser(user) {
  apiOk(user, 'GET', '/auth/me');
  apiOk(user, 'POST', '/profiles/me/consents/required');
  apiOk(user, 'PATCH', '/profiles/me', {
    nickname: `부하테스트 ${user.index}`,
    avatarUrl: `https://timelink.cloud/uploads/load-test/${RUN_ID}-${user.index}.png`,
  });
}

function createSchedule(user, index, hasAlarm = false, groupId = null, participantUserIds = null) {
  const body = {
    title: loadTitle('부하 일정', `${user.index}-${index}`),
    content: `${RUN_ID} load schedule`,
    category: groupId ? 'group' : (index % 2 === 0 ? 'appointment' : 'task'),
    startTime: isoDay((index % 10) + 1, 9 + (index % 8)),
    duration: index % 3 === 0 ? 1.5 : 1,
    hasAlarm,
    isImportant: index % 3 === 0,
  };
  if (groupId) {
    body.groupId = groupId;
    body.participantUserIds = participantUserIds;
  }
  return apiOk(user, 'POST', '/schedules', body);
}

function createGroup(user) {
  const res = apiOk(user, 'POST', '/groups', {
    name: loadTitle('부하 모임', '', 30).trim(),
    description: `${RUN_ID} cleanup target`,
    visibility: 'PUBLIC',
  });
  const groupData = jsonData(res);
  if (!groupData || !groupData.id || !groupData.inviteCode) {
    throw new Error('failed to create load-test group');
  }
  return groupData;
}

function createCoordination(user, groupId, index) {
  const dayCount = profileConfig.coordinationDays || 5;
  const dates = Array.from({ length: dayCount }, (_, day) => localDate(day));
  const res = apiOk(user, 'POST', `/groups/${groupId}/coordinations`, {
    title: loadTitle('부하 조율', index),
    description: `${RUN_ID} heatmap scale coordination ${index}`,
    mode: 'once',
    dates,
    startHour: profileConfig.coordinationStartHour || 9,
    endHour: profileConfig.coordinationEndHour || 18,
  });
  const coordination = jsonData(res);
  if (!coordination || !coordination.id) {
    throw new Error('failed to create load-test coordination');
  }
  return coordination.id;
}

function slotsForUser(userIndex) {
  const startHour = profileConfig.coordinationStartHour || 9;
  const endHour = profileConfig.coordinationEndHour || 18;
  const dayCount = profileConfig.coordinationDays || 5;
  const slots = [];

  for (let day = 0; day < dayCount; day += 1) {
    for (let hour = startHour; hour < endHour; hour += 1) {
      const denseOverlap = day === 0 && hour >= startHour + 1 && hour <= startHour + 4;
      const staggeredOverlap = (hour + day + userIndex) % 3 === 0;
      if (denseOverlap || staggeredOverlap) {
        slots.push({ date: localDate(day), hour });
      }
    }
  }
  return slots;
}

function createCommunityPost(user, index) {
  const res = apiOk(user, 'POST', '/community/posts', {
    title: loadTitle('커뮤니티 글', index),
    content: `${RUN_ID} community post body ${index}`,
    anonymous: index % 7 === 0,
  });
  const post = jsonData(res);
  return post && post.id;
}

function createGroupPost(user, groupId, index) {
  const res = apiOk(user, 'POST', `/groups/${groupId}/posts`, {
    title: loadTitle('모임 글', index),
    content: `${RUN_ID} group post body ${index}`,
    memberOnly: index % 5 === 0,
  });
  const post = jsonData(res);
  return post && post.id;
}

function seedComments(users, postIds, groupId, isGroupPost) {
  const commentsPerPost = profileConfig.commentsPerPostSeed || 0;
  if (commentsPerPost <= 0) return;

  postIds.forEach((postId, index) => {
    for (let i = 0; i < commentsPerPost; i += 1) {
      const user = users[(index + i) % users.length];
      const path = isGroupPost
        ? `/groups/${groupId}/posts/${postId}/comments`
        : `/community/posts/${postId}/comments`;
      retryApiOk(user, 'POST', path, { content: `${RUN_ID} 댓글 ${index}-${i}` }, 4);
    }
  });
}

export function setup() {
  const users = Array.from({ length: USER_COUNT }, (_, i) => {
    const userId = `${RUN_ID}-u${String(i + 1).padStart(3, '0')}`;
    return { userId, token: jwtFor(userId), index: i + 1 };
  });

  users.forEach(setupUser);

  const groupData = createGroup(users[0]);
  const groupId = groupData.id;
  const inviteCode = groupData.inviteCode;

  users.slice(1).forEach((user) => {
    retryApiOk(user, 'POST', '/groups/join', { inviteCode });
  });

  users.forEach((user) => {
    for (let i = 0; i < (profileConfig.schedulesPerUser || 0); i += 1) {
      createSchedule(user, i, false);
    }
  });

  const participantUserIds = users.slice(0, Math.min(users.length, 10)).map((user) => user.userId);
  for (let i = 0; i < (profileConfig.groupSchedules || 0); i += 1) {
    createSchedule(users[0], 100 + i, false, groupId, participantUserIds);
  }

  const coordinationIds = [];
  for (let i = 0; i < (profileConfig.coordinationCount || 1); i += 1) {
    coordinationIds.push(createCoordination(users[0], groupId, i + 1));
  }

  const responseUsers = users.slice(0, Math.min(users.length, profileConfig.responseUserLimit || users.length));
  coordinationIds.forEach((coordinationId) => {
    responseUsers.forEach((user) => {
      retryApiOk(user, 'PUT', `/groups/${groupId}/coordinations/${coordinationId}/responses/me`, {
        slots: slotsForUser(user.index),
      });
    });
  });

  const communityPostIds = [];
  for (let i = 0; i < (profileConfig.communityPosts || 0); i += 1) {
    const id = createCommunityPost(users[i % users.length], i + 1);
    if (id) communityPostIds.push(id);
  }

  const groupPostIds = [];
  for (let i = 0; i < (profileConfig.groupPosts || 0); i += 1) {
    const id = createGroupPost(users[i % users.length], groupId, i + 1);
    if (id) groupPostIds.push(id);
  }

  seedComments(users, communityPostIds.slice(0, 20), null, false);
  seedComments(users, groupPostIds.slice(0, 20), groupId, true);

  return {
    runId: RUN_ID,
    profile: LOAD_PROFILE,
    users,
    groupId,
    coordinationIds,
    coordinationId: coordinationIds[0],
    communityPostIds,
    groupPostIds,
  };
}

function userFor(data) {
  return data.users[(__VU - 1) % data.users.length];
}

export function homeRead(data) {
  const user = userFor(data);
  group('home read', () => {
    api(user, 'GET', '/auth/me');
    api(user, 'GET', `/schedules${qs({
      startDate: isoDay(-7, 0),
      endDate: isoDay(45, 23),
      limit: 50,
    })}`);
    api(user, 'GET', '/settings/notifications');
  });
  sleep(1);
}

export function groupRead(data) {
  const user = userFor(data);
  group('group read', () => {
    api(user, 'GET', '/groups?limit=20');
    api(user, 'GET', '/groups/public?limit=20');
    api(user, 'GET', `/groups/${data.groupId}`);
    api(user, 'GET', `/groups/${data.groupId}/intro`);
    api(user, 'GET', `/groups/${data.groupId}/members`);
    api(user, 'GET', `/groups/${data.groupId}/coordinations?status=active&limit=10`);
  });
  sleep(1.1);
}

export function coordinationRead(data) {
  const user = userFor(data);
  const coordinationId = pick(data.coordinationIds) || data.coordinationId;
  group('coordination read', () => {
    api(user, 'GET', `/groups/${data.groupId}/coordinations/${coordinationId}`);
    api(user, 'GET', `/groups/${data.groupId}/coordinations/${coordinationId}/responses/me`);
  });
  sleep(0.9);
}

export function scheduleWrite(data) {
  const user = userFor(data);
  const res = api(user, 'POST', '/schedules', {
    title: loadTitle('쓰기 일정', `${__VU}-${__ITER}`),
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
  sleep(1.8);
}

export function notificationToggle(data) {
  const user = data.users[(__VU - 1) % Math.min(data.users.length, 5)];
  group('notification toggle', () => {
    api(user, 'PATCH', '/settings/notifications', {
      scheduleAlarm: true,
      remindSameDay: true,
      remindOneDayBefore: false,
      importantAlarm: false,
      pushAlarm: false,
    });
    sleep(1);
    api(user, 'PATCH', '/settings/notifications', {
      scheduleAlarm: false,
      remindSameDay: false,
      remindOneDayBefore: false,
      importantAlarm: false,
      pushAlarm: false,
    });
  });
  sleep(3);
}

export function communityGroupPostRead(data) {
  const user = userFor(data);
  const communityPostId = pick(data.communityPostIds);
  const groupPostId = pick(data.groupPostIds, 3);
  group('community and group post read', () => {
    api(user, 'GET', '/community/posts?limit=20');
    if (communityPostId) {
      api(user, 'GET', `/community/posts/${communityPostId}`);
      api(user, 'GET', `/community/posts/${communityPostId}/comments?limit=20`);
    }
    api(user, 'GET', `/groups/${data.groupId}/posts?limit=20`);
    if (groupPostId) {
      api(user, 'GET', `/groups/${data.groupId}/posts/${groupPostId}`);
      api(user, 'GET', `/groups/${data.groupId}/posts/${groupPostId}/comments?limit=20`);
    }
  });
  sleep(1);
}

export function mixedTraffic(data) {
  const bucket = (__ITER + __VU) % 20;
  if (bucket < 7) {
    homeRead(data);
  } else if (bucket < 12) {
    groupRead(data);
  } else if (bucket < 16) {
    coordinationRead(data);
  } else if (bucket < 18) {
    communityGroupPostRead(data);
  } else if (bucket === 18) {
    scheduleWrite(data);
  } else {
    notificationToggle(data);
  }
}

export function readHeavyTraffic(data) {
  const bucket = (__ITER + __VU) % 10;
  if (bucket < 3) {
    homeRead(data);
  } else if (bucket < 6) {
    groupRead(data);
  } else if (bucket < 8) {
    coordinationRead(data);
  } else {
    communityGroupPostRead(data);
  }
}

export function groupScaleRead(data) {
  const user = userFor(data);
  const member = pick(data.users);
  group('group scale read', () => {
    api(user, 'GET', '/groups?limit=20');
    api(user, 'GET', `/groups/${data.groupId}`);
    api(user, 'GET', `/groups/${data.groupId}/intro`);
    api(user, 'GET', `/groups/${data.groupId}/intro/posts?limit=5`);
    api(user, 'GET', `/groups/${data.groupId}/notices`);
    api(user, 'GET', `/groups/${data.groupId}/members`);
    if (member) {
      api(user, 'GET', `/groups/${data.groupId}/members/${encodeURIComponent(member.userId)}/profile`);
    }
    api(user, 'GET', `/groups/${data.groupId}/posts?limit=20`);
    api(user, 'GET', `/groups/${data.groupId}/coordinations?status=active&limit=20`);
  });
  sleep(1);
}

export function coordinationHeatmapScale(data) {
  const user = userFor(data);
  const coordinationId = data.coordinationId;
  group('coordination heatmap scale', () => {
    api(user, 'GET', `/groups/${data.groupId}/coordinations/${coordinationId}`);
    api(user, 'GET', `/groups/${data.groupId}/coordinations/${coordinationId}/responses/me`);
    if ((__ITER + __VU) % 12 === 0) {
      api(user, 'PUT', `/groups/${data.groupId}/coordinations/${coordinationId}/responses/me`, {
        slots: slotsForUser(user.index + __ITER),
      });
    }
  });
  sleep(0.8);
}

export function communityGroupPostMix(data) {
  const user = userFor(data);
  const communityPostId = pick(data.communityPostIds);
  const groupPostId = pick(data.groupPostIds, 5);
  const bucket = (__ITER + __VU) % 20;

  group('community and group post mix', () => {
    if (bucket < 6) {
      api(user, 'GET', '/community/posts?limit=20');
      if (communityPostId) api(user, 'GET', `/community/posts/${communityPostId}`);
    } else if (bucket < 11) {
      api(user, 'GET', `/groups/${data.groupId}/posts?limit=20`);
      if (groupPostId) api(user, 'GET', `/groups/${data.groupId}/posts/${groupPostId}`);
    } else if (bucket < 14 && communityPostId) {
      api(user, 'GET', `/community/posts/${communityPostId}/comments?limit=20`);
      api(user, 'POST', `/community/posts/${communityPostId}/comments`, {
        content: `${RUN_ID} mix 댓글 ${__VU}-${__ITER}`,
      });
    } else if (bucket < 17 && groupPostId) {
      api(user, 'GET', `/groups/${data.groupId}/posts/${groupPostId}/comments?limit=20`);
      api(user, 'POST', `/groups/${data.groupId}/posts/${groupPostId}/comments`, {
        content: `${RUN_ID} mix 모임 댓글 ${__VU}-${__ITER}`,
      });
    } else if (bucket === 17 && communityPostId) {
      api(user, 'PUT', `/community/posts/${communityPostId}/like`);
    } else if (bucket === 18 && groupPostId) {
      api(user, 'PUT', `/groups/${data.groupId}/posts/${groupPostId}/like`);
    } else {
      api(user, 'POST', '/community/posts', {
        title: loadTitle('mix 글', `${__VU}-${__ITER}`),
        content: `${RUN_ID} mix write path`,
        anonymous: (__ITER + __VU) % 3 === 0,
      });
    }
  });
  sleep(1.2);
}

export function writeBurstScheduleNotification(data) {
  const user = userFor(data);
  const coordinationId = data.coordinationId;
  const bucket = (__ITER + __VU) % 10;

  group('write burst schedule notification', () => {
    if (bucket < 5) {
      const res = api(user, 'POST', '/schedules', {
        title: loadTitle('알림 일정', `${__VU}-${__ITER}`),
        content: `${RUN_ID} notification write burst`,
        category: bucket % 2 === 0 ? 'appointment' : 'task',
        startTime: isoDay((__ITER % 10) + 2, 10 + (bucket % 6)),
        duration: 1,
        hasAlarm: bucket % 2 === 0,
        isImportant: bucket % 3 === 0,
      });
      const schedule = jsonData(res);
      if (schedule && schedule.id && bucket % 2 === 1) {
        api(user, 'PATCH', `/schedules/${schedule.id}`, { isCompleted: true });
      }
    } else if (bucket < 7) {
      api(user, 'PATCH', '/settings/notifications', {
        scheduleAlarm: true,
        remindSameDay: true,
        remindOneDayBefore: bucket === 6,
        importantAlarm: false,
        pushAlarm: false,
      });
    } else if (bucket < 9) {
      api(user, 'PUT', `/groups/${data.groupId}/coordinations/${coordinationId}/responses/me`, {
        slots: slotsForUser(user.index + __ITER),
      });
    } else {
      api(user, 'POST', `/groups/${data.groupId}/posts`, {
        title: loadTitle('burst 모임 글', `${__VU}-${__ITER}`),
        content: `${RUN_ID} group notification-ish write path`,
        memberOnly: false,
      });
    }
  });
  sleep(1.4);
}

export function boundaryContractSmoke(data) {
  const user = userFor(data);
  const coordinationId = data.coordinationId;
  const communityPostId = pick(data.communityPostIds);
  const groupPostId = pick(data.groupPostIds, 2);

  group('boundary contract smoke', () => {
    api(user, 'GET', '/schedules?limit=0');
    api(user, 'GET', `/schedules${qs({
      startDate: isoDay(-1, 0),
      endDate: isoDay(30, 23),
      limit: 200,
    })}`);
    api(user, 'GET', '/groups?limit=-1');
    api(user, 'GET', `/groups/public${qs({ limit: 200, q: RUN_SHORT })}`);
    api(user, 'GET', `/groups/${data.groupId}/schedules${qs({
      startDate: isoDay(-1, 0),
      endDate: isoDay(30, 23),
      limit: 200,
    })}`);
    api(user, 'GET', `/groups/${data.groupId}/members`);
    api(user, 'GET', `/groups/${data.groupId}/coordinations?status=active&limit=200`);
    api(user, 'GET', `/groups/${data.groupId}/coordinations/${coordinationId}`);
    api(user, 'PUT', `/groups/${data.groupId}/coordinations/${coordinationId}/responses/me`, {
      slots: [
        { date: localDate(0), hour: profileConfig.coordinationStartHour || 9 },
        { date: localDate(0), hour: profileConfig.coordinationStartHour || 9 },
      ],
    });
    api(user, 'GET', '/community/posts?limit=200');
    if (communityPostId) {
      api(user, 'GET', `/community/posts/${communityPostId}/comments?limit=200`);
    }
    api(user, 'GET', `/groups/${data.groupId}/posts?limit=200`);
    if (groupPostId) {
      api(user, 'GET', `/groups/${data.groupId}/posts/${groupPostId}/comments?limit=200`);
    }
  });
  sleep(1);
}
