import { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Home: undefined;
  Calendar: undefined;
  Groups: undefined;
  Community: undefined;
  MyPage: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  OAuthCallback: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  ScheduleForm: { groupId?: string; groupName?: string } | undefined;
  GroupForm: undefined;
  GroupDetail: { id: string };
  GroupJoin: { inviteCode: string; coord?: string; redirect?: string };
  InviteRedirect: { inviteCode: string; coord?: string; redirect?: string };
  GroupIntro: { id: string };
  TimeCoordination: { groupId: string };
  CoordinationTimetable: { groupId: string; coordId: string };
  CommunityPostDetail: { postId: string; groupId?: string };
  Notifications: undefined;
};
