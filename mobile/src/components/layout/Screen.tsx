import { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, ScrollViewProps, StyleProp, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constants/theme';

interface ScreenProps extends PropsWithChildren {
  scroll?: boolean;
  hideTabSpacing?: boolean;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  style?: StyleProp<ViewStyle>;
}

export function Screen({
  children,
  scroll = true,
  hideTabSpacing = false,
  contentContainerStyle,
  style,
}: ScreenProps) {
  const spacingBottom = hideTabSpacing ? 0 : 104;

  return (
    <SafeAreaView edges={['top']} style={[{ flex: 1, backgroundColor: colors.background }, style]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[{ paddingBottom: spacingBottom }, contentContainerStyle]}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={{ flex: 1, paddingBottom: spacingBottom }}>
            {children}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
