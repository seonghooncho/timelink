import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import MobileLayout from '@/components/layout/MobileLayout';
import { groupApi } from '@/services/api';
import { appToast } from '@/lib/appToast';
import { isSafeInternalPath } from '@/lib/navigationTargets';

type JoinStatus = 'joining' | 'error';

const GroupJoinPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const [status, setStatus] = useState<JoinStatus>('joining');
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);

  useEffect(() => {
    if (!inviteCode) {
      navigate('/groups', { replace: true });
      return;
    }

    const redirect = params.get('redirect');
    const coordId = params.get('coord');

    groupApi.join(inviteCode)
      .then((group) => {
        appToast.success(`${group.name} 모임에 참여했습니다`);
        const safeRedirect = isSafeInternalPath(redirect) ? redirect : null;
        const destination = safeRedirect
          || (coordId ? `/groups/${group.id}/coordination/${encodeURIComponent(coordId)}/timetable` : `/groups/${group.id}`);
        navigate(destination, { replace: true });
      })
      .catch((error) => {
        appToast.error('초대 링크가 유효하지 않거나 만료되었습니다', error);
        setStatus('error');
      });
  }, [inviteCode, navigate, params]);

  if (status === 'error') {
    return (
      <MobileLayout hideNav>
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 text-center shadow-soft">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-primary">
              !
            </div>
            <h1 className="mt-4 text-base font-bold text-foreground">초대 링크를 사용할 수 없습니다</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              링크가 만료되었거나 이미 처리된 초대일 수 있어요. 모임 관리자에게 새 링크를 요청하거나 공개 모임을 둘러보세요.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => navigate('/groups?tab=discover', { replace: true })}
                className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground"
              >
                모임 둘러보기
              </button>
              <button
                type="button"
                onClick={() => navigate('/notifications', { replace: true })}
                className="rounded-xl border border-border bg-background py-3 text-sm font-semibold text-foreground"
              >
                알림 보기
              </button>
            </div>
          </div>
        </div>
      </MobileLayout>
    );
  }

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
