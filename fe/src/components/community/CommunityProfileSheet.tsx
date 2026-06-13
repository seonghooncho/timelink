import React from 'react';
import { ChevronRight, Users, X } from 'lucide-react';
import GroupAvatar from '@/components/common/GroupAvatar';
import ScrollableFadeList from '@/components/common/ScrollableFadeList';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatRelativeTime } from '@/lib/relativeTime';
import type { CommunityPublicProfileResponse } from '@/services/api';

interface CommunityProfileSheetProps {
  open: boolean;
  profile: CommunityPublicProfileResponse | null;
  isLoading?: boolean;
  onClose: () => void;
  onGroupClick: (groupId: string) => void;
  onActivityClick: (postId: string) => void;
}

const CommunityProfileSheet: React.FC<CommunityProfileSheetProps> = ({
  open,
  profile,
  isLoading = false,
  onClose,
  onGroupClick,
  onActivityClick,
}) => {
  if (!open) return null;

  const displayName = profile?.nickname || '사용자';

  return (
    <div className="fixed inset-x-0 top-0 app-layer-overlay flex items-end justify-center bg-black/50 app-bottom-sheet-root" onClick={onClose}>
      <div
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-card shadow-elevated animate-fade-in app-bottom-sheet-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-foreground">프로필</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">공개 활동과 공개 모임을 확인합니다.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 px-5 py-4">
          {isLoading || !profile ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-20 w-20 border border-border/70">
                  <AvatarImage src={profile.thumbnailUrl || profile.avatarUrl} alt={displayName} />
                  <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
                    {displayName.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="mt-3 max-w-[14rem] truncate text-base font-bold text-foreground">{displayName}</p>
              </div>

              <div>
                <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  가입 중인 공개 모임
                </div>
                {profile.publicGroups.length > 0 ? (
                  <ScrollableFadeList ariaLabel="가입 중인 공개 모임" maxHeightClassName="max-h-56" contentClassName="space-y-0">
                    {profile.publicGroups.map((group) => (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => onGroupClick(group.id)}
                        className="flex w-full items-center gap-3 border-b border-border/60 py-3 text-left transition-colors hover:bg-muted/25"
                      >
                        <GroupAvatar image={group.imageUrl} thumbnail={group.thumbnailUrl} name={group.name} status={group.imageStatus} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-foreground">{group.name}</p>
                          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                            {group.myRole ? '참여 중인 모임' : group.joinRequestStatus === 'PENDING' ? '가입요청 대기 중' : '소개 페이지에서 가입을 요청할 수 있어요'}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </button>
                    ))}
                  </ScrollableFadeList>
                ) : (
                  <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
                    공개된 참여 모임이 없습니다.
                  </p>
                )}
              </div>

              <div>
                <div className="mb-2 text-xs font-bold text-foreground">최근 활동</div>
                {profile.recentActivities.length > 0 ? (
                  <ScrollableFadeList ariaLabel="최근 활동" maxHeightClassName="max-h-56" contentClassName="space-y-0">
                    {profile.recentActivities.map((activity) => (
                      <button
                        key={`${activity.type}-${activity.id}`}
                        type="button"
                        onClick={() => onActivityClick(activity.id)}
                        className="w-full border-b border-border/60 py-3 text-left transition-colors hover:bg-muted/25"
                      >
                        <p className="line-clamp-1 text-sm font-semibold text-foreground">{activity.title || '제목 없는 글'}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">게시글 · {formatRelativeTime(activity.createdAt)}</p>
                      </button>
                    ))}
                  </ScrollableFadeList>
                ) : (
                  <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
                    공개된 최근 활동이 없습니다.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommunityProfileSheet;
