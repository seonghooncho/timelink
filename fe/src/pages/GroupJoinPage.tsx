import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MobileLayout from '@/components/layout/MobileLayout';
import { groupApi } from '@/services/api';
import { appToast } from '@/lib/appToast';

const GroupJoinPage: React.FC = () => {
  const navigate = useNavigate();
  const { inviteCode } = useParams<{ inviteCode: string }>();

  useEffect(() => {
    if (!inviteCode) {
      navigate('/groups', { replace: true });
      return;
    }

    groupApi.join(inviteCode)
      .then((group) => {
        appToast.success(`${group.name} 모임에 참여했습니다`);
        navigate(`/groups/${group.id}`, { replace: true });
      })
      .catch((error) => {
        appToast.error('초대 링크가 유효하지 않거나 이미 참여한 모임입니다', error);
        navigate('/groups', { replace: true });
      });
  }, [inviteCode, navigate]);

  return (
    <MobileLayout hideNav>
      <div className="min-h-screen flex items-center justify-center px-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <div>
            <p className="text-sm font-semibold text-foreground">모임에 참여하는 중입니다</p>
            <p className="text-xs text-muted-foreground mt-1">초대 코드를 확인하고 있어요.</p>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
};

export default GroupJoinPage;
