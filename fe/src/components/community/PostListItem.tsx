import React from 'react';
import { Heart, ImageIcon, MessageCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CommunityPostResponse } from '@/services/api';
import { formatRelativeTime } from '@/lib/relativeTime';
import { cn } from '@/lib/utils';

interface PostListItemProps {
  post: CommunityPostResponse;
  onClick?: () => void;
  onAuthorClick?: () => void;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

const PostListItem: React.FC<PostListItemProps> = ({
  post,
  onClick,
  onAuthorClick,
  actions,
  children,
  className,
}) => {
  const authorName = post.authorNickname || '사용자';
  const canOpenAuthor = Boolean(onAuthorClick && !post.anonymous && post.authorUserId);

  const avatarNode = (
    <Avatar className="h-9 w-9 border border-border/60">
      <AvatarImage src={post.authorAvatarUrl} alt={authorName} />
      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
        {authorName.slice(0, 1)}
      </AvatarFallback>
    </Avatar>
  );

  const authorNameNode = canOpenAuthor ? (
    <button
      type="button"
      onClick={onAuthorClick}
      className="min-w-0 truncate text-xs font-bold text-foreground"
      aria-label={`${authorName} 프로필 보기`}
    >
      {authorName}
    </button>
  ) : (
    <p className="min-w-0 truncate text-xs font-bold text-foreground">{authorName}</p>
  );

  const badgeNode = (
    <>
      {post.anonymous ? (
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          익명
        </span>
      ) : null}
      {post.mine ? (
        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          내 글
        </span>
      ) : null}
      {post.memberOnly ? (
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          모임 공개
        </span>
      ) : null}
    </>
  );

  const previewComment = post.previewComment;
  const thumbnailNode = post.imageUrl ? (
    <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-muted">
      <img
        src={post.imageUrl}
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
      />
    </div>
  ) : post.imageStatus === 'PROCESSING' ? (
    <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-xl bg-muted text-primary">
      <ImageIcon className="h-4 w-4" aria-hidden="true" />
    </div>
  ) : null;

  const contentNode = (
    <div className="flex min-w-0 gap-3">
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-1 text-[15px] font-bold leading-5 text-foreground">{post.title}</h3>
        <p className="mt-0.5 line-clamp-1 text-[13px] leading-5 text-muted-foreground">{post.content}</p>
        {previewComment ? (
          <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] leading-5 text-muted-foreground">
            <span className="shrink-0 text-[10px] font-bold text-muted-foreground/70" aria-hidden="true">ㄴ</span>
            <p className="line-clamp-1 min-w-0">
              <span className="font-semibold">{previewComment.authorNickname}</span>
              {': '}
              {previewComment.content}
            </p>
          </div>
        ) : null}
      </div>
      {thumbnailNode}
    </div>
  );

  const body = (
    <>
      <div className="flex items-start gap-3">
        {canOpenAuthor ? (
          <button
            type="button"
            onClick={onAuthorClick}
            className="shrink-0"
            aria-label={`${authorName} 프로필 보기`}
          >
            {avatarNode}
          </button>
        ) : (
          <div className="shrink-0">{avatarNode}</div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            {authorNameNode}
            {badgeNode}
          </div>

          {onClick ? (
            <button type="button" onClick={onClick} className="mt-1.5 w-full text-left">
              {contentNode}
            </button>
          ) : (
            <div className="mt-1.5">{contentNode}</div>
          )}

          {actions ? (
            <div className="mt-2 flex min-h-8 items-center justify-between gap-3 text-[11px] font-medium text-muted-foreground">
              <div className="min-w-0 flex items-center gap-2">{actions}</div>
              <span className="shrink-0">{formatRelativeTime(post.createdAt)}</span>
            </div>
          ) : (
            <div className="mt-2 flex min-h-8 items-center justify-between gap-3 text-[11px] font-medium text-muted-foreground">
              <div className="flex min-w-0 items-center gap-4">
                <span className="flex items-center gap-1">
                  <Heart className={cn('h-3.5 w-3.5', post.likedByMe && 'fill-primary text-primary')} />
                  {post.likeCount ?? 0}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3.5 w-3.5" />
                  {post.commentCount ?? 0}
                </span>
              </div>
              <span className="shrink-0">{formatRelativeTime(post.createdAt)}</span>
            </div>
          )}
        </div>
      </div>

      {children}
    </>
  );

  const rootClassName = cn(
    'w-full border-b border-border/60 px-5 py-3.5 text-left transition-colors',
    onClick && 'hover:bg-muted/25',
    className,
  );

  return <article className={rootClassName}>{body}</article>;
};

export default PostListItem;
