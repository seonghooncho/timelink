import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import MobileLayout from '@/components/layout/MobileLayout';
import { clearStoredSession, setStoredSession } from '@/services/session';
import { toast } from 'sonner';

const OAuthCallbackPage: React.FC = () => {
  useEffect(() => {
    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);

    const accessToken = params.get('accessToken');
    const userId = params.get('userId');
    const redirect = params.get('redirect') || '/';

    if (!accessToken || !userId) {
      clearStoredSession();
      toast.error('로그인 결과를 확인할 수 없습니다');
      window.location.replace('/login');
      return;
    }

    setStoredSession({ accessToken, userId });
    window.location.replace(redirect.startsWith('/') ? redirect : '/');
  }, []);

  return (
    <MobileLayout hideNav>
      <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <h1 className="text-lg font-semibold text-foreground">로그인 처리 중입니다</h1>
        <p className="text-sm text-muted-foreground mt-2">
          인증 정보를 확인한 뒤 원래 화면으로 이동합니다
        </p>
      </div>
    </MobileLayout>
  );
};

export default OAuthCallbackPage;
