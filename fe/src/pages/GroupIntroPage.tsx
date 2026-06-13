import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Camera, ChevronRight, Heart, ImageIcon, Lock, MessageCircle, Plus, Users, X } from 'lucide-react';
import MobileLayout from '@/components/layout/MobileLayout';
import PageHeader from '@/components/layout/PageHeader';
import GroupAvatar from '@/components/common/GroupAvatar';
import ImageCropModal from '@/components/common/ImageCropModal';
import { ListSkeleton } from '@/components/common/LoadingStates';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { groupApi, GroupIntroImageResponse, GroupIntroPostResponse, GroupIntroResponse, GroupMemberResponse } from '@/services/api';
import { appToast } from '@/lib/appToast';
import { formatRelativeTime } from '@/lib/relativeTime';
import { uploadProcessedImage, validateImageFile, waitForImageProcessing } from '@/lib/images';
import { GROUP_NOTICE_TITLE_MAX_LENGTH } from '@/lib/textLimits';

const MAX_INTRO_IMAGES = 10;
const INTRO_POST_PAGE_LIMIT = 3;
type IntroFeedTab = 'all' | 'notices';

const GroupIntroPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');
  const [showEditIntro, setShowEditIntro] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editIntroText, setEditIntroText] = useState('');
  const [editGroupVisibility, setEditGroupVisibility] = useState<'PRIVATE' | 'PUBLIC'>('PRIVATE');
  const [editImages, setEditImages] = useState<GroupIntroImageResponse[]>([]);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [isIntroImageUploading, setIsIntroImageUploading] = useState(false);
  const [isSavingGroupInfo, setIsSavingGroupInfo] = useState(false);
  const [showNoticeComposer, setShowNoticeComposer] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [feedTab, setFeedTab] = useState<IntroFeedTab>('all');

  const { data: intro, isLoading } = useQuery({
    queryKey: ['groups', id, 'intro'],
    queryFn: () => groupApi.getIntro(id as string),
    enabled: Boolean(id),
  });

  const updateIntro = useMutation({
    mutationFn: (data: { introText?: string; imageIds?: string[] }) => groupApi.updateIntro(id as string, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', id, 'intro'] });
    },
  });

  const createNotice = useMutation({
    mutationFn: (data: { title: string; content: string }) => groupApi.createNotice(id as string, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', id, 'intro'] });
    },
  });

  const requestJoin = useMutation({
    mutationFn: (message: string) => groupApi.requestToJoin(id as string, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', id, 'intro'] });
      queryClient.invalidateQueries({ queryKey: ['groups', 'public'] });
    },
  });

  const {
    data: introPosts = [],
    isLoading: isIntroPostsLoading,
    fetchNextPage: fetchNextIntroPostPage,
    hasNextPage: hasNextIntroPostPage,
    isFetchingNextPage: isFetchingNextIntroPostPage,
  } = useInfiniteQuery({
    queryKey: ['groups', id, 'intro', 'posts', INTRO_POST_PAGE_LIMIT],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => groupApi.getIntroPosts(id as string, {
      limit: INTRO_POST_PAGE_LIMIT,
      cursor: pageParam,
    }),
    getNextPageParam: (lastPage) => lastPage.meta?.nextCursor ?? undefined,
    select: (data) => data.pages.flatMap(page => page.data),
    enabled: Boolean(id && intro),
  });

  const completedImages = useMemo(
    () => (intro?.images || []).filter((image) => image.url && image.status === 'COMPLETED'),
    [intro?.images],
  );

  const memberCountLabel = intro && intro.memberCount > 99 ? '99+' : String(intro?.memberCount ?? 0);

  useEffect(() => {
    if (!intro) return;
    setActiveImageIndex(0);
    if (!showEditIntro) {
      setEditGroupName(intro.name);
      setEditIntroText(intro.introText || intro.description || '');
      setEditGroupVisibility(intro.visibility ?? 'PRIVATE');
      setEditImages(intro.images || []);
    }
  }, [intro, showEditIntro]);

  const openEditGroupInfo = () => {
    if (!intro) return;
    setEditGroupName(intro.name);
    setEditIntroText(intro.introText || intro.description || '');
    setEditGroupVisibility(intro.visibility ?? 'PRIVATE');
    setEditImages(intro.images || []);
    setShowEditIntro(true);
  };

  const openJoinModal = () => {
    if (intro?.joinRequestStatus === 'PENDING') {
      appToast.info('이미 가입요청을 보냈습니다');
      return;
    }
    setJoinMessage('');
    setShowJoinModal(true);
  };

  const handleSubmitJoin = async () => {
    if (!intro) return;
    if (joinMessage.length > 200) {
      appToast.error('인삿말은 200자 이하로 입력해주세요');
      return;
    }

    try {
      await requestJoin.mutateAsync(joinMessage.trim());
      setShowJoinModal(false);
      appToast.success('가입요청을 보냈습니다');
    } catch (error) {
      appToast.error('가입요청을 보내지 못했습니다', error);
    }
  };

  const handleIntroPostClick = (post: GroupIntroPostResponse) => {
    if (post.locked) {
      openJoinModal();
      return;
    }
    if (!intro?.member) {
      openJoinModal();
      return;
    }
    navigate(`/groups/${id}`);
  };

  const handleMemberPreviewMore = () => {
    if (intro?.member) {
      navigate(`/groups/${id}`);
      return;
    }
    openJoinModal();
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (editImages.length >= MAX_INTRO_IMAGES) {
      appToast.error('소개 이미지는 최대 10장까지 등록할 수 있습니다');
      event.target.value = '';
      return;
    }
    const validationMessage = validateImageFile(file);
    if (validationMessage) {
      appToast.error(validationMessage);
      event.target.value = '';
      return;
    }
    setCropFile(file);
  };

  const handleIntroImageCropConfirm = async (file: File, previewUrl: string) => {
    if (!id) return;
    setCropFile(null);
    setIsIntroImageUploading(true);
    try {
      const uploaded = await uploadProcessedImage('GROUP_INTRO', file, id);
      setEditImages((prev) => [...prev, {
        imageId: uploaded.imageId,
        url: previewUrl,
        status: uploaded.status,
      }].slice(0, MAX_INTRO_IMAGES));
      void waitForImageProcessing(uploaded.imageId).then(() => {
        queryClient.invalidateQueries({ queryKey: ['groups', id, 'intro'] });
      }).catch(() => undefined);
    } catch (error) {
      URL.revokeObjectURL(previewUrl);
      appToast.error('소개 이미지를 업로드하지 못했습니다', error);
    } finally {
      setIsIntroImageUploading(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  const handleSaveIntro = async () => {
    if (!id || !intro) return;
    const name = editGroupName.trim();
    const introText = editIntroText.trim();

    if (!name) {
      appToast.error('모임 이름을 입력해주세요');
      return;
    }

    setIsSavingGroupInfo(true);
    try {
      await groupApi.update(id, {
        name,
        description: introText,
        visibility: editGroupVisibility,
      });
      await updateIntro.mutateAsync({
        introText,
        imageIds: editImages.map((image) => image.imageId),
      });
      await queryClient.invalidateQueries({ queryKey: ['groups'] });
      await queryClient.invalidateQueries({ queryKey: ['groups', 'public'] });
      setShowEditIntro(false);
      appToast.success('모임 정보를 저장했습니다');
    } catch (error) {
      appToast.error('모임 정보를 저장하지 못했습니다', error);
    } finally {
      setIsSavingGroupInfo(false);
    }
  };

  const handleCreateNotice = async () => {
    const title = noticeTitle.trim();
    const content = noticeContent.trim();
    if (!title) {
      appToast.error('공지 제목을 입력해주세요');
      return;
    }
    if (!content) {
      appToast.error('공지 내용을 입력해주세요');
      return;
    }

    try {
      await createNotice.mutateAsync({ title, content });
      setNoticeTitle('');
      setNoticeContent('');
      setShowNoticeComposer(false);
      appToast.success('공지사항을 등록했습니다');
    } catch (error) {
      appToast.error('공지사항을 등록하지 못했습니다', error);
    }
  };

  if (isLoading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </MobileLayout>
    );
  }

  if (!intro) {
    return (
      <MobileLayout>
        <PageHeader title="모임 소개" showBack backTo="/groups" />
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">모임 소개를 찾을 수 없습니다.</p>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <PageHeader
        title="모임 소개"
        showBack
        backTo="/groups"
        rightElement={intro.member ? (
          <button
            type="button"
            onClick={() => navigate(`/groups/${id}`)}
            className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
          >
            모임으로
          </button>
        ) : null}
      />

      <section className="px-5 pb-4">
        <IntroHero
          intro={intro}
          images={completedImages}
          activeIndex={activeImageIndex}
          onActiveIndexChange={setActiveImageIndex}
          memberCountLabel={memberCountLabel}
        />

        <div className="mt-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-foreground">{intro.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <VisibilityBadge visibility={intro.visibility ?? 'PRIVATE'} />
              <span className="inline-flex items-center gap-1">
                <Users className="h-4 w-4" />
                {memberCountLabel}명 참여 중
              </span>
            </div>
          </div>
          {intro.canEditIntro ? (
            <button
              type="button"
              onClick={openEditGroupInfo}
              className="shrink-0 rounded-xl border border-border px-3 py-2 text-xs font-bold text-foreground"
            >
              정보수정
            </button>
          ) : null}
        </div>

        <p className="mt-4 whitespace-pre-line text-sm leading-7 text-foreground">
          {intro.introText || intro.description || '아직 모임 소개가 없습니다.'}
        </p>

        <MemberPreviewStrip
          members={intro.memberPreviews || []}
          memberCount={intro.memberCount}
          onMore={handleMemberPreviewMore}
        />

        {!intro.member ? (
          <button
            type="button"
            onClick={openJoinModal}
            disabled={intro.joinRequestStatus === 'PENDING'}
            className="mt-5 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-55"
          >
            {intro.joinRequestStatus === 'PENDING' ? '가입요청 완료' : '가입 요청하기'}
          </button>
        ) : null}
      </section>

      <IntroSection
        title="모임 글"
        action={(
          <div className="flex items-center gap-1 rounded-full bg-muted p-0.5">
            <button
              type="button"
              onClick={() => setFeedTab('all')}
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${feedTab === 'all' ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground'}`}
            >
              전체
            </button>
            <button
              type="button"
              onClick={() => setFeedTab('notices')}
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${feedTab === 'notices' ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground'}`}
            >
              공지사항
            </button>
          </div>
        )}
      >
        {feedTab === 'notices' ? (
          <NoticeList
            intro={intro}
            showComposer={showNoticeComposer}
            noticeTitle={noticeTitle}
            noticeContent={noticeContent}
            isSubmitting={createNotice.isPending}
            onToggleComposer={() => setShowNoticeComposer((prev) => !prev)}
            onNoticeTitleChange={setNoticeTitle}
            onNoticeContentChange={setNoticeContent}
            onSubmit={handleCreateNotice}
          />
        ) : (
          <IntroPostList
            posts={introPosts}
            member={intro.member}
            isLoading={isIntroPostsLoading}
            hasNextPage={Boolean(hasNextIntroPostPage)}
            isFetchingNextPage={isFetchingNextIntroPostPage}
            onLoadMore={() => fetchNextIntroPostPage()}
            onPostClick={handleIntroPostClick}
          />
        )}
      </IntroSection>

      <div className="h-20" aria-hidden="true" />

      {showJoinModal ? (
        <JoinRequestSheet
          intro={intro}
          message={joinMessage}
          isSubmitting={requestJoin.isPending}
          onMessageChange={setJoinMessage}
          onClose={() => setShowJoinModal(false)}
          onSubmit={handleSubmitJoin}
        />
      ) : null}

      {showEditIntro ? (
        <div className="fixed inset-x-0 top-0 app-layer-overlay flex items-end justify-center bg-black/50 app-bottom-sheet-root" onClick={() => setShowEditIntro(false)}>
          <div
            className="flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-card shadow-elevated animate-fade-in app-bottom-sheet-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
              <div className="min-w-0">
                <h3 className="truncate text-base font-bold text-foreground">모임 정보 수정</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">이름, 소개, 공개 설정과 소개 이미지를 관리합니다.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditIntro(false)}
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 scrollbar-thin-soft">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">모임 이름</label>
                <Input
                  value={editGroupName}
                  onChange={(event) => setEditGroupName(event.target.value)}
                  maxLength={30}
                  className="rounded-xl bg-muted text-base"
                  placeholder="모임 이름"
                />
                <p className="text-right text-[10px] text-muted-foreground">{editGroupName.length}/30</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">공개 설정</label>
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1">
                  <button
                    type="button"
                    onClick={() => setEditGroupVisibility('PRIVATE')}
                    className={`rounded-xl px-3 py-2.5 text-xs font-bold transition-colors ${editGroupVisibility === 'PRIVATE' ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground'}`}
                  >
                    비공개
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditGroupVisibility('PUBLIC')}
                    className={`rounded-xl px-3 py-2.5 text-xs font-bold transition-colors ${editGroupVisibility === 'PUBLIC' ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground'}`}
                  >
                    공개
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">모임 소개</label>
                <Textarea
                  value={editIntroText}
                  onChange={(event) => setEditIntroText(event.target.value)}
                  maxLength={200}
                  rows={5}
                  className="resize-none rounded-xl bg-muted text-base"
                  placeholder="모임을 소개해주세요."
                />
                <p className="text-right text-[10px] text-muted-foreground">{editIntroText.length}/200</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">소개 이미지</label>
                <div className="grid grid-cols-3 gap-2">
                  {editImages.map((image) => (
                    <div key={image.imageId} className="relative aspect-square overflow-hidden rounded-xl border border-border bg-muted">
                      {image.url ? (
                        <img src={image.url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditImages((prev) => prev.filter((item) => item.imageId !== image.imageId))}
                        className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white"
                        aria-label="소개 이미지 제거"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {editImages.length < MAX_INTRO_IMAGES ? (
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={isIntroImageUploading}
                      className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-border bg-background text-muted-foreground disabled:opacity-50"
                      aria-label="소개 이미지 추가"
                    >
                      {isIntroImageUploading ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      ) : (
                        <Plus className="h-5 w-5" />
                      )}
                    </button>
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
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-border px-5 py-3">
              <button
                type="button"
                onClick={() => setShowEditIntro(false)}
                className="rounded-xl bg-muted py-3 text-sm font-semibold text-foreground"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSaveIntro}
                disabled={isSavingGroupInfo || updateIntro.isPending || isIntroImageUploading}
                className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                {isSavingGroupInfo || updateIntro.isPending ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {cropFile ? (
        <ImageCropModal
          file={cropFile}
          title="소개 이미지 편집"
          description="소개 페이지에 보일 영역을 맞춰주세요."
          outputNamePrefix="group-intro"
          aspectRatio={4 / 3}
          onClose={() => setCropFile(null)}
          onConfirm={handleIntroImageCropConfirm}
        />
      ) : null}
    </MobileLayout>
  );
};

const MemberPreviewStrip: React.FC<{
  members: GroupMemberResponse[];
  memberCount: number;
  onMore: () => void;
}> = ({ members, memberCount, onMore }) => {
  if (memberCount <= 0) return null;

  const visibleMembers = members.slice(0, 5);

  return (
    <div className="mt-5 border-t border-border/50 pt-3">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">함께하는 멤버</h2>
        <button
          type="button"
          onClick={onMore}
          className="text-xs font-bold text-primary"
        >
          더보기
        </button>
      </div>
      <div className="flex gap-3 overflow-hidden">
        {visibleMembers.length > 0 ? visibleMembers.map((member) => {
          const name = member.nickname || member.userId;
          return (
            <div key={member.id || member.userId} className="w-14 shrink-0 text-center">
              <Avatar className="mx-auto h-12 w-12 border border-border/70">
                <AvatarImage src={member.thumbnailUrl || member.avatarUrl} alt={name} />
                <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                  {name.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className="mt-1.5 truncate text-[11px] font-semibold text-foreground">{name}</p>
            </div>
          );
        }) : (
          <p className="text-xs text-muted-foreground">참여 중인 멤버가 있습니다.</p>
        )}
      </div>
    </div>
  );
};

interface IntroHeroProps {
  intro: GroupIntroResponse;
  images: GroupIntroImageResponse[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  memberCountLabel: string;
}

const IntroHero: React.FC<IntroHeroProps> = ({
  intro,
  images,
  activeIndex,
  onActiveIndexChange,
  memberCountLabel,
}) => {
  const activeImage = images[activeIndex];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-muted">
      <div className="aspect-[4/3] w-full">
        {activeImage?.url ? (
          <img src={activeImage.url} alt="" className="h-full w-full object-cover" />
        ) : intro.imageUrl ? (
          <img src={intro.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <Camera className="h-8 w-8" />
            <span className="text-xs font-semibold">{memberCountLabel}명이 함께하는 모임</span>
          </div>
        )}
      </div>
      {images.length > 1 ? (
        <>
          <button
            type="button"
            onClick={() => onActiveIndexChange(activeIndex === 0 ? images.length - 1 : activeIndex - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white"
            aria-label="이전 소개 이미지"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
          </button>
          <button
            type="button"
            onClick={() => onActiveIndexChange(activeIndex === images.length - 1 ? 0 : activeIndex + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white"
            aria-label="다음 소개 이미지"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
            {images.map((image, index) => (
              <button
                key={image.imageId}
                type="button"
                onClick={() => onActiveIndexChange(index)}
                className={`h-1.5 rounded-full transition-all ${index === activeIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/55'}`}
                aria-label={`${index + 1}번째 소개 이미지 보기`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
};

const VisibilityBadge: React.FC<{ visibility: 'PRIVATE' | 'PUBLIC' }> = ({ visibility }) => (
  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${
    visibility === 'PUBLIC'
      ? 'bg-primary/10 text-primary'
      : 'bg-muted text-muted-foreground'
  }`}>
    {visibility === 'PUBLIC' ? '공개 모임' : '비공개 모임'}
  </span>
);

const IntroSection: React.FC<{
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, action, children }) => (
  <section className="mt-5 border-t border-border/50 pt-3">
    <div className="mb-2 flex items-center justify-between gap-3 px-5">
      <h2 className="text-sm font-bold text-foreground">{title}</h2>
      {action}
    </div>
    {children}
  </section>
);

const NoticeList: React.FC<{
  intro: GroupIntroResponse;
  showComposer: boolean;
  noticeTitle: string;
  noticeContent: string;
  isSubmitting: boolean;
  onToggleComposer: () => void;
  onNoticeTitleChange: (value: string) => void;
  onNoticeContentChange: (value: string) => void;
  onSubmit: () => void;
}> = ({
  intro,
  showComposer,
  noticeTitle,
  noticeContent,
  isSubmitting,
  onToggleComposer,
  onNoticeTitleChange,
  onNoticeContentChange,
  onSubmit,
}) => (
  <>
    {intro.canWriteNotice ? (
      <div className="border-b border-border/60 px-5 pb-3">
        <button
          type="button"
          onClick={onToggleComposer}
          className="text-xs font-bold text-primary"
        >
          {showComposer ? '닫기' : '공지 쓰기'}
        </button>
      </div>
    ) : null}
    {showComposer ? (
      <div className="border-b border-border/60 px-5 pb-4 pt-2">
        <div className="space-y-2">
          <Input
            value={noticeTitle}
            onChange={(event) => onNoticeTitleChange(event.target.value)}
            maxLength={GROUP_NOTICE_TITLE_MAX_LENGTH}
            className="rounded-xl bg-muted text-base"
            placeholder="공지 제목"
          />
          <Textarea
            value={noticeContent}
            onChange={(event) => onNoticeContentChange(event.target.value)}
            maxLength={1000}
            rows={4}
            className="resize-none rounded-xl bg-muted text-base"
            placeholder="모임 멤버에게 알릴 내용을 적어주세요."
          />
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {isSubmitting ? '등록 중...' : '공지 등록'}
          </button>
        </div>
      </div>
    ) : null}
    {intro.notices.length > 0 ? (
      intro.notices.map((notice) => (
        <article key={notice.id} className="border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7 border border-border/60">
              <AvatarImage src={notice.authorAvatarUrl} alt={notice.authorNickname} />
              <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                {notice.authorNickname.slice(0, 1)}
              </AvatarFallback>
            </Avatar>
            <p className="truncate text-xs font-bold text-foreground">{notice.authorNickname}</p>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
            <p className="shrink-0 text-[10px] text-muted-foreground">{formatRelativeTime(notice.createdAt)}</p>
          </div>
          <h3 className="mt-2 line-clamp-2 text-sm font-bold text-foreground">{notice.title}</h3>
          <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">{notice.content}</p>
        </article>
      ))
    ) : (
      <p className="border-y border-dashed border-border/70 px-5 py-5 text-xs text-muted-foreground">
        아직 공지사항이 없습니다.
      </p>
    )}
  </>
);

const IntroPostList: React.FC<{
  posts: GroupIntroPostResponse[];
  member: boolean;
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onPostClick: (post: GroupIntroPostResponse) => void;
}> = ({ posts, member, isLoading, hasNextPage, isFetchingNextPage, onLoadMore, onPostClick }) => {
  if (isLoading) {
    return (
      <div className="px-5">
        <ListSkeleton count={3} showAvatar={false} itemClassName="px-0" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <p className="border-y border-dashed border-border/70 px-5 py-5 text-xs text-muted-foreground">
        아직 모임 글이 없습니다.
      </p>
    );
  }

  return (
    <div>
      {posts.map((post) => (
        <button
          key={post.id}
          type="button"
          onClick={() => onPostClick(post)}
          className="w-full border-b border-border/60 px-5 py-4 text-left transition-colors hover:bg-muted/25"
        >
          {post.locked ? (
            <div className="flex items-center gap-3 rounded-2xl bg-muted px-3.5 py-3 text-muted-foreground">
              <Lock className="h-4 w-4 shrink-0 text-primary" />
              <p className="text-xs font-semibold">모임에만 공개된 게시물이에요.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="font-semibold">{post.authorNickname || '멤버'}</span>
                {post.memberOnly ? (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 font-semibold">모임 공개</span>
                ) : null}
              </div>
              <h3 className="mt-1 line-clamp-2 text-sm font-bold text-foreground">{post.title}</h3>
              <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
                {post.content || post.contentSnippet}
              </p>
              {post.imageUrl ? (
                <img src={post.imageUrl} alt="" className="mt-3 aspect-square w-full rounded-xl object-cover" loading="lazy" />
              ) : null}
              <div className="mt-3 flex items-center gap-3 text-[11px] font-semibold text-muted-foreground">
                <span className="font-medium">{formatRelativeTime(post.createdAt)}</span>
                <span className="inline-flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5" />
                  {post.likeCount}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MessageCircle className="h-3.5 w-3.5" />
                  {post.commentCount}
                </span>
                {!member ? (
                  <span className="ml-auto text-primary">가입 후 참여 가능</span>
                ) : null}
              </div>
            </>
          )}
        </button>
      ))}
      {hasNextPage ? (
        <div className="px-5 pt-3">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isFetchingNextPage}
            className="w-full border-y border-border/60 py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            {isFetchingNextPage ? '불러오는 중...' : '더 보기'}
          </button>
        </div>
      ) : null}
    </div>
  );
};

const JoinRequestSheet: React.FC<{
  intro: GroupIntroResponse;
  message: string;
  isSubmitting: boolean;
  onMessageChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}> = ({ intro, message, isSubmitting, onMessageChange, onClose, onSubmit }) => (
  <div className="fixed inset-x-0 top-0 app-layer-overlay flex items-end justify-center bg-black/50 app-bottom-sheet-root" onClick={onClose}>
    <div
      className="flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-card shadow-elevated animate-fade-in app-bottom-sheet-panel"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-foreground">가입 요청하기</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">가입 후 글 전체와 댓글을 볼 수 있어요.</p>
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
      <div className="space-y-4 px-5 py-4">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-3.5 py-3">
          <GroupAvatar image={intro.imageUrl} thumbnail={intro.thumbnailUrl} name={intro.name} status={intro.imageStatus} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">{intro.name}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">관리자에게 가입 요청이 전달됩니다.</p>
          </div>
        </div>
        <Textarea
          value={message}
          onChange={(event) => onMessageChange(event.target.value)}
          maxLength={200}
          rows={4}
          className="resize-none rounded-xl bg-muted"
          placeholder="인삿말을 남겨보세요."
        />
        <p className="text-right text-[10px] text-muted-foreground">{message.length}/200</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-muted py-3 text-sm font-semibold text-foreground"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {isSubmitting ? '요청 중...' : '가입 요청하기'}
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default GroupIntroPage;
