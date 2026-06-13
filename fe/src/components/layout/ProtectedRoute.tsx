import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { profileApi } from '@/services/api';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireConsent?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireConsent = true }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: profileApi.getMe,
    enabled: isAuthenticated && requireConsent,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  if (requireConsent) {
    if (profileQuery.isLoading || profileQuery.isFetching) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    if (profileQuery.isError) {
      return (
        <div className="min-h-screen bg-background px-6 py-16">
          <div className="mx-auto max-w-sm rounded-2xl border border-border bg-card p-5 text-center shadow-soft">
            <p className="text-base font-bold text-foreground">사용자 정보를 불러오지 못했습니다</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              네트워크 상태를 확인한 뒤 다시 시도해주세요. 세션이 만료됐다면 로그인 화면으로 이동할 수 있습니다.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void profileQuery.refetch()}
                className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground"
              >
                다시 시도
              </button>
              <button
                type="button"
                onClick={() => navigate('/login', { replace: true })}
                className="rounded-xl border border-border bg-card py-3 text-sm font-semibold text-muted-foreground"
              >
                로그인
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (!profileQuery.data?.requiredConsentCompleted) {
      const redirect = `${location.pathname}${location.search}`;
      return <Navigate to={`/consent?redirect=${encodeURIComponent(redirect)}`} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
