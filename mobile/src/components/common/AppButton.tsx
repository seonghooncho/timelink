import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, radius } from '../../constants/theme';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'group';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
}: AppButtonProps) {
  const variantStyle = styles[variant];
  const textStyle = textStyles[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        variantStyle,
        pressed && !disabled ? styles.pressed : null,
        (disabled || loading) ? styles.disabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? colors.foreground : colors.primaryForeground} />
      ) : (
        <Text style={textStyle}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: colors.muted,
  },
  group: {
    backgroundColor: colors.categoryGroup,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.5,
  },
});

const textStyles = StyleSheet.create({
  primary: {
    color: colors.primaryForeground,
    fontSize: 15,
    fontWeight: '700',
  },
  secondary: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: '700',
  },
  ghost: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: '600',
  },
  group: {
    color: colors.primaryForeground,
    fontSize: 15,
    fontWeight: '700',
  },
});
