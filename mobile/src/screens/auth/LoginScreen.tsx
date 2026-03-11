import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { LoaderCircle } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/layout/Screen';
import { BrandMark } from '../../components/common/BrandMark';
import { AppButton } from '../../components/common/AppButton';
import { AppTextInput } from '../../components/common/AppTextInput';
import { colors, radius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { env } from '../../config/env';
import { AuthProvidersResponse, SocialAuthProvider, authApi } from '../../services/api';
import { completeOAuthSession } from '../../navigation/authRedirect';
import { RootStackParamList } from '../../navigation/types';

WebBrowser.maybeCompleteAuthSession();

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;
type LoginMode = SocialAuthProvider | 'guest' | null;

function createGuestUserId(nickname: string) {
  const sanitized = nickname
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 12);
  const prefix = sanitized || 'guest';
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.slice(0, 8);
  return `${prefix}_${suffix}`.slice(0, 32);
}

export function LoginScreen({ navigation }: Props) {
  const { isAuthenticated, signIn, completeSession } = useAuth();
  const [providers, setProviders] = useState<AuthProvidersResponse | null>(null);
  const [providerFetchFailed, setProviderFetchFailed] = useState(false);
  const [guestNickname, setGuestNickname] = useState('');
  const [isLoading, setIsLoading] = useState<LoginMode>(null);

  const redirectPath = '/';
  const showGuestFallback = Boolean(providers) || providerFetchFailed;
  const hasEnabledProvider = Boolean(providers?.google || providers?.kakao);

  useEffect(() => {
    if (isAuthenticated) {
      navigation.replace('MainTabs');
    }
  }, [isAuthenticated, navigation]);

  useEffect(() => {
    authApi.getProviders()
      .then((data) => {
        setProviders(data);
        setProviderFetchFailed(false);
      })
      .catch(() => {
        setProviders({ google: false, kakao: false });
        setProviderFetchFailed(true);
      });
  }, []);

  const handleSocialLogin = async (provider: SocialAuthProvider) => {
    if (!providers?.[provider]) {
      Alert.alert('준비 중', `${provider === 'google' ? 'Google' : '카카오'} 로그인은 아직 설정되지 않았습니다.`);
      return;
    }

    setIsLoading(provider);
    try {
      const startUrl = authApi.getOAuthStartUrl(provider, env.mobileAppOrigin, redirectPath);
      const result = await WebBrowser.openAuthSessionAsync(startUrl, `${env.mobileAppOrigin}/auth/callback`);

      if (result.type !== 'success' || !result.url) {
        return;
      }
      await completeOAuthSession(result.url, completeSession, navigation);
    } catch (error) {
      const message = error instanceof Error ? error.message : '소셜 로그인에 실패했습니다';
      Alert.alert('로그인 실패', message);
    } finally {
      setIsLoading(null);
    }
  };

  const handleGuestLogin = async () => {
    const nickname = guestNickname.trim() || 'Timelink 게스트';
    setIsLoading('guest');
    try {
      await signIn({
        userId: createGuestUserId(nickname),
        nickname,
      });
      navigation.replace('MainTabs');
    } catch {
      Alert.alert('임시 로그인 실패', '임시 로그인에 실패했습니다.');
    } finally {
      setIsLoading(null);
    }
  };

  const providerBadge = useMemo(() => {
    if (providers?.google || providers?.kakao) {
      return null;
    }
    return <Text style={styles.oauthBadge}>OAuth 대기</Text>;
  }, [providers]);

  return (
    <Screen hideTabSpacing contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <BrandMark size="lg" />
        <Text style={styles.brandTitle}>Timelink</Text>
        <Text style={styles.brandCaption}>개인과 그룹 일정을{'\n'}자연스럽게 연결하세요</Text>
      </View>

      <View style={styles.actions}>
        <AppButton
          label={isLoading === 'kakao' ? '카카오 로그인 중...' : '카카오로 시작하기'}
          onPress={() => handleSocialLogin('kakao')}
          disabled={!providers || isLoading !== null}
          style={{ backgroundColor: '#FEE500' }}
          variant="secondary"
        />

        <AppButton
          label={isLoading === 'google' ? 'Google 로그인 중...' : 'Google로 시작하기'}
          onPress={() => handleSocialLogin('google')}
          disabled={!providers || isLoading !== null}
          variant="secondary"
        />
      </View>

      {showGuestFallback ? (
        <View style={styles.guestCard}>
          <View style={styles.guestHeader}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={styles.guestTitle}>임시 로그인</Text>
              <Text style={styles.guestDesc}>
                {hasEnabledProvider
                  ? '로그인 없이 핵심 화면을 가볍게 둘러볼 수 있습니다.'
                  : '소셜 로그인이 준비되는 동안 임시 계정으로 서비스를 확인할 수 있습니다.'}
              </Text>
            </View>
            {providerBadge}
          </View>

          <AppTextInput
            value={guestNickname}
            onChangeText={setGuestNickname}
            placeholder="표시할 닉네임"
            maxLength={20}
          />

          <AppButton
            label={isLoading === 'guest' ? '입장 중...' : '임시로 시작하기'}
            onPress={handleGuestLogin}
            disabled={isLoading !== null}
            style={{ marginTop: 12, backgroundColor: colors.foreground }}
          />
        </View>
      ) : (
        <View style={{ marginTop: 18, alignItems: 'center' }}>
          <LoaderCircle color={colors.primary} size={18} />
        </View>
      )}

      <Text style={styles.footer}>로그인 시 서비스 이용약관에 동의합니다</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: '100%',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 36,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 52,
    gap: 12,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  brandCaption: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 24,
    color: colors.mutedForeground,
  },
  actions: {
    gap: 12,
  },
  guestCard: {
    marginTop: 24,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
    gap: 12,
  },
  guestHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  guestTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
  },
  guestDesc: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.mutedForeground,
  },
  oauthBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: colors.primary + '18',
    color: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 10,
    fontWeight: '700',
  },
  footer: {
    marginTop: 32,
    textAlign: 'center',
    fontSize: 11,
    color: colors.mutedForeground,
  },
});
