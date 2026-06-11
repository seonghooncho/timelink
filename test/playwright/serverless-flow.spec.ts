import crypto from 'node:crypto';
import { expect, request, test, type APIRequestContext, type Page } from '@playwright/test';

const APP_BASE = process.env.TIMELINK_APP_BASE || 'https://timelink.cloud';
const API_BASE = `${process.env.TIMELINK_API_BASE || `${APP_BASE}/api/planner/v1`}/`.replace(/\/+$/, '/');
const JWT_SECRET = process.env.TIMELINK_JWT_SECRET;
const RUN_ID = process.env.TIMELINK_RUN_ID || `tl-load-pw-${Date.now()}`;

if (!JWT_SECRET) {
  throw new Error('TIMELINK_JWT_SECRET is required');
}

interface TestUser {
  userId: string;
  token: string;
  nickname: string;
}

function tokenFor(userId: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: userId, iat: now, exp: now + 6 * 60 * 60 })).toString('base64url');
  const unsigned = `${header}.${payload}`;
  const signature = crypto.createHmac('sha256', JWT_SECRET!).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

function makeUsers(count: number): TestUser[] {
  return Array.from({ length: count }, (_, index) => {
    const n = index + 1;
    const userId = `${RUN_ID}-pw-u${String(n).padStart(2, '0')}`;
    return {
      userId,
      token: tokenFor(userId),
      nickname: `테스트멤버 ${n}`,
    };
  });
}

async function apiAs(user: TestUser): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: API_BASE,
    extraHTTPHeaders: {
      Authorization: `Bearer ${user.token}`,
      'Content-Type': 'application/json',
    },
  });
}

async function okJson<T>(response: Awaited<ReturnType<APIRequestContext['get']>>): Promise<T> {
  expect(response.ok(), `${response.url()} ${response.status()}`).toBeTruthy();
  const body = await response.json();
  return body.data as T;
}

async function retryOkJson<T>(fn: () => Promise<Awaited<ReturnType<APIRequestContext['get']>>>, attempts = 5): Promise<T> {
  let lastResponse: Awaited<ReturnType<APIRequestContext['get']>> | null = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    lastResponse = await fn();
    if (lastResponse.ok()) {
      const body = await lastResponse.json();
      return body.data as T;
    }
    await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
  }

  return okJson<T>(lastResponse!);
}

function localDate(offsetDays: number) {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

async function prepareUser(user: TestUser) {
  const api = await apiAs(user);
  await okJson(await api.get('auth/me'));
  await okJson(await api.post('profiles/me/consents/required'));
  await okJson(await api.patch('profiles/me', {
    data: {
      nickname: user.nickname,
      avatarUrl: `https://timelink.cloud/uploads/load-test/${RUN_ID}-${user.userId}.png`,
    },
  }));
  await api.dispose();
}

async function loginPageAs(page: Page, user: TestUser) {
  await page.addInitScript(({ token, userId }) => {
    window.localStorage.setItem('planner.auth.session', JSON.stringify({ accessToken: token, userId }));
  }, { token: user.token, userId: user.userId });
}

async function dismissInstallNotice(page: Page) {
  const close = page.getByRole('button', { name: '설치 안내 닫기' });
  if (await close.isVisible().catch(() => false)) {
    await close.click();
  }
}

test.describe.serial('Timelink serverless flow', () => {
  test('group coordination flow keeps profile display and recommendation modal working', async ({ page }) => {
    const users = makeUsers(6);
    await Promise.all(users.map(prepareUser));

    const managerApi = await apiAs(users[0]);
    const groupData = await okJson<{ id: string; inviteCode: string }>(await managerApi.post('groups', {
      data: {
        name: `${RUN_ID} playwright group`,
        description: `${RUN_ID} cleanup target`,
      },
    }));

    for (const user of users.slice(1)) {
      const api = await apiAs(user);
      await retryOkJson(() => api.post('groups/join', { data: { inviteCode: groupData.inviteCode } }));
      await api.dispose();
    }

    const coordinationData = await okJson<{ id: string }>(await managerApi.post(`groups/${groupData.id}/coordinations`, {
      data: {
        title: `${RUN_ID} playwright coordination`,
        mode: 'once',
        dates: [localDate(0), localDate(1), localDate(2)],
        startHour: 9,
        endHour: 13,
      },
    }));

    for (const user of users) {
      const api = await apiAs(user);
      await okJson(await api.put(`groups/${groupData.id}/coordinations/${coordinationData.id}/responses/me`, {
        data: {
          slots: [
            { date: localDate(0), hour: 9 },
            { date: localDate(0), hour: 10 },
          ],
        },
      }));
      await api.dispose();
    }

    await loginPageAs(page, users[0]);
    await page.goto(`/groups/${groupData.id}/coordination/${coordinationData.id}/timetable`);
    await dismissInstallNotice(page);
    await expect(page.getByRole('button', { name: '모두 가능한 시간' })).toBeVisible();
    await page.getByRole('button', { name: '모두 가능한 시간' }).click();

    await expect(page.getByText('추천 시간')).toBeVisible();
    await expect(page.getByText('타임슬롯을 선택하면 투표 인원을 확인할 수 있어요.')).toBeVisible();
    await page.getByRole('button', { name: '확인' }).click();

    await page.getByRole('button', { name: '6' }).first().click();
    await expect(page.getByText('투표 인원')).toBeVisible();
    await expect(page.getByText(users[0].nickname)).toBeVisible();
    await expect(page.getByText(users[5].nickname)).toBeVisible();
    await expect(page.getByText(/pw-u\\d+/)).toHaveCount(0);

    await managerApi.dispose();
  });

  test('schedule reminder settings and Lambda-backed API stay consistent', async () => {
    const [user] = makeUsers(1);
    await prepareUser(user);
    const api = await apiAs(user);

    const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    future.setUTCHours(10, 0, 0, 0);

    await okJson(await api.post('schedules', {
      data: {
        title: `${RUN_ID} reminder schedule`,
        content: `${RUN_ID} serverless reminder path`,
        category: 'important',
        startTime: future.toISOString(),
        duration: 1,
        isImportant: true,
        hasAlarm: true,
      },
    }));

    const enabled = await okJson<{
      scheduleAlarm: boolean;
      remindSameDay: boolean;
    }>(await api.patch('settings/notifications', {
      data: {
        scheduleAlarm: true,
        remindSameDay: true,
        remindOneDayBefore: false,
        importantAlarm: false,
      },
    }));
    expect(enabled.scheduleAlarm).toBe(true);
    expect(enabled.remindSameDay).toBe(true);

    const disabled = await okJson<{
      scheduleAlarm: boolean;
      remindSameDay: boolean;
    }>(await api.patch('settings/notifications', {
      data: {
        scheduleAlarm: false,
        remindSameDay: false,
        remindOneDayBefore: false,
        importantAlarm: false,
      },
    }));
    expect(disabled.scheduleAlarm).toBe(false);
    expect(disabled.remindSameDay).toBe(false);

    await api.dispose();
  });
});
