import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MobileLayout from '@/components/layout/MobileLayout';
import PageHeader from '@/components/layout/PageHeader';
import ScrollableFadeList from '@/components/common/ScrollableFadeList';
import { coordinationApi, CoordinationDetailResponse, groupApi, GroupMemberResponse, HeatmapEntry, SlotEntry } from '@/services/api';
import { useSchedules } from '@/hooks/useSchedules';
import { Schedule } from '@/types/types';
import { X } from 'lucide-react';
import { appToast } from '@/lib/appToast';
import { getScheduleColorStyle } from '@/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { maxLocalDate, minLocalDate, toLocalDateTimeParam } from '@/lib/dateRange';
import {
  buildCoordinationSlotKey,
  formatCoordinationHourTime,
  getCoordinationDateWindowStarts,
  getRecommendedCoordinationAvailabilityWindow,
  getRecommendedCoordinationScheduleSlot,
  groupSchedulesByCoordinationSlot,
} from '@/lib/coordinationTimetable';

const CoordinationTimetablePage: React.FC = () => {
  const navigate = useNavigate();
  const { id: groupId, coordId } = useParams();

  const [coordination, setCoordination] = useState<CoordinationDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'select' | 'result'>('select');
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [selectedSlotDetail, setSelectedSlotDetail] = useState<string | null>(null);
  const [members, setMembers] = useState<GroupMemberResponse[]>([]);
  const [showRecommendationModal, setShowRecommendationModal] = useState(false);
  const [hasShownRecommendationModal, setHasShownRecommendationModal] = useState(false);
  const [dateWindowStart, setDateWindowStart] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  // 드래그 시작 시 선택/해제 모드를 고정해 지나간 슬롯에 같은 동작을 적용한다.
  const dragSelectionRef = useRef<{
    pointerId: number;
    mode: 'select' | 'deselect';
    appliedKeys: Set<string>;
  } | null>(null);

  useEffect(() => {
    if (!groupId || !coordId) return;
    setIsLoading(true);
    setSelectedSlotDetail(null);
    setShowRecommendationModal(false);
    setHasShownRecommendationModal(false);
    setDateWindowStart(0);
    setIsDescriptionExpanded(false);
    coordinationApi.getById(groupId, coordId).then(data => {
      setCoordination(data);
      if (data.myResponses) {
        setSelectedSlots(new Set(data.myResponses.map((r: SlotEntry) => {
          const dIdx = data.dates.indexOf(r.date);
          return `${dIdx}-${r.hour}`;
        }).filter((k: string) => !k.startsWith('-1'))));
      }
    }).catch(() => {}).finally(() => setIsLoading(false));
  }, [groupId, coordId]);

  useEffect(() => {
    if (!groupId) return;
    groupApi.getMembers(groupId).then(setMembers).catch(() => setMembers([]));
  }, [groupId]);

  const dates = useMemo(() => coordination?.dates ?? [], [coordination?.dates]);
  const startHour = coordination?.startHour ?? 9;
  const endHour = coordination?.endHour ?? 18;
  const title = coordination?.title || '시간 조율';
  const description = coordination?.description?.trim();
  const hasLongDescription = Boolean(description && description.length > 90);

  const hours = useMemo(() => { const h: number[] = []; for (let i = startHour; i < endHour; i++) h.push(i); return h; }, [startHour, endHour]);

  const parsedDates = useMemo(() => dates.map(d => { const parts = d.split('-').map(Number); return new Date(parts[0], parts[1] - 1, parts[2]); }), [dates]);
  // 후보 날짜가 많으면 5개씩 보여주되 마지막 페이지도 5칸을 유지한다.
  const dateWindowStarts = useMemo(() => getCoordinationDateWindowStarts(parsedDates.length), [parsedDates.length]);
  const normalizedDateWindowStart = dateWindowStarts.includes(dateWindowStart) ? dateWindowStart : dateWindowStarts[0];
  const currentDateWindowIndex = Math.max(0, dateWindowStarts.indexOf(normalizedDateWindowStart));
  const visibleDateItems = useMemo(() => {
    return parsedDates
      .slice(normalizedDateWindowStart, normalizedDateWindowStart + 5)
      .map((date, offset) => ({
        date,
        dateIndex: normalizedDateWindowStart + offset,
      }));
  }, [normalizedDateWindowStart, parsedDates]);
  const dateGridTemplateColumns = `2.5rem repeat(${Math.max(visibleDateItems.length, 1)}, minmax(0, 1fr))`;
  const hasDateWindowPaging = parsedDates.length > 5;

  const scheduleRange = useMemo(() => {
    if (parsedDates.length === 0) return undefined;
    return {
      startDate: toLocalDateTimeParam(minLocalDate(...parsedDates)),
      endDate: toLocalDateTimeParam(maxLocalDate(...parsedDates), true),
      limit: 100,
    };
  }, [parsedDates]);
  const {
    data: schedules = [],
    fetchNextPage: fetchNextSchedulePage,
    hasNextPage: hasNextSchedulePage,
    isFetchingNextPage: isFetchingNextSchedulePage,
  } = useSchedules(scheduleRange, { enabled: Boolean(scheduleRange) });

  const heatmapMap = useMemo(() => {
    const map: Record<string, HeatmapEntry> = {};
    coordination?.heatmap?.forEach(h => { const dIdx = dates.indexOf(h.date); map[`${dIdx}-${h.hour}`] = h; });
    return map;
  }, [coordination, dates]);

  const recommendedWindow = useMemo(() => {
    return getRecommendedCoordinationAvailabilityWindow(coordination?.heatmap ?? [], dates);
  }, [coordination?.heatmap, dates]);

  const membersByUserId = useMemo(() => {
    return new Map(members.map((member) => [member.userId, member]));
  }, [members]);

  const userSchedulesBySlot = useMemo(() => {
    return groupSchedulesByCoordinationSlot(schedules, parsedDates, hours);
  }, [schedules, parsedDates, hours]);

  useEffect(() => {
    if (viewMode !== 'result' || !coordination || hasShownRecommendationModal) return;
    setShowRecommendationModal(true);
    setHasShownRecommendationModal(true);
  }, [coordination, hasShownRecommendationModal, viewMode]);

  const toggleSlot = (dateIdx: number, hour: number) => {
    const key = buildCoordinationSlotKey(dateIdx, hour);
    setSelectedSlots(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const setSlotSelected = (key: string, shouldSelect: boolean) => {
    setSelectedSlots(prev => {
      const next = new Set(prev);
      if (shouldSelect) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const applyDragSelectionToKey = (key: string) => {
    const drag = dragSelectionRef.current;
    if (!drag || drag.appliedKeys.has(key)) return;
    drag.appliedKeys.add(key);
    setSlotSelected(key, drag.mode === 'select');
  };

  const findSlotKeyFromPoint = (clientX: number, clientY: number) => {
    // pointer capture 중에는 event target이 고정되므로 좌표 기준으로 실제 슬롯을 다시 찾는다.
    const element = document.elementFromPoint(clientX, clientY);
    if (!(element instanceof HTMLElement)) return null;
    return element.closest<HTMLElement>('[data-coordination-slot-key]')?.dataset.coordinationSlotKey ?? null;
  };

  const handleSlotPointerDown = (event: React.PointerEvent<HTMLButtonElement>, key: string) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const shouldSelect = !selectedSlots.has(key);
    dragSelectionRef.current = {
      pointerId: event.pointerId,
      mode: shouldSelect ? 'select' : 'deselect',
      appliedKeys: new Set([key]),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setSlotSelected(key, shouldSelect);
  };

  const handleSlotPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragSelectionRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const key = findSlotKeyFromPoint(event.clientX, event.clientY);
    if (key) {
      applyDragSelectionToKey(key);
    }
  };

  const handleSlotPointerEnd = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (dragSelectionRef.current?.pointerId === event.pointerId) {
      dragSelectionRef.current = null;
    }
  };

  const moveDateWindow = (direction: 'prev' | 'next') => {
    const nextIndex = direction === 'next' ? currentDateWindowIndex + 1 : currentDateWindowIndex - 1;
    const nextStart = dateWindowStarts[nextIndex];
    if (nextStart === undefined) return;

    setDateWindowStart(nextStart);
    setSelectedSlotDetail(null);
  };

  const handleSubmit = async () => {
    if (!groupId || !coordId) return;
    setIsSubmitting(true);
    try {
      const slots: SlotEntry[] = Array.from(selectedSlots).map(key => { const [dIdxStr, hourStr] = key.split('-'); return { date: dates[parseInt(dIdxStr)], hour: parseInt(hourStr) }; }).filter(s => s.date);
      await coordinationApi.submitResponses(groupId, coordId, slots);
      const updated = await coordinationApi.getById(groupId, coordId);
      setCoordination(updated);
      setViewMode('result');
      appToast.success('가능 시간이 제출되었습니다');
    } catch (error) { appToast.error('제출에 실패했습니다', error); } finally { setIsSubmitting(false); }
  };

  const handleCreateGroupSchedule = () => {
    if (!groupId) {
      appToast.error('그룹 정보를 찾을 수 없습니다');
      return;
    }

    const selectedEntry = selectedSlotDetail ? heatmapMap[selectedSlotDetail] : null;
    const slot = getRecommendedCoordinationScheduleSlot(
      coordination?.heatmap ?? [],
      dates,
      selectedEntry,
    );

    // 선택한 슬롯이 없으면 가장 많이, 가장 길게 겹친 추천 슬롯을 일정 후보로 쓴다.
    if (!slot) {
      appToast.info('일정을 만들 수 있는 시간이 없습니다', '한 명 이상 가능한 시간이 생기면 그룹 일정을 만들 수 있습니다.');
      return;
    }

    navigate('/schedule/new', {
      state: {
        groupId,
        coordinationId: coordId,
        returnTo: `/groups/${groupId}`,
        title,
        content: '시간 조율 결과에서 생성한 그룹 일정입니다.',
        startDate: slot.date,
        startTime: formatCoordinationHourTime(slot.hour),
        duration: '1',
        sourceLabel: '모두 가능한 시간',
      },
    });
  };

  const renderExistingScheduleLayer = (existingSchedules?: Schedule[]) => {
    if (!existingSchedules?.length) return null;

    const firstSchedule = existingSchedules[0];
    return (
      <div
        className="pointer-events-none absolute inset-1 z-0 flex items-center justify-center rounded-md border px-1 text-center opacity-70 shadow-sm"
        style={getScheduleColorStyle(firstSchedule, 'soft')}
      >
        <span className="min-w-0 truncate text-[8px] font-semibold leading-none">{firstSchedule.title}</span>
        {existingSchedules.length > 1 && (
          <span className="ml-1 shrink-0 rounded-full bg-background/70 px-1 text-[7px] font-bold">
            +{existingSchedules.length - 1}
          </span>
        )}
      </div>
    );
  };

  const getResultColor = (ratio: number) => ratio >= 0.75 ? 'bg-coord-blue' : ratio >= 0.5 ? 'bg-coord-green' : 'bg-coord-gray';
  const getResultOpacity = (count: number, total: number) => { if (total <= 1) return 100; return 35 + ((count - 1) / (total - 1)) * 65; };
  const formatDateLabel = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  const formatDateText = (value: string) => {
    const date = parsedDates[dates.indexOf(value)];
    return date ? formatDateLabel(date) : value;
  };
  const getParticipantName = (userId: string) => membersByUserId.get(userId)?.nickname || '알 수 없는 멤버';
  const getParticipantFallback = (userId: string) => getParticipantName(userId).slice(0, 1).toUpperCase();
  const renderDateWindowPager = () => {
    if (!hasDateWindowPaging) return null;

    return (
      <div className="mb-2 grid grid-cols-2 gap-2 px-4">
        {currentDateWindowIndex > 0 ? (
          <button
            type="button"
            onClick={() => moveDateWindow('prev')}
            className="rounded-xl border border-border bg-card px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            &lt; ({visibleDateItems.length}/{parsedDates.length}) 이전 일자가 있습니다
          </button>
        ) : (
          <div />
        )}
        {currentDateWindowIndex < dateWindowStarts.length - 1 ? (
          <button
            type="button"
            onClick={() => moveDateWindow('next')}
            className="rounded-xl border border-border bg-card px-3 py-2 text-right text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            ({visibleDateItems.length}/{parsedDates.length}) 다음 일자들이 있습니다. &gt;
          </button>
        ) : (
          <div />
        )}
      </div>
    );
  };

  if (isLoading) return (<MobileLayout><PageHeader title="시간 조율" showBack backTo={groupId ? `/groups/${groupId}` : '/groups'} /><div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div></MobileLayout>);
  if (!coordination) return (<MobileLayout><PageHeader title="시간 조율" showBack backTo={groupId ? `/groups/${groupId}` : '/groups'} /><div className="p-8 text-center text-muted-foreground">조율 정보를 찾을 수 없습니다</div></MobileLayout>);

  const allUsers = new Set<string>();
  coordination.heatmap?.forEach(h => h.users?.forEach(u => allUsers.add(u)));
  const totalParticipants = Math.max(allUsers.size, 1);

  return (
    <MobileLayout>
      <PageHeader title={title} showBack backTo={groupId ? `/groups/${groupId}` : '/groups'} />
      {description ? (
        <div className="px-4 pt-3">
          <div className="rounded-xl border border-coord-green/15 bg-coord-green/5 px-3 py-2.5">
            <p className={`text-xs leading-5 text-foreground/85 ${isDescriptionExpanded ? '' : 'line-clamp-2'}`}>
              {description}
            </p>
            {hasLongDescription ? (
              <button
                type="button"
                onClick={() => setIsDescriptionExpanded(prev => !prev)}
                className="mt-1 text-[11px] font-bold text-coord-green"
              >
                {isDescriptionExpanded ? '접기' : '더보기'}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="flex gap-2 px-4 py-3">
        <button onClick={() => setViewMode('select')} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${viewMode === 'select' ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'}`}>내가 가능한 시간</button>
        <button onClick={() => setViewMode('result')} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${viewMode === 'result' ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'}`}>모두 가능한 시간</button>
      </div>

      {viewMode === 'select' ? (
        <>
          <p className="px-4 text-xs text-muted-foreground mb-3">가능한 시간을 터치하거나 드래그하여 연속 선택하세요.</p>
          {renderDateWindowPager()}
          <div className="mx-4 overflow-hidden rounded-xl border border-border bg-card">
            <div className="grid border-b border-border" style={{ gridTemplateColumns: dateGridTemplateColumns }}>
              <div />
              {visibleDateItems.map(({ date, dateIndex }) => (
                <div key={dateIndex} className="min-w-0 py-2 text-center text-[10px] font-medium text-muted-foreground">
                  {formatDateLabel(date)}
                </div>
              ))}
            </div>
            <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
              {hours.map(hour => (
                <div key={hour} className="grid border-b border-border/50" style={{ gridTemplateColumns: dateGridTemplateColumns }}>
                  <div className="flex items-center justify-end pr-1.5 text-[10px] text-muted-foreground">{hour}</div>
                  {visibleDateItems.map(({ dateIndex }) => {
                    const key = buildCoordinationSlotKey(dateIndex, hour);
                    const isSelected = selectedSlots.has(key);
                    const existingSchedules = userSchedulesBySlot[key];
                    return (
                      <button
                        key={dateIndex}
                        type="button"
                        aria-pressed={isSelected}
                        data-coordination-slot-key={key}
                        onPointerDown={(event) => handleSlotPointerDown(event, key)}
                        onPointerMove={handleSlotPointerMove}
                        onPointerUp={handleSlotPointerEnd}
                        onPointerCancel={handleSlotPointerEnd}
                        onClick={(event) => event.preventDefault()}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            toggleSlot(dateIndex, hour);
                          }
                        }}
                        className={`relative h-10 min-w-0 touch-none select-none overflow-hidden border-l border-border/50 bg-card transition-colors hover:bg-muted/60 ${isSelected ? 'ring-1 ring-primary/30 ring-inset' : ''}`}
                      >
                        {renderExistingScheduleLayer(existingSchedules)}
                        {isSelected && (
                          <div className="pointer-events-none absolute inset-0 z-10 bg-primary/35" />
                        )}
                        {isSelected && (
                          <div className="pointer-events-none absolute right-1.5 top-1.5 z-20 h-1.5 w-1.5 rounded-full bg-primary shadow-sm" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          {hasNextSchedulePage ? (
            <div className="px-4 pt-3">
              <button
                type="button"
                onClick={() => fetchNextSchedulePage()}
                disabled={isFetchingNextSchedulePage}
                className="w-full rounded-xl border border-border bg-card py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              >
                {isFetchingNextSchedulePage ? '불러오는 중...' : '기존 일정 더 불러오기'}
              </button>
            </div>
          ) : null}
          <div className="px-4 mt-4"><button onClick={handleSubmit} disabled={isSubmitting} className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold disabled:opacity-50">{isSubmitting ? '제출 중...' : '제출하기'}</button></div>
        </>
      ) : (
        <>
          <p className="px-4 text-xs text-muted-foreground mb-3">타임블럭을 터치하면 참여자를 확인할 수 있습니다.</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 px-4 mb-3">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-coord-gray" /><span className="text-[10px] text-muted-foreground">~50%</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-coord-green" /><span className="text-[10px] text-muted-foreground">50~75%</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-coord-blue" /><span className="text-[10px] text-muted-foreground">75~100%</span></div>
          </div>
          {renderDateWindowPager()}
          <div className="mx-4 overflow-hidden rounded-xl border border-border bg-card">
            <div className="grid border-b border-border" style={{ gridTemplateColumns: dateGridTemplateColumns }}>
              <div />
              {visibleDateItems.map(({ date, dateIndex }) => (
                <div key={dateIndex} className="min-w-0 py-2 text-center text-[10px] font-medium text-muted-foreground">
                  {formatDateLabel(date)}
                </div>
              ))}
            </div>
            <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
              {hours.map(hour => (
                <div key={hour} className="grid border-b border-border/50" style={{ gridTemplateColumns: dateGridTemplateColumns }}>
                  <div className="flex items-center justify-end pr-1.5 text-[10px] text-muted-foreground">{hour}</div>
                  {visibleDateItems.map(({ dateIndex }) => {
                    const key = `${dateIndex}-${hour}`;
                    const entry = heatmapMap[key];
                    const count = entry?.count || 0;
                    const ratio = count / totalParticipants;
                    const opacity = count > 0 ? getResultOpacity(count, totalParticipants) : 0;
                    return (
                      <button
                        key={dateIndex}
                        type="button"
                        onClick={() => count > 0 && setSelectedSlotDetail(key)}
                        className={`relative h-10 min-w-0 border-l border-border/50 transition-colors ${count > 0 ? getResultColor(ratio) : ''} ${selectedSlotDetail === key ? 'ring-2 ring-foreground ring-inset' : ''}`}
                        disabled={count === 0}
                        style={count > 0 ? { opacity: opacity / 100 } : {}}
                      >
                        {count > 0 && <span className="text-[9px] font-bold text-foreground">{count}</span>}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="px-4 mt-4">
            <button
              type="button"
              onClick={handleCreateGroupSchedule}
              className="w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-colors active:scale-[0.98]"
            >
              그룹 일정 생성하기
            </button>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              선택한 시간이 없으면 가장 많이 겹치는 시간으로 시작합니다.
            </p>
          </div>
        </>
      )}
      {showRecommendationModal ? (
        <RecommendationModal
          window={recommendedWindow}
          formatDateText={formatDateText}
          onClose={() => setShowRecommendationModal(false)}
        />
      ) : null}
      {selectedSlotDetail && heatmapMap[selectedSlotDetail] ? (
        <SlotParticipantsModal
          entry={heatmapMap[selectedSlotDetail]}
          dateText={formatDateLabel(parsedDates[parseInt(selectedSlotDetail.split('-')[0])])}
          hour={parseInt(selectedSlotDetail.split('-')[1])}
          membersByUserId={membersByUserId}
          getParticipantName={getParticipantName}
          getParticipantFallback={getParticipantFallback}
          onClose={() => setSelectedSlotDetail(null)}
        />
      ) : null}
    </MobileLayout>
  );
};

interface RecommendationModalProps {
  window: ReturnType<typeof getRecommendedCoordinationAvailabilityWindow>;
  formatDateText: (value: string) => string;
  onClose: () => void;
}

function RecommendationModal({ window, formatDateText, onClose }: RecommendationModalProps) {
  return (
    <div className="fixed inset-x-0 top-0 app-layer-overlay flex items-end justify-center bg-black/50 app-bottom-sheet-root" onClick={onClose}>
      <div
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-card shadow-elevated animate-fade-in app-bottom-sheet-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-foreground">추천 시간</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">타임슬롯을 선택하면 투표 인원을 확인할 수 있어요.</p>
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

        <div className="px-5 py-4">
          {window ? (
            <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-4">
              <p className="text-[11px] font-semibold text-primary">가장 많이 겹친 시간</p>
              <p className="mt-1 text-lg font-bold text-foreground">
                {formatDateText(window.date)} {formatCoordinationHourTime(window.startHour)} - {formatCoordinationHourTime(window.endHour)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {window.count}명이 가능하고, {window.slots.length}시간 연속으로 겹칩니다.
              </p>
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
              아직 투표된 시간이 없습니다. 멤버들이 가능한 시간을 제출하면 추천 시간이 표시됩니다.
            </p>
          )}
          <button
            type="button"
            onClick={onClose}
            className="mt-3 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

interface SlotParticipantsModalProps {
  entry: HeatmapEntry;
  dateText: string;
  hour: number;
  membersByUserId: Map<string, GroupMemberResponse>;
  getParticipantName: (userId: string) => string;
  getParticipantFallback: (userId: string) => string;
  onClose: () => void;
}

function SlotParticipantsModal({
  entry,
  dateText,
  hour,
  membersByUserId,
  getParticipantName,
  getParticipantFallback,
  onClose,
}: SlotParticipantsModalProps) {
  const users = entry.users ?? [];

  return (
    <div className="fixed inset-x-0 top-0 app-layer-overlay flex items-end justify-center bg-black/50 app-bottom-sheet-root" onClick={onClose}>
      <div
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-card shadow-elevated animate-fade-in app-bottom-sheet-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-foreground">투표 인원</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {dateText} {formatCoordinationHourTime(hour)} · {entry.count}명
            </p>
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

        <div className="min-h-0 flex-1 px-5 py-4">
          {users.length > 0 ? (
            <ScrollableFadeList
              ariaLabel="타임슬롯 투표자 목록"
              maxHeightClassName="max-h-[19.5rem]"
              viewportClassName="pr-1"
              contentClassName="grid grid-cols-[repeat(auto-fill,minmax(4.25rem,1fr))] gap-x-3 gap-y-4 space-y-0"
            >
              {users.map((userId) => {
                const member = membersByUserId.get(userId);
                const name = getParticipantName(userId);
                return (
                  <div key={userId} className="min-w-0 text-center">
                    <Avatar className="mx-auto h-12 w-12 border border-border/70 shadow-sm">
                      <AvatarImage src={member?.avatarUrl} alt={name} />
                      <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                        {getParticipantFallback(userId)}
                      </AvatarFallback>
                    </Avatar>
                    <p className="mt-2 truncate text-xs font-semibold text-foreground" title={name}>{name}</p>
                  </div>
                );
              })}
            </ScrollableFadeList>
          ) : (
            <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">
              투표 인원을 불러오지 못했습니다.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default CoordinationTimetablePage;
