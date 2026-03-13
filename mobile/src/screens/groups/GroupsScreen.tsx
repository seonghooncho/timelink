import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Bell, ChevronRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/layout/Screen';
import { PageHeader } from '../../components/layout/PageHeader';
import { FloatingAddButton } from '../../components/common/FloatingAddButton';
import { GroupAvatar } from '../../components/common/GroupAvatar';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';
import { colors, radius } from '../../constants/theme';
import { RootStackParamList } from '../../navigation/types';
import { useGroups } from '../../hooks/useGroups';

export function GroupsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: groups = [], isLoading } = useGroups();

  return (
    <Screen>
      <PageHeader
        title="나의 그룹"
        rightElement={(
          <Pressable onPress={() => navigation.navigate('Notifications')} style={styles.notificationButton}>
            <Bell color={colors.mutedForeground} size={20} />
          </Pressable>
        )}
      />

      <View style={styles.list}>
        {isLoading ? (
          <LoadingState />
        ) : groups.length === 0 ? (
          <EmptyState title="아직 그룹이 없습니다" description="새 그룹을 만들거나 초대 링크로 참여해 보세요" />
        ) : groups.map((group) => (
          <Pressable key={group.id} onPress={() => navigation.navigate('GroupDetail', { id: group.id })} style={styles.card}>
            <GroupAvatar image={group.imageUrl} name={group.name} size="sm" />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{group.name}</Text>
              <Text style={styles.meta}>멤버 {group.memberCount}명</Text>
            </View>
            <ChevronRight color={colors.mutedForeground} size={16} />
          </Pressable>
        ))}
      </View>

      <FloatingAddButton onPress={() => navigation.navigate('GroupForm')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  notificationButton: {
    padding: 8,
  },
  list: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
  },
  meta: {
    marginTop: 4,
    fontSize: 12,
    color: colors.mutedForeground,
  },
});
