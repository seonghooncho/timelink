import React, { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, MessageCircle, X } from 'lucide-react';
import MobileLayout from '@/components/layout/MobileLayout';
import PageHeader from '@/components/layout/PageHeader';
import PostListItem from '@/components/community/PostListItem';
import PostImageAttachment from '@/components/community/PostImageAttachment';
import CommunityProfileSheet from '@/components/community/CommunityProfileSheet';
import FAB from '@/components/common/FAB';
import ImageCropModal from '@/components/common/ImageCropModal';
import { Textarea } from '@/components/ui/textarea';
import { useCommunityPosts, useCreateCommunityPost } from '@/hooks/useCommunity';
import { communityApi, CommunityPublicProfileResponse } from '@/services/api';
import { appToast } from '@/lib/appToast';
import { COMMUNITY_POST_TITLE_MAX_LENGTH } from '@/lib/textLimits';
import { uploadProcessedImage, validateImageFile, waitForImageProcessing } from '@/lib/images';

const CommunityPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const {
    data: posts = [],
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCommunityPosts();
  const createPost = useCreateCommunityPost();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [imageCropFile, setImageCropFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [profileTarget, setProfileTarget] = useState<CommunityPublicProfileResponse | null>(null);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const resetImage = () => {
    setImagePreview(null);
    setImageFile(null);
    setImageCropFile(null);
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const validationMessage = validateImageFile(file);
    if (validationMessage) {
      appToast.error(validationMessage);
      event.target.value = '';
      return;
    }
    setImageCropFile(file);
    event.target.value = '';
  };

  const handleImageCropConfirm = (file: File, previewUrl: string) => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(file);
    setImagePreview(previewUrl);
    setImageCropFile(null);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setTitle('');
    setContent('');
    setAnonymous(false);
    resetImage();
  };

  const openProfile = async (userId?: string) => {
    if (!userId) return;
    setProfileTarget(null);
    setShowProfileSheet(true);
    setIsProfileLoading(true);
    try {
      setProfileTarget(await communityApi.getPublicProfile(userId));
    } catch (error) {
      appToast.error('프로필을 불러오지 못했습니다', error);
      setShowProfileSheet(false);
    } finally {
      setIsProfileLoading(false);
    }
  };

  const handleCreate = async () => {
    const nextTitle = title.trim();
    const nextContent = content.trim();
    if (!nextTitle) {
      appToast.error('제목을 입력해주세요');
      return;
    }
    if (!nextContent) {
      appToast.error('본문을 입력해주세요');
      return;
    }

    try {
      const post = await createPost.mutateAsync({ title: nextTitle, content: nextContent, anonymous });
      if (imageFile) {
        setIsImageUploading(true);
        try {
          const uploaded = await uploadProcessedImage('COMMUNITY_POST', imageFile, post.id);
          await communityApi.updatePost(post.id, { imageId: uploaded.imageId });
          await queryClient.invalidateQueries({ queryKey: ['community', 'posts'] });
          void waitForImageProcessing(uploaded.imageId).then(() => {
            queryClient.invalidateQueries({ queryKey: ['community', 'posts'] });
            queryClient.invalidateQueries({ queryKey: ['community', 'posts', post.id] });
          }).catch(() => undefined);
        } catch (error) {
          appToast.error('게시물은 등록됐지만 이미지를 첨부하지 못했습니다', error);
        } finally {
          setIsImageUploading(false);
        }
      }
      closeCreateModal();
      appToast.success('게시물을 등록했습니다');
      navigate(`/community/posts/${post.id}`);
    } catch (error) {
      appToast.error('게시물을 등록하지 못했습니다', error);
    }
  };

  return (
    <MobileLayout>
      <PageHeader title="커뮤니티" rightElement={
        <button onClick={() => navigate('/notifications')} className="rounded-xl p-2 text-muted-foreground transition-all hover:bg-muted">
          <Bell className="h-5 w-5" />
        </button>
      } />

      <div className="py-4">
        <section className="px-5">
          <div>
            <p className="min-w-0 text-xs leading-5 text-muted-foreground">
              약속, 일정 조율, 모임 운영 이야기를 자유롭게 나눠보세요.
            </p>
          </div>
        </section>

        <div className="mt-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-5 py-14 text-center">
              <MessageCircle className="h-8 w-8 text-muted-foreground" />
              <h3 className="mt-4 text-sm font-bold text-foreground">아직 게시물이 없습니다</h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                첫 글을 남기고 Timelink 사용자들과 이야기를 시작해보세요.
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <PostListItem
                key={post.id}
                post={post}
                onClick={() => navigate(`/community/posts/${post.id}`)}
                onAuthorClick={() => openProfile(post.authorUserId)}
              />
            ))
          )}

          {!isLoading && hasNextPage ? (
            <button
              type="button"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="mx-5 mt-3 w-[calc(100%-2.5rem)] border-y border-border/60 py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              {isFetchingNextPage ? '불러오는 중...' : '게시물 더보기'}
            </button>
          ) : null}
        </div>
      </div>

      <FAB onClick={() => setShowCreateModal(true)} variant="community" ariaLabel="글쓰기" />

      {showCreateModal ? (
        <div className="fixed inset-x-0 top-0 app-layer-overlay flex items-end justify-center bg-black/50 app-bottom-sheet-root" onClick={closeCreateModal}>
          <div
            className="flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-card shadow-elevated animate-fade-in app-bottom-sheet-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="text-base font-bold text-foreground">게시물 작성</h3>
              <button
                type="button"
                onClick={closeCreateModal}
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">제목</label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={COMMUNITY_POST_TITLE_MAX_LENGTH}
                  className="w-full rounded-xl border border-border bg-muted px-3 py-3 text-base outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="제목을 입력해주세요"
                />
                <p className="text-right text-[10px] text-muted-foreground">{title.length}/{COMMUNITY_POST_TITLE_MAX_LENGTH}</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">본문</label>
                <Textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  maxLength={2000}
                  rows={7}
                  className="resize-none rounded-xl bg-muted text-base"
                  placeholder="나누고 싶은 이야기를 적어주세요."
                />
                <p className="text-right text-[10px] text-muted-foreground">{content.length}/2000</p>
              </div>

              <button
                type="button"
                onClick={() => setAnonymous((prev) => !prev)}
                className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-3 text-left transition-colors ${anonymous ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-background text-muted-foreground'}`}
              >
                <span className="text-xs font-bold">익명으로 작성하기</span>
                <span className={`h-5 w-9 rounded-full p-0.5 transition-colors ${anonymous ? 'bg-primary' : 'bg-muted-foreground/25'}`}>
                  <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${anonymous ? 'translate-x-4' : ''}`} />
                </span>
              </button>

              <PostImageAttachment
                previewUrl={imagePreview}
                isUploading={isImageUploading}
                onSelect={() => imageInputRef.current?.click()}
                onRemove={resetImage}
              />
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageSelect}
                className="hidden"
              />

              <button
                type="button"
                onClick={handleCreate}
                disabled={createPost.isPending || isImageUploading}
                className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                {createPost.isPending || isImageUploading ? '등록 중...' : '등록하기'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {imageCropFile ? (
        <ImageCropModal
          file={imageCropFile}
          title="게시물 이미지 편집"
          description="게시물에 보일 영역을 맞춰주세요."
          outputNamePrefix="community-post"
          aspectRatio={1}
          onClose={() => setImageCropFile(null)}
          onConfirm={handleImageCropConfirm}
        />
      ) : null}

      <CommunityProfileSheet
        open={showProfileSheet}
        profile={profileTarget}
        isLoading={isProfileLoading}
        onClose={() => setShowProfileSheet(false)}
        onGroupClick={(groupId) => {
          setShowProfileSheet(false);
          navigate(`/groups/${groupId}/intro`);
        }}
        onActivityClick={(activityPostId) => {
          setShowProfileSheet(false);
          navigate(`/community/posts/${activityPostId}`);
        }}
      />
    </MobileLayout>
  );
};

export default CommunityPage;
