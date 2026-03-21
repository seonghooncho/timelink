import { ReactNode } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, radius } from '../../constants/theme';

interface AppTextInputProps extends TextInputProps {
  label?: string;
  hint?: string;
  rightElement?: ReactNode;
  multiline?: boolean;
}

export function AppTextInput({ label, hint, rightElement, multiline, style, ...props }: AppTextInputProps) {
  return (
    <View style={{ gap: 8 }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.container, multiline ? styles.multilineContainer : null]}>
        <TextInput
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, multiline ? styles.multilineInput : null, style]}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          {...props}
        />
        {rightElement}
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  container: {
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  multilineContainer: {
    minHeight: 116,
    paddingVertical: 12,
    alignItems: 'flex-start',
  },
  input: {
    flex: 1,
    color: colors.foreground,
    fontSize: 14,
    paddingVertical: 12,
  },
  multilineInput: {
    minHeight: 92,
    paddingVertical: 0,
  },
  hint: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
});
