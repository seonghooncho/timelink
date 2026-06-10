import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import MobileLayout from '@/components/layout/MobileLayout';
import BrandMark from '@/components/common/BrandMark';
import { useAuth } from '@/context/AuthContext';
import { authApi, AuthProvidersResponse, SocialAuthProvider } from '@/services/api';
import { getPublicAppOrigin } from '@/lib/appOrigin';
import { Loader2 } from 'lucide-react';
import { appToast } from '@/lib/appToast';

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

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, signIn } = useAuth();
  const [isLoading, setIsLoading] = useState<LoginMode>(null);
  const [providers, setProviders] = useState<AuthProvidersResponse | null>(null);
  const [providerFetchFailed, setProviderFetchFailed] = useState(false);
  const [guestNickname, setGuestNickname] = useState('');

  const redirectPath = new URLSearchParams(location.search).get('redirect') || '/';
  const providerError = new URLSearchParams(location.search).get('error');
  const errorMessage = new URLSearchParams(location.search).get('message');
  const hasConfiguredProvider = Boolean(providers?.google || providers?.kakao);
  const showGuestFallback = Boolean(providers) || providerFetchFailed || Boolean(providerError);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectPath]);

  useEffect(() => {
    authApi.getProviders()
      .then((data) => {
        setProviders(data);
        setProviderFetchFailed(false);
      })
      .catch((err) => {
        setProviders({ google: false, kakao: false });
        setProviderFetchFailed(true);
        appToast.error('소셜 로그인 설정을 확인하지 못했습니다', err, '임시 로그인으로 계속할 수 있습니다.');
        console.error(err);
      });
  }, []);

  useEffect(() => {
    if (!providerError) {
      return;
    }

    appToast.error(errorMessage || `${providerError} 로그인에 실패했습니다`);
  }, [providerError, errorMessage]);

  const handleSocialLogin = (provider: SocialAuthProvider) => {
    if (!providers?.[provider]) {
      appToast.info(`${provider === 'google' ? 'Google' : '카카오'} 로그인은 아직 설정되지 않았습니다`);
      return;
    }

    setIsLoading(provider);
    window.location.href = authApi.getOAuthStartUrl(provider, getPublicAppOrigin(), redirectPath);
  };

  const handleGuestLogin = async () => {
    const nickname = guestNickname.trim() || 'Timelink 게스트';
    setIsLoading('guest');
    try {
      await signIn({
        userId: createGuestUserId(nickname),
        nickname,
      });
      navigate(redirectPath, { replace: true });
    } catch (err) {
      console.error(err);
      appToast.error('임시 로그인에 실패했습니다', err);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <MobileLayout hideNav>
      <div className="flex flex-col items-center justify-center min-h-screen px-8">
        <div className="mb-16 text-center">
          <BrandMark size="lg" className="justify-center mb-5" />
          <h1 className="text-[26px] font-bold text-foreground tracking-tight">Timelink</h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            개인과 그룹 일정을<br />자연스럽게 연결하세요
          </p>
        </div>

        <div className="w-full max-w-sm space-y-3">
          <button
            type="button"
            onClick={() => handleSocialLogin('kakao')}
            disabled={!providers || !providers.kakao || isLoading !== null}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-sm font-bold transition-all pressable disabled:opacity-50"
            style={{ backgroundColor: '#FEE500', color: '#191919' }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3C6.477 3 2 6.463 2 10.691c0 2.72 1.793 5.108 4.502 6.462-.197.723-.713 2.622-.816 3.028-.13.503.184.497.387.362.159-.106 2.531-1.713 3.563-2.412.439.061.891.093 1.364.093 5.523 0 10-3.463 10-7.533C22 6.463 17.523 3 12 3z" />
            </svg>
            카카오로 시작하기
          </button>

          <button
            type="button"
            onClick={() => handleSocialLogin('google')}
            disabled={!providers || !providers.google || isLoading !== null}
            className="w-full flex items-center justify-center gap-2.5 py-4 bg-card border border-border rounded-2xl text-sm font-bold text-foreground hover:bg-muted transition-all pressable disabled:opacity-50"
          >
            {isLoading === 'google' ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            {isLoading === 'google' ? 'Google 로그인 중...' : 'Google로 시작하기'}
          </button>
        </div>

        {showGuestFallback ? (
          <div className="w-full max-w-sm mt-6 rounded-2xl border border-border bg-card/80 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">임시 로그인</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {providerFetchFailed
                    ? '소셜 로그인 설정을 확인하지 못했습니다. 키를 적용하기 전까지 임시 계정으로 계속할 수 있습니다.'
                    : '소셜 로그인 키를 받으면 바로 활성화할 수 있습니다. 현재는 임시 계정으로 서비스를 사용할 수 있습니다.'}
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                OAuth 대기
              </span>
            </div>

            <input
              value={guestNickname}
              onChange={(event) => setGuestNickname(event.target.value)}
              placeholder="표시할 닉네임"
              maxLength={20}
              className="mt-4 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
            />

            <button
              type="button"
              onClick={handleGuestLogin}
              disabled={isLoading !== null}
              className="mt-3 w-full rounded-xl bg-foreground py-3 text-sm font-semibold text-background transition-opacity disabled:opacity-50"
            >
              {isLoading === 'guest' ? '입장 중...' : '임시로 시작하기'}
            </button>
          </div>
        ) : null}

        <p className="mt-10 text-[11px] text-muted-foreground/70 text-center leading-relaxed">
          처음 시작할 때{' '}
          <Link to="/terms" className="font-semibold text-primary underline-offset-2 hover:underline">
            이용약관
          </Link>
          과{' '}
          <Link to="/privacy" className="font-semibold text-primary underline-offset-2 hover:underline">
            개인정보 안내
          </Link>
          를 확인합니다.
        </p>
      </div>
    </MobileLayout>
  );
};

export default LoginPage;
