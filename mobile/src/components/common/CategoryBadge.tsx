import { StyleSheet, Text, View } from 'react-native';
import { getCategoryLabel, getCategoryPalette } from '../../utils/category';

interface CategoryBadgeProps {
  category: 'task' | 'appointment' | 'group' | 'repeat' | 'important';
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  const palette = getCategoryPalette(category);

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.label, { color: palette.fg }]}>{getCategoryLabel(category)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
  },
});
