import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, FileText, ShieldCheck } from 'lucide-react';
import BrandMark from '@/components/common/BrandMark';
import MobileLayout from '@/components/layout/MobileLayout';
import { Checkbox } from '@/components/ui/checkbox';
import { appToast } from '@/lib/appToast';
import { profileApi } from '@/services/api';
import { markPushPermissionNudgePending } from '@/pwa/pushNotifications';

const getSafeRedirect = (value: string | null) => {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/';
  }

  return value;
};

const ConsentPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [termsChecked, setTermsChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const redirectPath = useMemo(
    () => getSafeRedirect(new URLSearchParams(location.search).get('redirect')),
    [location.search],
  );

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: profileApi.getMe,
  });

  const agreeMutation = useMutation({
    mutationFn: profileApi.agreeRequiredConsents,
    onSuccess: (profile) => {
      queryClient.setQueryData(['profile'], profile);
      markPushPermissionNudgePending();
      appToast.success('동의가 완료되었습니다');
      navigate(redirectPath, { replace: true });
    },
    onError: (error) => {
      appToast.error('동의 처리에 실패했습니다', error);
    },
  });

  const allChecked = termsChecked && privacyChecked;

  useEffect(() => {
    if (profileQuery.data?.requiredConsentCompleted) {
      navigate(redirectPath, { replace: true });
    }
  }, [navigate, profileQuery.data?.requiredConsentCompleted, redirectPath]);

  const handleAllChecked = (checked: boolean) => {
    setTermsChecked(checked);
    setPrivacyChecked(checked);
  };

  const handleSubmit = () => {
    if (!allChecked) {
      appToast.info('필수 항목을 확인해주세요', '이용약관과 개인정보 수집·이용 동의가 필요합니다.');
      return;
    }

    agreeMutation.mutate();
  };

  return (
    <MobileLayout hideNav>
      <main className="min-h-screen px-6 py-10">
        <BrandMark size="md" />

        <section className="mt-10">
          <p className="text-xs font-semibold text-primary">처음 시작하기 전</p>
          <h1 className="mt-2 text-2xl font-bold leading-tight text-foreground">
            Timelink 이용을 위한<br />필수 안내를 확인해주세요
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            계정이 준비되었습니다. 일정과 모임 조율을 안전하게 제공하기 위해 필요한 항목만 확인합니다.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <div className="flex w-full items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
            <Checkbox
              id="all-required-consents"
              checked={allChecked}
              onCheckedChange={(checked) => handleAllChecked(checked === true)}
            />
            <button
              type="button"
              onClick={() => handleAllChecked(!allChecked)}
              className="min-w-0 flex-1 text-left text-sm font-bold text-foreground"
            >
              필수 항목 전체 동의
            </button>
          </div>

          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <FileText className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">이용약관 동의</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">서비스 이용 조건과 책임 범위</p>
              </div>
              <Link to="/terms" className="text-xs font-semibold text-primary underline-offset-2 hover:underline">
                보기
              </Link>
              <Checkbox
                checked={termsChecked}
                onCheckedChange={(checked) => setTermsChecked(checked === true)}
                aria-label="이용약관 동의"
              />
            </div>

            <div className="flex items-center gap-3 px-4 py-3">
              <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">개인정보 수집·이용 동의</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">로그인, 일정, 모임, 알림 제공에 필요한 정보</p>
              </div>
              <Link to="/privacy" className="text-xs font-semibold text-primary underline-offset-2 hover:underline">
                보기
              </Link>
              <Checkbox
                checked={privacyChecked}
                onCheckedChange={(checked) => setPrivacyChecked(checked === true)}
                aria-label="개인정보 수집·이용 동의"
              />
            </div>
          </div>
        </section>

        <section className="mt-5 flex items-start gap-2 rounded-xl bg-muted px-3 py-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-[11px] leading-5 text-muted-foreground">
            필수 동의는 최초 1회만 확인합니다. 약관이나 개인정보 안내가 바뀌면 다시 알려드릴게요.
          </p>
        </section>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={agreeMutation.isPending || profileQuery.isLoading}
          className="mt-8 w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {agreeMutation.isPending ? '처리 중...' : '동의하고 시작하기'}
        </button>
      </main>
    </MobileLayout>
  );
};

export default ConsentPage;
