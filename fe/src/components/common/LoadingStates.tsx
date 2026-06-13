import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ListSkeletonProps {
  count?: number;
  className?: string;
  itemClassName?: string;
  showAvatar?: boolean;
}

export const ListSkeleton: React.FC<ListSkeletonProps> = ({
  count = 3,
  className,
  itemClassName,
  showAvatar = true,
}) => (
  <div className={cn('border-y border-border/60', className)} aria-hidden="true">
    {Array.from({ length: count }).map((_, index) => (
      <div
        key={index}
        className={cn('flex items-center gap-3 border-b border-border/60 px-1 py-4 last:border-b-0', itemClassName)}
      >
        {showAvatar ? <Skeleton className="h-11 w-11 shrink-0 rounded-2xl" /> : null}
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

export const ScheduleStripSkeleton: React.FC = () => (
  <div className="relative overflow-hidden px-3 py-2" aria-hidden="true">
    <div className="flex min-w-max gap-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="w-[148px] shrink-0 space-y-2">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-[92px] rounded-xl" />
        </div>
      ))}
    </div>
  </div>
);

export const TimetableSkeleton: React.FC = () => (
  <div className="px-5 py-3" aria-hidden="true">
    <div className="mb-3 flex items-center justify-between">
      <Skeleton className="h-5 w-20" />
      <Skeleton className="h-8 w-24 rounded-xl" />
    </div>
    <div className="grid grid-cols-[3.25rem_repeat(4,minmax(0,1fr))] overflow-hidden rounded-2xl border border-border bg-card">
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={`head-${index}`} className="m-2 h-4 rounded" />
      ))}
      {Array.from({ length: 20 }).map((_, index) => (
        <div key={index} className="min-h-[46px] border-t border-border p-2">
          {index % 6 === 0 ? <Skeleton className="h-full rounded-lg" /> : null}
        </div>
      ))}
    </div>
  </div>
);

export const CalendarAgendaSkeleton: React.FC = () => (
  <div className="space-y-2" aria-hidden="true">
    {Array.from({ length: 3 }).map((_, index) => (
      <div key={index} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
        <Skeleton className="h-8 w-1 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-3 w-2/5" />
        </div>
      </div>
    ))}
  </div>
);
