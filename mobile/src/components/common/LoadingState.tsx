import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/theme';

export function LoadingState({ label = '불러오는 중입니다' }: { label?: string }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  label: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
});
