import React, { useEffect, useState } from 'react';
import { Heart, MessageCircle, MoreVertical, Pencil, Send, Trash2, X } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import MobileLayout from '@/components/layout/MobileLayout';
import ConfirmModal from '@/components/common/ConfirmModal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import type { CommunityCommentResponse, CommunityPostResponse } from '@/services/api';
import { appToast } from '@/lib/appToast';
import { formatRelativeTime } from '@/lib/relativeTime';
import { getProcessingImageLabel } from '@/lib/images';
import { COMMUNITY_POST_TITLE_MAX_LENGTH } from '@/lib/textLimits';

interface PostDetailViewProps {
  headerTitle: string;
  backTo: string;
  post?: CommunityPostResponse;
  isLoading: boolean;
  comments: CommunityCommentResponse[];
  isCommentsLoading: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  isLikePending?: boolean;
  isUpdatePostPending?: boolean;
  isCreateCommentPending?: boolean;
  isUpdateCommentPending?: boolean;
  onFetchNextComments: () => void;
  onAuthorClick: (userId?: string) => void;
  onToggleLike: () => Promise<void>;
  onUpdatePost: (data: { title: string; content: string }) => Promise<void>;
  onDeletePost: () => Promise<void>;
  onCreateComment: (content: string) => Promise<void>;
  onUpdateComment: (commentId: string, content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  children?: React.ReactNode;
}

const PostDetailView: React.FC<PostDetailViewProps> = ({
  headerTitle,
  backTo,
  post,
  isLoading,
  comments,
  isCommentsLoading,
  hasNextPage,
  isFetchingNextPage,
  isLikePending,
  isUpdatePostPending,
  isCreateCommentPending,
  isUpdateCommentPending,
  onFetchNextComments,
  onAuthorClick,
  onToggleLike,
  onUpdatePost,
  onDeletePost,
  onCreateComment,
  onUpdateComment,
  onDeleteComment,
  children,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [showDeletePostConfirm, setShowDeletePostConfirm] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');
  const [deleteCommentTarget, setDeleteCommentTarget] = useState<CommunityCommentResponse | null>(null);

  useEffect(() => {
    if (!post) return;
    setEditTitle(post.title);
    setEditContent(post.content);
  }, [post]);

  const handleToggleLike = async () => {
    try {
      await onToggleLike();
    } catch (error) {
      appToast.error('좋아요 상태를 변경하지 못했습니다', error);
    }
  };

  const handleUpdatePost = async () => {
    const title = editTitle.trim();
    const content = editContent.trim();
    if (!title) {
      appToast.error('제목을 입력해주세요');
      return;
    }
    if (!content) {
      appToast.error('본문을 입력해주세요');
      return;
    }

    try {
      await onUpdatePost({ title, content });
      setIsEditingPost(false);
      appToast.success('게시물을 수정했습니다');
    } catch (error) {
      appToast.error('게시물을 수정하지 못했습니다', error);
    }
  };

  const handleDeletePost = async () => {
    try {
      await onDeletePost();
      setShowDeletePostConfirm(false);
      appToast.success('게시물을 삭제했습니다');
    } catch (error) {
      appToast.error('게시물을 삭제하지 못했습니다', error);
    }
  };

  const handleCreateComment = async () => {
    const content = commentContent.trim();
    if (!content) {
      appToast.error('댓글을 입력해주세요');
      return;
    }

    try {
      await onCreateComment(content);
      setCommentContent('');
      appToast.success('댓글을 등록했습니다');
    } catch (error) {
      appToast.error('댓글을 등록하지 못했습니다', error);
    }
  };

  const handleUpdateComment = async () => {
    if (!editingCommentId) return;
    const content = editingCommentContent.trim();
    if (!content) {
      appToast.error('댓글을 입력해주세요');
      return;
    }

    try {
      await onUpdateComment(editingCommentId, content);
      setEditingCommentId(null);
      setEditingCommentContent('');
      appToast.success('댓글을 수정했습니다');
    } catch (error) {
      appToast.error('댓글을 수정하지 못했습니다', error);
    }
  };

  const handleDeleteComment = async () => {
    if (!deleteCommentTarget) return;
    try {
      await onDeleteComment(deleteCommentTarget.id);
      setDeleteCommentTarget(null);
      appToast.success('댓글을 삭제했습니다');
    } catch (error) {
      appToast.error('댓글을 삭제하지 못했습니다', error);
    }
  };

  const rightElement = post?.mine ? (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowMenu((prev) => !prev)}
        className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted"
        aria-label="게시물 메뉴"
      >
        <MoreVertical className="h-5 w-5" />
      </button>
      {showMenu ? (
        <div className="absolute right-0 top-full z-20 mt-1 w-32 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-elevated">
          <button
            type="button"
            onClick={() => {
              setShowMenu(false);
              setIsEditingPost(true);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-foreground hover:bg-muted"
          >
            <Pencil className="h-3.5 w-3.5" />
            수정
          </button>
          <button
            type="button"
            onClick={() => {
              setShowMenu(false);
              setShowDeletePostConfirm(true);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-destructive hover:bg-muted"
          >
            <Trash2 className="h-3.5 w-3.5" />
            삭제
          </button>
        </div>
      ) : null}
    </div>
  ) : null;

  if (isLoading) {
    return (
      <MobileLayout>
        <PageHeader title={headerTitle} showBack backTo={backTo} />
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </MobileLayout>
    );
  }

  if (!post) {
    return (
      <MobileLayout>
        <PageHeader title={headerTitle} showBack backTo={backTo} />
        <div className="px-5 py-12 text-center text-sm text-muted-foreground">게시물을 찾을 수 없습니다.</div>
      </MobileLayout>
    );
  }

  const authorName = post.authorNickname || '사용자';
  const canOpenAuthor = !post.anonymous && Boolean(post.authorUserId);
  const processingImageLabel = getProcessingImageLabel(post.imageStatus);

  return (
    <MobileLayout>
      <PageHeader title={headerTitle} showBack backTo={backTo} rightElement={rightElement} />

      <div className="px-5 py-4">
        <article className="border-b border-border/60 pb-5">
          {isEditingPost ? (
            <div className="space-y-3">
              <input
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                maxLength={COMMUNITY_POST_TITLE_MAX_LENGTH}
                className="w-full rounded-xl border border-border bg-muted px-3 py-3 text-base font-bold outline-none focus:ring-2 focus:ring-primary/30"
              />
              <Textarea
                value={editContent}
                onChange={(event) => setEditContent(event.target.value)}
                maxLength={2000}
                rows={8}
                className="resize-none rounded-xl bg-muted text-base"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingPost(false)}
                  className="rounded-xl bg-muted py-3 text-sm font-semibold text-foreground"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleUpdatePost}
                  disabled={isUpdatePostPending}
                  className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
                >
                  {isUpdatePostPending ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onAuthorClick(post.authorUserId)}
                disabled={!canOpenAuthor}
                className="flex max-w-full items-center gap-3 text-left disabled:cursor-default"
                aria-label={`${authorName} 프로필 보기`}
              >
                <Avatar className="h-10 w-10 border border-border/70">
                  <AvatarImage src={post.authorAvatarUrl} alt={authorName} />
                  <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                    {authorName.slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{authorName}</p>
                  <p className="text-[11px] text-muted-foreground">{formatRelativeTime(post.createdAt)}</p>
                </div>
              </button>

              <h1 className="mt-4 text-lg font-bold leading-7 text-foreground">{post.title}</h1>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground">{post.content}</p>
              {post.imageUrl ? (
                <img src={post.imageUrl} alt="" className="mt-4 aspect-[4/3] w-full rounded-xl object-cover" />
              ) : processingImageLabel ? (
                <p className="mt-4 rounded-xl bg-muted px-3 py-3 text-xs font-semibold text-muted-foreground">
                  {processingImageLabel}
                </p>
              ) : null}

              <div className="mt-5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleLike}
                  disabled={isLikePending}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                    post.likedByMe
                      ? 'border-primary/30 bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground'
                  } disabled:opacity-50`}
                  aria-label={post.likedByMe ? '좋아요 취소' : '좋아요'}
                >
                  <Heart className={`h-4 w-4 ${post.likedByMe ? 'fill-primary' : ''}`} />
                  {post.likeCount ?? 0}
                </button>
                <span className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-muted-foreground">
                  <MessageCircle className="h-4 w-4" />
                  댓글 {post.commentCount ?? 0}개
                </span>
              </div>
            </>
          )}
        </article>

        <section className="mt-5">
          <h2 className="text-sm font-bold text-foreground">댓글</h2>
          <div className="mt-3 flex gap-2">
            <Textarea
              value={commentContent}
              onChange={(event) => setCommentContent(event.target.value)}
              maxLength={500}
              rows={2}
              className="min-h-[52px] flex-1 resize-none rounded-xl bg-muted text-base"
              placeholder="댓글을 입력해주세요"
            />
            <button
              type="button"
              onClick={handleCreateComment}
              disabled={isCreateCommentPending}
              className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
              aria-label="댓글 등록"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {isCommentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : comments.length === 0 ? (
              <p className="border-y border-dashed border-border/70 px-4 py-6 text-center text-xs text-muted-foreground">
                아직 댓글이 없습니다.
              </p>
            ) : (
              comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  isEditing={editingCommentId === comment.id}
                  editingContent={editingCommentContent}
                  onEditingContentChange={setEditingCommentContent}
                  onEdit={() => {
                    setEditingCommentId(comment.id);
                    setEditingCommentContent(comment.content);
                  }}
                  onCancelEdit={() => {
                    setEditingCommentId(null);
                    setEditingCommentContent('');
                  }}
                  onSaveEdit={handleUpdateComment}
                  onDelete={() => setDeleteCommentTarget(comment)}
                  onAuthorClick={() => onAuthorClick(comment.authorUserId)}
                  isSaving={Boolean(isUpdateCommentPending)}
                />
              ))
            )}

            {hasNextPage ? (
              <button
                type="button"
                onClick={onFetchNextComments}
                disabled={isFetchingNextPage}
                className="w-full border-y border-border/60 py-2.5 text-xs font-semibold text-muted-foreground disabled:opacity-50"
              >
                {isFetchingNextPage ? '불러오는 중...' : '댓글 더보기'}
              </button>
            ) : null}
          </div>
        </section>
      </div>

      <ConfirmModal
        open={showDeletePostConfirm}
        onClose={() => setShowDeletePostConfirm(false)}
        onConfirm={handleDeletePost}
        title="게시물을 삭제할까요?"
        description="삭제한 게시물과 댓글은 다시 복구할 수 없습니다."
        variant="destructive"
      />
      <ConfirmModal
        open={Boolean(deleteCommentTarget)}
        onClose={() => setDeleteCommentTarget(null)}
        onConfirm={handleDeleteComment}
        title="댓글을 삭제할까요?"
        description="삭제한 댓글은 다시 복구할 수 없습니다."
        variant="destructive"
      />
      {children}
    </MobileLayout>
  );
};

interface CommentItemProps {
  comment: CommunityCommentResponse;
  isEditing: boolean;
  editingContent: string;
  isSaving: boolean;
  onEditingContentChange: (value: string) => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
  onAuthorClick: () => void;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  isEditing,
  editingContent,
  isSaving,
  onEditingContentChange,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onAuthorClick,
}) => (
  <div className="border-b border-border/60 py-3 last:border-b-0">
    <div className="flex items-start gap-3">
      <button type="button" onClick={onAuthorClick} aria-label={`${comment.authorNickname} 프로필 보기`}>
        <Avatar className="h-8 w-8 border border-border/70">
          <AvatarImage src={comment.authorAvatarUrl} alt={comment.authorNickname} />
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {comment.authorNickname.slice(0, 1)}
          </AvatarFallback>
        </Avatar>
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <button type="button" onClick={onAuthorClick} className="block max-w-full truncate text-left text-xs font-bold text-foreground">
              {comment.authorNickname}
            </button>
            <p className="text-[10px] text-muted-foreground">{formatRelativeTime(comment.createdAt)}</p>
          </div>
          {comment.mine && !isEditing ? (
            <div className="flex items-center gap-1">
              <button type="button" onClick={onEdit} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="댓글 수정">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={onDelete} className="rounded-lg p-1.5 text-destructive hover:bg-muted" aria-label="댓글 삭제">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
        </div>

        {isEditing ? (
          <div className="mt-2 space-y-2">
            <Textarea
              value={editingContent}
              onChange={(event) => onEditingContentChange(event.target.value)}
              maxLength={500}
              rows={3}
              className="resize-none rounded-xl bg-muted text-base"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onCancelEdit} className="rounded-lg bg-muted px-3 py-2 text-xs font-semibold text-foreground">
                <X className="mr-1 inline h-3.5 w-3.5" />
                취소
              </button>
              <button
                type="button"
                onClick={onSaveEdit}
                disabled={isSaving}
                className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
              >
                저장
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{comment.content}</p>
        )}
      </div>
    </div>
  </div>
);

export default PostDetailView;
