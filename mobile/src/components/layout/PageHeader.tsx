import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing } from '../../constants/theme';

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  rightElement?: ReactNode;
}

export function PageHeader({ title, showBack = false, rightElement }: PageHeaderProps) {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {showBack ? (
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronLeft color={colors.foreground} size={22} />
          </Pressable>
        ) : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {rightElement ? <View>{rightElement}</View> : <View style={{ width: 24 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    paddingHorizontal: spacing.screen,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    marginLeft: -6,
    padding: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.foreground,
    letterSpacing: -0.3,
  },
});
