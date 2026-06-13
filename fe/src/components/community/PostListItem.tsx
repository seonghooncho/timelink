import React from 'react';
import { Heart, ImageIcon, MessageCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CommunityPostResponse } from '@/services/api';
import { formatRelativeTime } from '@/lib/relativeTime';
import { cn } from '@/lib/utils';

interface PostListItemProps {
  post: CommunityPostResponse;
  onClick?: () => void;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

const PostListItem: React.FC<PostListItemProps> = ({
  post,
  onClick,
  actions,
  children,
  className,
}) => {
  const body = (
    <>
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9 shrink-0 border border-border/60">
          <AvatarImage src={post.authorAvatarUrl} alt={post.authorNickname} />
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {post.authorNickname.slice(0, 1)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-xs font-bold text-foreground">{post.authorNickname}</p>
            <span className="h-1 w-1 shrink-0 rounded-full bg-muted-foreground/30" />
            <p className="shrink-0 text-[10px] text-muted-foreground">{formatRelativeTime(post.createdAt)}</p>
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
          </div>
          <h3 className="mt-2 line-clamp-2 text-sm font-bold leading-5 text-foreground">{post.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{post.content}</p>
        </div>
      </div>

      {post.imageUrl ? (
        <div className="mt-3 pl-12">
          <img
            src={post.imageUrl}
            alt=""
            className="h-36 w-full max-w-full rounded-xl object-cover"
            loading="lazy"
          />
        </div>
      ) : post.imageStatus === 'PROCESSING' ? (
        <div className="ml-12 mt-3 flex items-center gap-2 rounded-xl bg-muted px-3 py-3 text-[11px] font-semibold text-muted-foreground">
          <ImageIcon className="h-4 w-4 shrink-0 text-primary" />
          이미지 처리 중입니다
        </div>
      ) : null}

      {actions ? (
        <div className="mt-3">{actions}</div>
      ) : (
        <div className="mt-3 flex items-center gap-4 pl-12 text-[11px] font-medium text-muted-foreground">
          <span className="flex items-center gap-1">
            <Heart className={cn('h-3.5 w-3.5', post.likedByMe && 'fill-primary text-primary')} />
            {post.likeCount ?? 0}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" />
            {post.commentCount ?? 0}
          </span>
        </div>
      )}

      {children}
    </>
  );

  const rootClassName = cn(
    'w-full border-b border-border/60 px-5 py-4 text-left transition-colors',
    onClick && 'hover:bg-muted/25',
    className,
  );

  if (onClick && !actions && !children) {
    return (
      <button type="button" onClick={onClick} className={rootClassName}>
        {body}
      </button>
    );
  }

  return <article className={rootClassName}>{body}</article>;
};

export default PostListItem;
