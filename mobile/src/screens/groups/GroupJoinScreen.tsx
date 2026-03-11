import { useEffect } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/layout/Screen';
import { RootStackParamList } from '../../navigation/types';
import { groupApi } from '../../services/api';
import { colors } from '../../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupJoin'>;

export function GroupJoinScreen({ navigation, route }: Props) {
  const { inviteCode } = route.params;

  useEffect(() => {
    groupApi.join(inviteCode)
      .then((group) => {
        navigation.replace('GroupDetail', { id: group.id });
      })
      .catch(() => {
        Alert.alert('참여 실패', '초대 링크가 유효하지 않거나 이미 참여한 그룹입니다.');
        navigation.replace('MainTabs');
      });
  }, [inviteCode, navigation]);

  return (
    <Screen hideTabSpacing contentContainerStyle={styles.container}>
      <View style={styles.spinner} />
      <Text style={styles.title}>그룹에 참여하는 중입니다</Text>
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
});
