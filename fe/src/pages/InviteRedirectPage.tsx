import React, { useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import MobileLayout from '@/components/layout/MobileLayout';

const InviteRedirectPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { inviteCode } = useParams<{ inviteCode: string }>();

  useEffect(() => {
    if (!inviteCode) {
      navigate('/groups', { replace: true });
      return;
    }

    const params = new URLSearchParams(location.search);
    const coordId = params.get('coord');
    const query = coordId ? `?coord=${encodeURIComponent(coordId)}` : '';
    navigate(`/groups/join/${encodeURIComponent(inviteCode)}${query}`, { replace: true });
  }, [inviteCode, location.search, navigate]);

  return (
    <MobileLayout hideNav>
      <div className="flex min-h-screen items-center justify-center px-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <div>
            <p className="text-sm font-semibold text-foreground">초대 링크를 확인하고 있어요</p>
            <p className="mt-1 text-xs text-muted-foreground">곧 모임 참여 화면으로 이동합니다.</p>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
};

export default InviteRedirectPage;
