import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MobileLayout from '@/components/layout/MobileLayout';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { Loader2, LockKeyhole, UserRound } from 'lucide-react';
import { toast } from 'sonner';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, signIn } = useAuth();
  const [userId, setUserId] = useState('');
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const redirectPath = new URLSearchParams(location.search).get('redirect') || '/';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectPath]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedUserId = userId.trim().toLowerCase();
    if (!normalizedUserId) {
      toast.error('계정 ID를 입력해주세요');
      return;
    }

    setIsLoading(true);
    try {
      await signIn({
        userId: normalizedUserId,
        nickname: nickname.trim() || undefined,
      });
      toast.success('로그인되었습니다');
      navigate(redirectPath, { replace: true });
    } catch (err) {
      toast.error('로그인 중 오류가 발생했습니다');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MobileLayout hideNav>
      <div className="flex flex-col items-center justify-center min-h-screen px-8">
        <div className="mb-16 text-center">
          <div className="w-20 h-20 rounded-3xl bg-primary/8 border border-primary/10 flex items-center justify-center mx-auto mb-5">
            <span className="text-4xl">📅</span>
          </div>
          <h1 className="text-[26px] font-bold text-foreground tracking-tight">일정관리</h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            그룹과 함께<br />스마트하게 일정을 관리하세요
          </p>
        </div>

        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">계정 ID</label>
            <div className="relative">
              <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="예: seonghoon"
                className="pl-11 h-12 rounded-2xl bg-card border-border"
                maxLength={32}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">영문 소문자, 숫자, `-`, `_` 조합의 고정 ID를 사용합니다.</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">닉네임</label>
            <div className="relative">
              <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="첫 로그인 시 사용할 이름"
                className="pl-11 h-12 rounded-2xl bg-card border-border"
                maxLength={20}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">닉네임은 비워도 되고, 첫 로그인 이후에는 마이페이지에서 수정할 수 있습니다.</p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2.5 py-4 bg-card border border-border rounded-2xl text-sm font-bold text-foreground hover:bg-muted transition-all pressable disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {isLoading ? '로그인 중...' : '백엔드 계정으로 시작하기'}
          </button>
        </form>

        <p className="mt-10 text-[11px] text-muted-foreground/60 text-center">
          세션과 동적 데이터는 모두 백엔드 API를 통해 처리됩니다
        </p>
      </div>
    </MobileLayout>
  );
};

export default LoginPage;
