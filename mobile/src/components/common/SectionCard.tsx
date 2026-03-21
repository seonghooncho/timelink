import { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius, shadows } from '../../constants/theme';

export function SectionCard({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    ...shadows.soft,
  },
});
