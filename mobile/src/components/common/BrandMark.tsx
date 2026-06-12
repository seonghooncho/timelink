import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, shadows } from '../../constants/theme';

interface BrandMarkProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
}

const sizeMap = {
  sm: 48,
  md: 64,
  lg: 84,
};

export function BrandMark({ size = 'md', showWordmark = false }: BrandMarkProps) {
  const dimension = sizeMap[size];

  return (
    <View style={styles.row}>
      <Image
        source={require('../../../assets/applogo.png')}
        style={[
          {
            width: dimension,
            height: dimension,
            borderRadius: size === 'lg' ? 26 : 20,
          },
          shadows.brand,
        ]}
      />
      {showWordmark ? (
        <View style={{ gap: 3 }}>
          <Text style={styles.title}>Timelink</Text>
          <Text style={styles.caption}>개인과 그룹 일정을 자연스럽게 연결합니다</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  caption: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
});
