import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../../constants/theme';

interface TabItem {
  key: string;
  label: string;
}

interface TabBarProps {
  tabs: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
}

export function TabBar({ tabs, activeKey, onChange }: TabBarProps) {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={[styles.tab, active ? styles.tabActive : null]}
          >
            <Text style={[styles.label, active ? styles.labelActive : null]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: colors.foreground,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.mutedForeground,
  },
  labelActive: {
    color: colors.card,
  },
});
