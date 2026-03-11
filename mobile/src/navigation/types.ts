export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  ScheduleForm: { groupId?: string; groupName?: string } | undefined;
  GroupForm: undefined;
  GroupDetail: { id: string };
  GroupJoin: { inviteCode: string };
  TimeCoordination: { groupId: string };
  CoordinationTimetable: { groupId: string; coordId: string };
  Notifications: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Calendar: undefined;
  Groups: undefined;
  MyPage: undefined;
};
