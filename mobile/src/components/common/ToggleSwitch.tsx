import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius } from '../../constants/theme';

interface ToggleSwitchProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

export function ToggleSwitch({ value, onChange }: ToggleSwitchProps) {
  return (
    <Pressable onPress={() => onChange(!value)} style={[styles.track, value ? styles.trackOn : null]}>
      <View style={[styles.thumb, value ? styles.thumbOn : null]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 48,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    padding: 3,
    justifyContent: 'center',
  },
  trackOn: {
    backgroundColor: colors.primary,
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
  },
  thumbOn: {
    alignSelf: 'flex-end',
  },
});
