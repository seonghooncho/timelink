import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useURL } from 'expo-linking';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LoadingState } from '../../components/common/LoadingState';
import { Screen } from '../../components/layout/Screen';
import { useAuth } from '../../context/AuthContext';
import { completeOAuthSession } from '../../navigation/authRedirect';
import { RootStackParamList } from '../../navigation/types';
import { trackMobileError, trackProductEvent } from '../../services/analytics';

type Props = NativeStackScreenProps<RootStackParamList, 'OAuthCallback'>;

export function OAuthCallbackScreen({ navigation }: Props) {
  const url = useURL();
  const handledUrlRef = useRef<string | null>(null);
  const { completeSession } = useAuth();

  useEffect(() => {
    if (!url || handledUrlRef.current === url) {
      return;
    }

    handledUrlRef.current = url;

    completeOAuthSession(url, completeSession, navigation)
      .then(() => {
        void trackProductEvent('login_completed', {
          feature: 'auth',
          source: 'oauth_callback',
        });
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : '소셜 로그인에 실패했습니다';
        trackMobileError('auth_error', 'auth');
        Alert.alert('로그인 실패', message, [
          {
            text: '확인',
            onPress: () => navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            }),
          },
        ]);
      });
  }, [completeSession, navigation, url]);

  return (
    <Screen hideTabSpacing>
      <LoadingState label="로그인을 마무리하고 있습니다" />
    </Screen>
  );
}
