import React from 'react';
import { ChevronRight, Clock3 } from 'lucide-react';
import { CoordinationResponse } from '@/services/api';
import { useScrollAffordance } from '@/hooks/useScrollAffordance';
import { cn } from '@/lib/utils';

interface CoordinationStripProps {
  coordinations: CoordinationResponse[];
  onCoordinationClick: (coordination: CoordinationResponse) => void;
  onReachEnd?: () => void;
  isLoadingMore?: boolean;
  variant?: 'active' | 'closed';
}

const formatHourLabel = (hour: number) => `${hour}:00`;

const CoordinationStrip: React.FC<CoordinationStripProps> = ({
  coordinations,
  onCoordinationClick,
  onReachEnd,
  isLoadingMore = false,
  variant = 'active',
}) => {
  const {
    scrollRef,
    hasOverflow,
    startFadeOpacity,
    endFadeOpacity,
  } = useScrollAffordance<HTMLDivElement>({ axis: 'horizontal', onReachEnd });

  if (coordinations.length === 0 && !isLoadingMore) {
    return null;
  }

  return (
    <div className="relative isolate overflow-hidden">
      <div ref={scrollRef} className="relative z-0 overflow-x-auto scrollbar-hide">
        <div className="flex min-w-max gap-2 px-5 py-1">
          {coordinations.map((coordination) => (
              <div
                key={coordination.id}
                role="button"
                tabIndex={0}
                onClick={() => onCoordinationClick(coordination)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onCoordinationClick(coordination);
                  }
                }}
                className={cn(
                  'flex h-[124px] w-[172px] shrink-0 cursor-pointer flex-col justify-between rounded-xl border px-3 py-3 text-left shadow-soft transition-colors hover:bg-muted/30',
                  variant === 'closed'
                    ? 'border-border/50 bg-muted/45 text-muted-foreground'
                    : 'border-border/70 bg-card',
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5 shrink-0 text-coord-green" />
                    <p className="truncate text-[10px] font-semibold text-muted-foreground">
                      {coordination.mode === 'repeat' ? '반복 조율' : '일회성 조율'} · {coordination.dates.length}일
                    </p>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[13px] font-bold leading-5 text-foreground">
                    {coordination.title}
                  </p>
                </div>
                <div className="flex items-end justify-between gap-2">
                  <p className="min-w-0 text-[10px] font-medium text-muted-foreground">
                    응답 {coordination.responseCount ?? 0}건<br />
                    {variant === 'closed' ? '완료된 조율' : `${formatHourLabel(coordination.startHour)} - ${formatHourLabel(coordination.endHour)}`}
                  </p>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
              </div>
          ))}
          {isLoadingMore ? (
            <div className="flex h-[124px] w-[172px] shrink-0 items-center justify-center rounded-xl border border-dashed border-border text-[11px] font-semibold text-muted-foreground">
              불러오는 중...
            </div>
          ) : null}
        </div>
      </div>
      {hasOverflow ? (
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-y-0 left-0 z-20 w-10',
            'bg-gradient-to-r from-black/25 via-black/10 to-transparent transition-opacity duration-150',
          )}
          style={{ opacity: startFadeOpacity }}
        />
      ) : null}
      {hasOverflow ? (
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-y-0 right-0 z-20 w-10',
            'bg-gradient-to-l from-black/25 via-black/10 to-transparent transition-opacity duration-150',
          )}
          style={{ opacity: endFadeOpacity }}
        />
      ) : null}
    </div>
  );
};

export default CoordinationStrip;
