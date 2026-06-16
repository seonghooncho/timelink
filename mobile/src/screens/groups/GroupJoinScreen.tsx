import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/layout/Screen';
import { RootStackParamList } from '../../navigation/types';
import { groupApi } from '../../services/api';
import { colors, radius } from '../../constants/theme';
import { isSafeInternalPath, MobileNavigationTarget, resolveInternalPathTarget } from '../../navigation/navigationTargets';
import { trackMobileError, trackProductEvent } from '../../services/analytics';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
  route: RouteProp<RootStackParamList, 'GroupJoin' | 'InviteRedirect'>;
};

function replaceToTarget(navigation: NativeStackNavigationProp<RootStackParamList>, target: MobileNavigationTarget) {
  switch (target.screen) {
    case 'MainTabs':
      navigation.replace('MainTabs', target.params);
      return;
    case 'Notifications':
      navigation.replace('Notifications');
      return;
    case 'GroupDetail':
      navigation.replace('GroupDetail', target.params);
      return;
    case 'GroupIntro':
      navigation.replace('GroupIntro', target.params);
      return;
    case 'GroupJoin':
      navigation.replace('GroupJoin', target.params);
      return;
    case 'CommunityPostDetail':
      navigation.replace('CommunityPostDetail', target.params);
      return;
    case 'CoordinationTimetable':
      navigation.replace('CoordinationTimetable', target.params);
      return;
    case 'ScheduleForm':
      navigation.replace('ScheduleForm', target.params);
      return;
    case 'GroupForm':
      navigation.replace('GroupForm');
      return;
  }
}

export function GroupJoinScreen({ navigation, route }: Props) {
  const queryClient = useQueryClient();
  const { inviteCode, coord, redirect } = route.params;
  const [status, setStatus] = useState<'joining' | 'error'>('joining');

  useEffect(() => {
    setStatus('joining');
    void trackProductEvent('link_opened', {
      feature: 'groups',
      link_type: coord ? 'coordination' : 'group_invite',
      source: 'group_join',
    });
    groupApi.join(inviteCode)
      .then((group) => {
        queryClient.invalidateQueries({ queryKey: ['groups'] });
        queryClient.invalidateQueries({ queryKey: ['groups', group.id] });
        if (isSafeInternalPath(redirect)) {
          replaceToTarget(navigation, resolveInternalPathTarget(redirect));
          return;
        }
        if (coord) {
          navigation.replace('CoordinationTimetable', { groupId: group.id, coordId: coord });
          return;
        }
        navigation.replace('GroupDetail', { id: group.id });
      })
      .catch(() => {
        trackMobileError('join_error', 'groups');
        setStatus('error');
      });
  }, [coord, inviteCode, navigation, queryClient, redirect]);

  if (status === 'error') {
    return (
      <Screen hideTabSpacing contentContainerStyle={styles.container}>
        <View style={styles.errorCard}>
          <View style={styles.errorIcon}>
            <Text style={styles.errorIconText}>!</Text>
          </View>
          <Text style={styles.errorTitle}>초대 링크를 사용할 수 없습니다</Text>
          <Text style={styles.errorDesc}>
            링크가 만료되었거나 이미 처리된 초대일 수 있어요. 모임 관리자에게 새 링크를 요청하거나 공개 모임을 둘러보세요.
          </Text>
          <View style={styles.errorActions}>
            <Pressable onPress={() => navigation.replace('MainTabs', { screen: 'Groups' })} style={styles.primaryAction}>
              <Text style={styles.primaryActionText}>모임 보기</Text>
            </Pressable>
            <Pressable onPress={() => navigation.replace('Notifications')} style={styles.secondaryAction}>
              <Text style={styles.secondaryActionText}>알림 보기</Text>
            </Pressable>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen hideTabSpacing contentContainerStyle={styles.container}>
      <View style={styles.spinner} />
      <Text style={styles.title}>모임에 참여하는 중입니다</Text>
      <Text style={styles.desc}>초대 코드를 확인하고 있어요.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  spinner: {
    width: 28,
    height: 28,
    borderWidth: 2,
    borderColor: colors.primary,
    borderTopColor: 'transparent',
    borderRadius: 999,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
  },
  desc: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  errorCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 20,
    alignItems: 'center',
  },
  errorIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorIconText: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.primary,
  },
  errorTitle: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '800',
    color: colors.foreground,
  },
  errorDesc: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
    color: colors.mutedForeground,
  },
  errorActions: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 8,
  },
  primaryAction: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryForeground,
  },
  secondaryAction: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.foreground,
  },
});
