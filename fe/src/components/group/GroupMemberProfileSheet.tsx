import React, { useEffect, useRef, useState } from 'react';
import { Camera, Edit3, X } from 'lucide-react';
import ImageCropModal from '@/components/common/ImageCropModal';
import ScrollableFadeList from '@/components/common/ScrollableFadeList';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { appToast } from '@/lib/appToast';
import { formatRelativeTime } from '@/lib/relativeTime';
import { getProcessingImageLabel, uploadProcessedImage, validateImageFile, waitForImageProcessing } from '@/lib/images';
import type { GroupMemberProfileResponse } from '@/services/api';

interface GroupMemberProfileSheetProps {
  open: boolean;
  groupId: string;
  profile: GroupMemberProfileResponse | null;
  editable?: boolean;
  isLoading?: boolean;
  isSaving?: boolean;
  onClose: () => void;
  onSave?: (data: { nickname?: string; avatarUrl?: string; imageId?: string }) => Promise<GroupMemberProfileResponse | void>;
}

const NAME_MAX_LENGTH = 20;

const GroupMemberProfileSheet: React.FC<GroupMemberProfileSheetProps> = ({
  open,
  groupId,
  profile,
  editable = false,
  isLoading = false,
  isSaving = false,
  onClose,
  onSave,
}) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [draftNickname, setDraftNickname] = useState('');
  const [draftImageId, setDraftImageId] = useState<string | undefined>();
  const [draftAvatarUrl, setDraftAvatarUrl] = useState<string | undefined>();
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!open || !profile) return;
    setDraftNickname(profile.nickname || '');
    setDraftImageId(profile.imageId);
    setDraftAvatarUrl(profile.thumbnailUrl || profile.avatarUrl);
  }, [open, profile]);

  useEffect(() => {
    return () => {
      if (draftAvatarUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(draftAvatarUrl);
      }
    };
  }, [draftAvatarUrl]);

  if (!open) return null;

  const displayName = profile?.nickname || profile?.userId || '멤버';
  const avatarUrl = editable ? draftAvatarUrl : (profile?.thumbnailUrl || profile?.avatarUrl);
  const fallback = displayName.slice(0, 1).toUpperCase();
  const statusLabel = getProcessingImageLabel(profile?.imageStatus);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const validationMessage = validateImageFile(file);
    if (validationMessage) {
      appToast.error(validationMessage);
      event.target.value = '';
      return;
    }
    setCropFile(file);
  };

  const handleCropConfirm = async (file: File, previewUrl: string) => {
    if (!profile) return;
    if (draftAvatarUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(draftAvatarUrl);
    }
    setCropFile(null);
    setDraftAvatarUrl(previewUrl);
    setIsUploading(true);
    try {
      const uploaded = await uploadProcessedImage('MEMBER', file, `GROUP_MEMBER#${groupId}#${profile.userId}`);
      setDraftImageId(uploaded.imageId);
      appToast.info('이미지 처리 중입니다. 저장하면 완료 후 반영됩니다.');
    } catch (error) {
      URL.revokeObjectURL(previewUrl);
      setDraftAvatarUrl(profile.thumbnailUrl || profile.avatarUrl);
      appToast.error('프로필 이미지를 업로드하지 못했습니다', error);
    } finally {
      setIsUploading(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  const handleSave = async () => {
    const saveProfile = onSave;
    if (!saveProfile || !profile) return;
    const nickname = draftNickname.trim();
    if (!nickname) {
      appToast.error('모임 프로필 이름을 입력해주세요');
      return;
    }
    if (nickname.length > NAME_MAX_LENGTH) {
      appToast.error(`모임 프로필 이름은 ${NAME_MAX_LENGTH}자 이하로 입력해주세요`);
      return;
    }

    try {
      const saved = await saveProfile({
        nickname,
        imageId: draftImageId,
      });
      const imageId = draftImageId || saved?.imageId;
      if (imageId) {
        void waitForImageProcessing(imageId).then(async (processed) => {
          if (processed.status === 'COMPLETED') {
            await saveProfile({ nickname, imageId });
          } else if (processed.status === 'FAILED') {
            appToast.error('프로필 이미지 처리에 실패했습니다');
          }
        }).catch(() => undefined);
      }
    } catch (error) {
      appToast.error('모임 프로필을 저장하지 못했습니다', error);
    }
  };

  return (
    <>
      <div className="fixed inset-x-0 top-0 app-layer-overlay flex items-end justify-center bg-black/50 app-bottom-sheet-root" onClick={onClose}>
        <div
          className="flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-card shadow-elevated animate-fade-in app-bottom-sheet-panel"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-foreground">
                {editable ? '모임 프로필 수정' : '멤버 프로필'}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {editable ? '이 모임에서 보일 이름과 사진을 설정합니다.' : '모임 안에서의 활동을 확인합니다.'}
              </p>
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
                  <div className="relative">
                    <Avatar className="h-20 w-20 border border-border/70">
                      <AvatarImage src={avatarUrl} alt={displayName} />
                      <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
                        {fallback}
                      </AvatarFallback>
                    </Avatar>
                    {editable ? (
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={isUploading}
                        className="absolute -bottom-1 -right-1 rounded-full bg-primary p-2 text-primary-foreground shadow-soft disabled:opacity-50"
                        aria-label="모임 프로필 사진 변경"
                      >
                        {isUploading ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          <Camera className="h-4 w-4" />
                        )}
                      </button>
                    ) : null}
                  </div>

                  {editable ? (
                    <div className="mt-4 w-full space-y-1.5">
                      <Input
                        value={draftNickname}
                        onChange={(event) => setDraftNickname(event.target.value)}
                        maxLength={NAME_MAX_LENGTH}
                        className="rounded-xl bg-muted text-center text-base font-bold"
                        placeholder="모임 프로필 이름"
                      />
                      <p className="text-right text-[10px] text-muted-foreground">
                        {draftNickname.length}/{NAME_MAX_LENGTH}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3 min-w-0">
                      <p className="max-w-[14rem] truncate text-base font-bold text-foreground">{displayName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {profile.role === 'manager' ? '관리자' : '멤버'}
                        {profile.joinedAt ? ` · ${new Date(profile.joinedAt).toLocaleDateString('ko-KR')} 가입` : ''}
                      </p>
                    </div>
                  )}
                  {statusLabel ? (
                    <p className="mt-2 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                      {statusLabel}
                    </p>
                  ) : null}
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Edit3 className="h-3.5 w-3.5 text-primary" />
                    최근 활동
                  </div>
                  {profile.recentActivities?.length > 0 ? (
                    <ScrollableFadeList ariaLabel="최근 활동" maxHeightClassName="max-h-48" contentClassName="space-y-0">
                      {profile.recentActivities.map((activity) => (
                        <div key={`${activity.type}-${activity.id}`} className="border-b border-border/60 py-3 last:border-b-0">
                          <p className="line-clamp-1 text-sm font-semibold text-foreground">{activity.title || '제목 없는 글'}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            게시글 · {formatRelativeTime(activity.createdAt)}
                          </p>
                        </div>
                      ))}
                    </ScrollableFadeList>
                  ) : (
                    <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
                      아직 모임 활동이 없습니다.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {editable ? (
            <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-border px-5 py-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-muted py-3 text-sm font-semibold text-foreground"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || isUploading || !profile}
                className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                {isSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleImageSelect}
        className="hidden"
      />

      {cropFile ? (
        <ImageCropModal
          file={cropFile}
          title="모임 프로필 사진 편집"
          description="멤버 목록에 보일 영역을 맞춰주세요."
          outputNamePrefix="group-member"
          aspectRatio={1}
          onClose={() => setCropFile(null)}
          onConfirm={handleCropConfirm}
        />
      ) : null}
    </>
  );
};

export default GroupMemberProfileSheet;
