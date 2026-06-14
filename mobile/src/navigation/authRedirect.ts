import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthSessionResponse } from '../services/api';
import { clearStoredSession } from '../services/session';
import type { MainTabParamList, RootStackParamList } from './types';

type RootNavigation = Pick<NativeStackNavigationProp<RootStackParamList>, 'reset'>;
type MainTabRoute = keyof MainTabParamList;

interface ParsedAuthCallback {
  accessToken: string;
  userId: string;
  redirect: string;
  error: string;
  message: string;
}

export function parseAuthCallbackUrl(url: string): ParsedAuthCallback {
  const hashIndex = url.indexOf('#');
  const searchIndex = url.indexOf('?');
  const hash = hashIndex >= 0 ? url.slice(hashIndex + 1) : '';
  const search = searchIndex >= 0
    ? url.slice(searchIndex + 1, hashIndex >= 0 ? hashIndex : undefined)
    : '';
  const params = new URLSearchParams(hash || search);

  return {
    accessToken: params.get('accessToken') || '',
    userId: params.get('userId') || '',
    redirect: params.get('redirect') || '/',
    error: params.get('error') || '',
    message: params.get('message') || '',
  };
}

export async function completeOAuthSession(
  url: string,
  completeSession: (session: AuthSessionResponse) => Promise<void>,
  navigation: RootNavigation,
) {
  const parsed = parseAuthCallbackUrl(url);
  if (parsed.error) {
    await clearStoredSession();
    throw new Error(parsed.message || '소셜 로그인에 실패했습니다');
  }

  if (!parsed.accessToken || !parsed.userId) {
    await clearStoredSession();
    throw new Error('로그인 결과를 확인할 수 없습니다');
  }

  await completeSession({
    accessToken: parsed.accessToken,
    userId: parsed.userId,
  });

  navigateAfterAuth(navigation, parsed.redirect);
}

export function navigateAfterAuth(navigation: RootNavigation, redirectPath: string) {
  const pathname = normalizePathname(redirectPath);

  const resetMainTabs = (screen?: MainTabRoute) => {
    navigation.reset({
      index: 0,
      routes: screen
        ? [{ name: 'MainTabs', params: { screen } }]
        : [{ name: 'MainTabs' }],
    });
  };

  const resetWithGroups = (route: RootStackResetRoute) => {
    navigation.reset({
      index: 1,
      routes: [
        { name: 'MainTabs', params: { screen: 'Groups' } },
        route,
      ],
    });
  };

  if (pathname === '/') {
    resetMainTabs();
    return;
  }

  if (pathname === '/calendar') {
    resetMainTabs('Calendar');
    return;
  }

  if (pathname === '/groups') {
    resetMainTabs('Groups');
    return;
  }

  if (pathname === '/community') {
    resetMainTabs('Community');
    return;
  }

  if (pathname === '/mypage') {
    resetMainTabs('MyPage');
    return;
  }

  if (pathname === '/notifications') {
    navigation.reset({
      index: 1,
      routes: [
        { name: 'MainTabs' },
        { name: 'Notifications' },
      ],
    });
    return;
  }

  if (pathname === '/schedule/new') {
    navigation.reset({
      index: 1,
      routes: [
        { name: 'MainTabs' },
        { name: 'ScheduleForm' },
      ],
    });
    return;
  }

  if (pathname === '/groups/new') {
    resetWithGroups({ name: 'GroupForm' });
    return;
  }

  const groupJoin = pathname.match(/^\/groups\/join\/([^/]+)$/);
  if (groupJoin) {
    resetWithGroups({
      name: 'GroupJoin',
      params: { inviteCode: decodeURIComponent(groupJoin[1]) },
    });
    return;
  }

  const timetable = pathname.match(/^\/groups\/([^/]+)\/coordination\/([^/]+)\/timetable$/);
  if (timetable) {
    resetWithGroups({
      name: 'CoordinationTimetable',
      params: {
        groupId: decodeURIComponent(timetable[1]),
        coordId: decodeURIComponent(timetable[2]),
      },
    });
    return;
  }

  const coordination = pathname.match(/^\/groups\/([^/]+)\/coordination$/);
  if (coordination) {
    resetWithGroups({
      name: 'TimeCoordination',
      params: { groupId: decodeURIComponent(coordination[1]) },
    });
    return;
  }

  const groupIntro = pathname.match(/^\/groups\/([^/]+)\/intro$/);
  if (groupIntro) {
    resetWithGroups({
      name: 'GroupIntro',
      params: { id: decodeURIComponent(groupIntro[1]) },
    });
    return;
  }

  const communityPost = pathname.match(/^\/community\/posts\/([^/]+)$/);
  if (communityPost) {
    navigation.reset({
      index: 1,
      routes: [
        { name: 'MainTabs', params: { screen: 'Community' } },
        { name: 'CommunityPostDetail', params: { postId: decodeURIComponent(communityPost[1]) } },
      ],
    });
    return;
  }

  const groupDetail = pathname.match(/^\/groups\/([^/]+)$/);
  if (groupDetail) {
    resetWithGroups({
      name: 'GroupDetail',
      params: { id: decodeURIComponent(groupDetail[1]) },
    });
    return;
  }

  resetMainTabs();
}

type RootStackResetRoute =
  | { name: 'GroupForm' }
  | { name: 'Notifications' }
  | { name: 'ScheduleForm' }
  | { name: 'GroupJoin'; params: RootStackParamList['GroupJoin'] }
  | { name: 'GroupDetail'; params: RootStackParamList['GroupDetail'] }
  | { name: 'GroupIntro'; params: RootStackParamList['GroupIntro'] }
  | { name: 'TimeCoordination'; params: RootStackParamList['TimeCoordination'] }
  | { name: 'CoordinationTimetable'; params: RootStackParamList['CoordinationTimetable'] };

function normalizePathname(redirectPath: string) {
  if (!redirectPath || !redirectPath.startsWith('/')) {
    return '/';
  }

  const parsed = new URL(redirectPath, 'https://timelink.cloud');
  const pathname = parsed.pathname || '/';
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}
