import { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Home: undefined;
  Calendar: undefined;
  Groups: undefined;
  MyPage: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  OAuthCallback: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  ScheduleForm: { groupId?: string; groupName?: string } | undefined;
  GroupForm: undefined;
  GroupDetail: { id: string };
  GroupJoin: { inviteCode: string };
  TimeCoordination: { groupId: string };
  CoordinationTimetable: { groupId: string; coordId: string };
  Notifications: undefined;
};
