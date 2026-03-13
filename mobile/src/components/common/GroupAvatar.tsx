import { Image, StyleSheet, Text, View } from 'react-native';
import { Users } from 'lucide-react-native';
import { colors, radius } from '../../constants/theme';

interface GroupAvatarProps {
  image?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 40,
  md: 44,
  lg: 56,
};

export function GroupAvatar({ image, name, size = 'sm' }: GroupAvatarProps) {
  const dimension = sizeMap[size];

  if (image) {
    return (
      <Image
        source={{ uri: image }}
        accessibilityLabel={name}
        style={{ width: dimension, height: dimension, borderRadius: size === 'lg' ? 16 : 12 }}
      />
    );
  }

  return (
    <View style={[styles.fallback, { width: dimension, height: dimension, borderRadius: size === 'lg' ? 16 : 12 }]}>
      <Users size={size === 'lg' ? 26 : 20} color={colors.categoryGroup} />
    </View>
  );
}

export function PersonAvatar({ image, name, size = 40 }: { image?: string; name: string; size?: number }) {
  if (image) {
    return <Image source={{ uri: image }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }

  return (
    <View style={[styles.personFallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.personFallbackText}>{name.slice(0, 1).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.categoryGroupLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personFallback: {
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  personFallbackText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
});
