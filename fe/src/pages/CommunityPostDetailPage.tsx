import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Heart, MessageCircle, MoreVertical, Pencil, Send, Trash2, X } from 'lucide-react';
import MobileLayout from '@/components/layout/MobileLayout';
import PageHeader from '@/components/layout/PageHeader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import ConfirmModal from '@/components/common/ConfirmModal';
import {
  useCommunityComments,
  useCommunityPost,
  useCreateCommunityComment,
  useDeleteCommunityComment,
  useDeleteCommunityPost,
  useToggleCommunityLike,
  useUpdateCommunityComment,
  useUpdateCommunityPost,
} from '@/hooks/useCommunity';
import { CommunityCommentResponse } from '@/services/api';
import { appToast } from '@/lib/appToast';
import { formatRelativeTime } from '@/lib/relativeTime';

const CommunityPostDetailPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { data: post, isLoading } = useCommunityPost(postId);
  const {
    data: comments = [],
    isLoading: isCommentsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCommunityComments(postId);
  const toggleLike = useToggleCommunityLike(postId || '');
  const updatePost = useUpdateCommunityPost(postId || '');
  const deletePost = useDeleteCommunityPost();
  const createComment = useCreateCommunityComment(postId || '');
  const updateComment = useUpdateCommunityComment(postId || '');
  const deleteComment = useDeleteCommunityComment(postId || '');
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
    if (!post) return;
    try {
      await toggleLike.mutateAsync(post.likedByMe);
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
      await updatePost.mutateAsync({ title, content });
      setIsEditingPost(false);
      appToast.success('게시물을 수정했습니다');
    } catch (error) {
      appToast.error('게시물을 수정하지 못했습니다', error);
    }
  };

  const handleDeletePost = async () => {
    if (!postId) return;
    try {
      await deletePost.mutateAsync(postId);
      appToast.success('게시물을 삭제했습니다');
      navigate('/community', { replace: true });
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
      await createComment.mutateAsync(content);
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
      await updateComment.mutateAsync({ commentId: editingCommentId, content });
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
      await deleteComment.mutateAsync(deleteCommentTarget.id);
      setDeleteCommentTarget(null);
      appToast.success('댓글을 삭제했습니다');
    } catch (error) {
      appToast.error('댓글을 삭제하지 못했습니다', error);
    }
  };

  if (isLoading) {
    return (
      <MobileLayout>
        <PageHeader title="게시물" showBack backTo="/community" />
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </MobileLayout>
    );
  }

  if (!post) {
    return (
      <MobileLayout>
        <PageHeader title="게시물" showBack backTo="/community" />
        <div className="px-5 py-12 text-center text-sm text-muted-foreground">게시물을 찾을 수 없습니다.</div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <PageHeader title="게시물" showBack backTo="/community" rightElement={
        post.mine ? (
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
        ) : null
      } />

      <div className="px-5 py-4">
        <article className="border-b border-border/60 pb-5">
          {isEditingPost ? (
            <div className="space-y-3">
              <input
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                maxLength={80}
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
                  disabled={updatePost.isPending}
                  className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
                >
                  {updatePost.isPending ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-border/70">
                  <AvatarImage src={post.authorAvatarUrl} alt={post.authorNickname} />
                  <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                    {post.authorNickname.slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{post.authorNickname}</p>
                  <p className="text-[11px] text-muted-foreground">{formatRelativeTime(post.createdAt)}</p>
                </div>
              </div>

              <h1 className="mt-4 text-lg font-bold leading-7 text-foreground">{post.title}</h1>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground">{post.content}</p>

              <div className="mt-5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleLike}
                  disabled={toggleLike.isPending}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                    post.likedByMe
                      ? 'border-primary/30 bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${post.likedByMe ? 'fill-primary' : ''}`} />
                  {post.likeCount ?? 0}
                </button>
                <span className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-muted-foreground">
                  <MessageCircle className="h-4 w-4" />
                  {post.commentCount ?? 0}
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
              disabled={createComment.isPending}
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
                  isSaving={updateComment.isPending}
                />
              ))
            )}

            {hasNextPage ? (
              <button
                type="button"
                onClick={() => fetchNextPage()}
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
}) => (
  <div className="border-b border-border/60 py-3 last:border-b-0">
    <div className="flex items-start gap-3">
      <Avatar className="h-8 w-8 border border-border/70">
        <AvatarImage src={comment.authorAvatarUrl} alt={comment.authorNickname} />
        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
          {comment.authorNickname.slice(0, 1)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-foreground">{comment.authorNickname}</p>
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

export default CommunityPostDetailPage;
