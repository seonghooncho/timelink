import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CalendarDays, Home, User, Users } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../constants/theme';
import { MainTabParamList, RootStackParamList } from './types';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { OAuthCallbackScreen } from '../screens/auth/OAuthCallbackScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { CalendarScreen } from '../screens/calendar/CalendarScreen';
import { GroupsScreen } from '../screens/groups/GroupsScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { ScheduleFormScreen } from '../screens/schedule/ScheduleFormScreen';
import { GroupFormScreen } from '../screens/groups/GroupFormScreen';
import { GroupDetailScreen } from '../screens/groups/GroupDetailScreen';
import { GroupJoinScreen } from '../screens/groups/GroupJoinScreen';
import { TimeCoordinationScreen } from '../screens/coordination/TimeCoordinationScreen';
import { CoordinationTimetableScreen } from '../screens/coordination/CoordinationTimetableScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';
import { LoadingState } from '../components/common/LoadingState';
import { linking } from './linking';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.card,
    text: colors.foreground,
    border: colors.border,
    primary: colors.primary,
  },
};

function MainTabsNavigator() {
  return (
    <Tabs.Navigator
      screenOptions={({ route, navigation }) => ({
        headerShown: false,
        tabBarStyle: {
          height: 72,
          paddingTop: 8,
          paddingBottom: 12,
          borderTopColor: colors.border,
          backgroundColor: 'rgba(255,255,255,0.92)',
          position: 'absolute',
        },
        tabBarIcon: ({ focused }) => {
          const color = focused ? colors.primary : colors.mutedForeground;
          const strokeWidth = focused ? 2 : 1.75;

          switch (route.name) {
            case 'Home':
              return <Home color={color} size={22} strokeWidth={strokeWidth} />;
            case 'Calendar':
              return <CalendarDays color={color} size={22} strokeWidth={strokeWidth} />;
            case 'Groups':
              return <Users color={color} size={22} strokeWidth={strokeWidth} />;
            case 'MyPage':
              return <User color={color} size={22} strokeWidth={strokeWidth} />;
          }
        },
        tabBarLabel: ({ focused }) => (
          <Text style={{ fontSize: 10, fontWeight: '600', color: focused ? colors.primary : colors.mutedForeground }}>
            {route.name === 'MyPage' ? '마이' : route.name === 'Calendar' ? '캘린더' : route.name === 'Groups' ? '그룹' : '홈'}
          </Text>
        ),
      })}
    >
      <Tabs.Screen name="Home" component={HomeScreen} />
      <Tabs.Screen name="Calendar" component={CalendarScreen} />
      <Tabs.Screen name="Groups" component={GroupsScreen} />
      <Tabs.Screen name="MyPage" component={ProfileScreen} />
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingState label="세션을 확인하고 있습니다" />;
  }

  return (
    <NavigationContainer theme={navigationTheme} linking={linking}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <RootStack.Screen name="Login" component={LoginScreen} />
            <RootStack.Screen name="OAuthCallback" component={OAuthCallbackScreen} />
          </>
        ) : (
          <>
            <RootStack.Screen name="MainTabs" component={MainTabsNavigator} />
            <RootStack.Screen name="OAuthCallback" component={OAuthCallbackScreen} />
            <RootStack.Screen name="ScheduleForm" component={ScheduleFormScreen} />
            <RootStack.Screen name="GroupForm" component={GroupFormScreen} />
            <RootStack.Screen name="GroupDetail" component={GroupDetailScreen} />
            <RootStack.Screen name="GroupJoin" component={GroupJoinScreen} />
            <RootStack.Screen name="TimeCoordination" component={TimeCoordinationScreen} />
            <RootStack.Screen name="CoordinationTimetable" component={CoordinationTimetableScreen} />
            <RootStack.Screen name="Notifications" component={NotificationsScreen} />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
