import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Heart, MessageCircle, Plus, X } from 'lucide-react';
import MobileLayout from '@/components/layout/MobileLayout';
import PageHeader from '@/components/layout/PageHeader';
import { Textarea } from '@/components/ui/textarea';
import { useCommunityPosts, useCreateCommunityPost } from '@/hooks/useCommunity';
import { CommunityPostResponse } from '@/services/api';
import { appToast } from '@/lib/appToast';
import { formatRelativeTime } from '@/lib/relativeTime';

const CommunityPage: React.FC = () => {
  const navigate = useNavigate();
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
      const post = await createPost.mutateAsync({ title: nextTitle, content: nextContent });
      setShowCreateModal(false);
      setTitle('');
      setContent('');
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

      <div className="px-5 py-4">
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-foreground">커뮤니티</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                약속, 일정 조율, 모임 운영 이야기를 자유롭게 나눠보세요.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="flex shrink-0 items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              글쓰기
            </button>
          </div>
        </section>

        <div className="mt-4 space-y-2.5">
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
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground"
              >
                첫 글 쓰기
              </button>
            </div>
          ) : (
            posts.map((post) => (
              <CommunityPostItem
                key={post.id}
                post={post}
                onClick={() => navigate(`/community/posts/${post.id}`)}
              />
            ))
          )}

          {!isLoading && hasNextPage ? (
            <button
              type="button"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="w-full rounded-xl border border-border bg-card py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              {isFetchingNextPage ? '불러오는 중...' : '게시물 더보기'}
            </button>
          ) : null}
        </div>
      </div>

      {showCreateModal ? (
        <div className="fixed inset-x-0 top-0 app-layer-overlay flex items-end justify-center bg-black/50 app-bottom-sheet-root" onClick={() => setShowCreateModal(false)}>
          <div
            className="flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-card shadow-elevated animate-fade-in app-bottom-sheet-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="text-base font-bold text-foreground">게시물 작성</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
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
                  maxLength={80}
                  className="w-full rounded-xl border border-border bg-muted px-3 py-3 text-base outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="제목을 입력해주세요"
                />
                <p className="text-right text-[10px] text-muted-foreground">{title.length}/80</p>
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
                onClick={handleCreate}
                disabled={createPost.isPending}
                className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                {createPost.isPending ? '등록 중...' : '등록하기'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </MobileLayout>
  );
};

const CommunityPostItem: React.FC<{ post: CommunityPostResponse; onClick: () => void }> = ({ post, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full rounded-2xl border border-border bg-card p-4 text-left shadow-soft transition-colors hover:bg-muted/30"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-bold text-foreground">{post.title}</h3>
        <p className="mt-1 truncate text-xs leading-5 text-muted-foreground">{post.content}</p>
      </div>
      <span className="shrink-0 text-[10px] text-muted-foreground">{formatRelativeTime(post.createdAt)}</span>
    </div>
    <div className="mt-3 flex items-center gap-4 text-[11px] font-medium text-muted-foreground">
      <span className="flex items-center gap-1">
        <Heart className={`h-3.5 w-3.5 ${post.likedByMe ? 'fill-primary text-primary' : ''}`} />
        {post.likeCount ?? 0}
      </span>
      <span className="flex items-center gap-1">
        <MessageCircle className="h-3.5 w-3.5" />
        {post.commentCount ?? 0}
      </span>
      <span className="min-w-0 truncate">{post.authorNickname}</span>
    </div>
  </button>
);

export default CommunityPage;
