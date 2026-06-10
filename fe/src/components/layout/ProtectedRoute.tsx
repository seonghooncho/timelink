import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
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
      return <Navigate to="/login" replace />;
    }

    if (!profileQuery.data?.requiredConsentCompleted) {
      const redirect = `${location.pathname}${location.search}`;
      return <Navigate to={`/consent?redirect=${encodeURIComponent(redirect)}`} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
