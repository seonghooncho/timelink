import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, Heart, MessageCircle } from 'lucide-react';
import MobileLayout from '@/components/layout/MobileLayout';
import PageHeader from '@/components/layout/PageHeader';
import PostListItem from '@/components/community/PostListItem';
import PostComposerModal from '@/components/community/PostComposerModal';
import CommunityProfileSheet from '@/components/community/CommunityProfileSheet';
import FAB from '@/components/common/FAB';
import ImageCropModal from '@/components/common/ImageCropModal';
import { ListSkeleton } from '@/components/common/LoadingStates';
import { useCommunityPosts, useCreateCommunityPost, useToggleCommunityLike } from '@/hooks/useCommunity';
import { communityApi, CommunityPostResponse, CommunityPublicProfileResponse } from '@/services/api';
import { appToast } from '@/lib/appToast';
import { uploadProcessedImage, validateImageFile, waitForImageProcessing } from '@/lib/images';

const CommunityPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    data: posts = [],
    isLoading,
    isPending,
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
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
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
          {isLoading || isPending ? (
            <div className="px-5">
              <ListSkeleton count={4} showAvatar={false} itemClassName="px-0" />
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
              <CommunityPostListItem
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

      <FAB
        onClick={() => setShowCreateModal(true)}
        variant="community"
        ariaLabel="글쓰기"
        icon={<MessageCircle className="h-6 w-6" />}
      />

      <PostComposerModal
        open={showCreateModal}
        title={title}
        content={content}
        onTitleChange={setTitle}
        onContentChange={setContent}
        onClose={closeCreateModal}
        onSubmit={handleCreate}
        isSubmitting={createPost.isPending || isImageUploading}
        imagePreview={imagePreview}
        isImageUploading={isImageUploading}
        onImageSelect={handleImageSelect}
        onImageRemove={resetImage}
        anonymous={anonymous}
        onAnonymousChange={setAnonymous}
      />

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

interface CommunityPostListItemProps {
  post: CommunityPostResponse;
  onClick: () => void;
  onAuthorClick: () => void;
}

const CommunityPostListItem: React.FC<CommunityPostListItemProps> = ({ post, onClick, onAuthorClick }) => {
  const toggleLike = useToggleCommunityLike(post.id);

  const handleToggleLike = async () => {
    try {
      await toggleLike.mutateAsync(post.likedByMe);
    } catch (error) {
      appToast.error('좋아요 상태를 변경하지 못했습니다', error);
    }
  };

  return (
    <PostListItem
      post={post}
      onClick={onClick}
      onAuthorClick={onAuthorClick}
      actions={
        <>
          <button
            type="button"
            onClick={handleToggleLike}
            disabled={toggleLike.isPending}
            aria-label={post.likedByMe ? '좋아요 취소' : '좋아요'}
            className={`flex h-8 items-center gap-1.5 rounded-xl border px-2.5 text-[11px] font-bold transition-colors ${
              post.likedByMe
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-border bg-background text-muted-foreground hover:text-foreground'
            } disabled:opacity-50`}
          >
            <Heart className={`h-3.5 w-3.5 ${post.likedByMe ? 'fill-primary' : ''}`} />
            {post.likeCount ?? 0}
          </button>
          <button
            type="button"
            onClick={onClick}
            className="flex h-8 items-center gap-1.5 rounded-xl border border-transparent px-1 text-[11px] font-bold text-muted-foreground transition-colors hover:text-foreground"
            aria-label={`댓글 ${post.commentCount ?? 0}개 보기`}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            댓글 {post.commentCount ?? 0}개
          </button>
        </>
      }
    />
  );
};

export default CommunityPage;
