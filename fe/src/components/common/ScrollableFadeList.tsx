import React from 'react';
import { useScrollAffordance } from '@/hooks/useScrollAffordance';
import { cn } from '@/lib/utils';

interface ScrollableFadeListProps {
  children: React.ReactNode;
  ariaLabel?: string;
  className?: string;
  viewportClassName?: string;
  contentClassName?: string;
  maxHeightClassName?: string;
  onReachEnd?: () => void;
  isLoadingMore?: boolean;
  loadingLabel?: string;
}

const ScrollableFadeList: React.FC<ScrollableFadeListProps> = ({
  children,
  ariaLabel,
  className,
  viewportClassName,
  contentClassName,
  maxHeightClassName = 'max-h-[360px]',
  onReachEnd,
  isLoadingMore = false,
  loadingLabel = '더 불러오는 중...',
}) => {
  const {
    scrollRef,
    hasOverflow,
    startFadeOpacity,
    endFadeOpacity,
  } = useScrollAffordance<HTMLDivElement>({ axis: 'vertical', onReachEnd });

  return (
    <div className={cn('relative', className)}>
      <div
        ref={scrollRef}
        aria-label={ariaLabel}
        className={cn(
          maxHeightClassName,
          'overflow-y-auto overscroll-contain pr-2 scrollbar-thin-soft',
          viewportClassName,
        )}
      >
        <div className={cn('space-y-2', contentClassName)}>
          {children}
          {isLoadingMore ? (
            <div className="flex items-center justify-center rounded-2xl border border-dashed border-border bg-background/50 py-3 text-[11px] font-semibold text-muted-foreground">
              {loadingLabel}
            </div>
          ) : null}
        </div>
      </div>

      {hasOverflow ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-black/20 via-black/10 to-transparent transition-opacity duration-150"
          style={{ opacity: startFadeOpacity }}
        />
      ) : null}
      {hasOverflow ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-black/20 via-black/10 to-transparent transition-opacity duration-150"
          style={{ opacity: endFadeOpacity }}
        />
      ) : null}
    </div>
  );
};

export default ScrollableFadeList;
