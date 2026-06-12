import type { LinkingOptions } from '@react-navigation/native';
import { env } from '../config/env';
import type { RootStackParamList } from './types';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: Array.from(new Set([
    env.mobileAppOrigin,
    'timelink://',
    env.webAppOrigin,
    'https://www.timelink.cloud',
  ])),
  config: {
    screens: {
      Login: 'login',
      OAuthCallback: 'auth/callback',
      MainTabs: {
        screens: {
          Home: '',
          Calendar: 'calendar',
          Groups: 'groups',
          MyPage: 'mypage',
        },
      },
      ScheduleForm: 'schedule/new',
      GroupForm: 'groups/new',
      GroupDetail: 'groups/:id',
      GroupJoin: 'groups/join/:inviteCode',
      TimeCoordination: 'groups/:groupId/coordination',
      CoordinationTimetable: 'groups/:groupId/coordination/:coordId/timetable',
      Notifications: 'notifications',
    },
  },
};
