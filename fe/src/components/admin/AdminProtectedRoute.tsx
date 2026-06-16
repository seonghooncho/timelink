import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Navigate, useLocation } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import { adminApi } from '@/services/api';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, userId } = useAuth();
  const location = useLocation();
  const adminQuery = useQuery({
    queryKey: ['admin', 'me'],
    queryFn: adminApi.getMe,
    enabled: isAuthenticated,
    retry: false,
  });

  if (isLoading) {
    return <AdminLoading />;
  }

  if (!isAuthenticated) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  if (adminQuery.isLoading || adminQuery.isFetching) {
    return <AdminLoading />;
  }

  if (adminQuery.isError || !adminQuery.data?.admin) {
    return (
      <AdminLayout title="Admin Access" description="어드민 권한이 있는 계정만 접근할 수 있습니다.">
        <section className="rounded-lg border border-amber-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-neutral-950">관리자 allowlist에 없는 계정입니다</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                운영 설정의 <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs">analytics.admin-user-ids</code>에
                현재 로그인 ID를 추가한 뒤 다시 배포하면 접근할 수 있습니다.
              </p>
              <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">현재 로그인 ID</p>
                <p className="mt-1 break-all font-mono text-sm font-bold text-neutral-950">{userId || '확인 불가'}</p>
              </div>
              <button
                type="button"
                onClick={() => void adminQuery.refetch()}
                className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-md bg-neutral-950 px-3 text-xs font-bold text-white hover:bg-neutral-800"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                다시 확인
              </button>
            </div>
          </div>
        </section>
      </AdminLayout>
    );
  }

  return <>{children}</>;
};

const AdminLoading = () => (
  <div className="grid min-h-screen place-items-center bg-neutral-100">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-emerald-600" />
  </div>
);

export default AdminProtectedRoute;
