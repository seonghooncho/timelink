import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MobileLayout from '@/components/layout/MobileLayout';
import PageHeader from '@/components/layout/PageHeader';
import { coordinationApi, CoordinationDetailResponse, HeatmapEntry, SlotEntry } from '@/services/api';
import { useSchedules } from '@/hooks/useSchedules';
import { Schedule } from '@/types/types';
import { X } from 'lucide-react';
import { appToast } from '@/lib/appToast';
import { getScheduleColorStyle } from '@/utils';
import { maxLocalDate, minLocalDate, toLocalDateTimeParam } from '@/lib/dateRange';
import {
  buildCoordinationSlotKey,
  formatCoordinationHourTime,
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!groupId || !coordId) return;
    setIsLoading(true);
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

  const dates = useMemo(() => coordination?.dates ?? [], [coordination?.dates]);
  const startHour = coordination?.startHour ?? 9;
  const endHour = coordination?.endHour ?? 18;
  const title = coordination?.title || '시간 조율';

  const hours = useMemo(() => { const h: number[] = []; for (let i = startHour; i < endHour; i++) h.push(i); return h; }, [startHour, endHour]);

  const parsedDates = useMemo(() => dates.map(d => { const parts = d.split('-').map(Number); return new Date(parts[0], parts[1] - 1, parts[2]); }), [dates]);
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

  const userSchedulesBySlot = useMemo(() => {
    return groupSchedulesByCoordinationSlot(schedules, parsedDates, hours);
  }, [schedules, parsedDates, hours]);

  const toggleSlot = (dateIdx: number, hour: number) => {
    const key = `${dateIdx}-${hour}`;
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

    if (!slot) {
      appToast.info('일정을 만들 수 있는 시간이 없습니다', '한 명 이상 가능한 시간이 생기면 그룹 일정을 만들 수 있습니다.');
      return;
    }

    navigate('/schedule/new', {
      state: {
        groupId,
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

  if (isLoading) return (<MobileLayout><PageHeader title="시간 조율" showBack /><div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div></MobileLayout>);
  if (!coordination) return (<MobileLayout><PageHeader title="시간 조율" showBack /><div className="p-8 text-center text-muted-foreground">조율 정보를 찾을 수 없습니다</div></MobileLayout>);

  const allUsers = new Set<string>();
  coordination.heatmap?.forEach(h => h.users?.forEach(u => allUsers.add(u)));
  const totalParticipants = Math.max(allUsers.size, 1);

  return (
    <MobileLayout>
      <PageHeader title={title} showBack />
      <div className="flex gap-2 px-4 py-3">
        <button onClick={() => setViewMode('select')} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${viewMode === 'select' ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'}`}>내가 가능한 시간</button>
        <button onClick={() => setViewMode('result')} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${viewMode === 'result' ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'}`}>모두 가능한 시간</button>
      </div>

      {viewMode === 'select' ? (
        <>
          <p className="px-4 text-xs text-muted-foreground mb-3">가능한 시간을 터치하여 선택하세요.</p>
          <div className="mx-4 overflow-hidden rounded-xl border border-border bg-card">
            <div className="overflow-x-auto scrollbar-hide">
              <div className="min-w-max">
                <div className="flex border-b border-border">
                  <div className="w-10 shrink-0" />
                  {parsedDates.map((d, i) => (
                    <div key={i} className="w-16 shrink-0 py-2 text-center text-[10px] font-medium text-muted-foreground">
                      {formatDateLabel(d)}
                    </div>
                  ))}
                </div>
                <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
                  {hours.map(hour => (
                    <div key={hour} className="flex border-b border-border/50">
                      <div className="flex w-10 shrink-0 items-center justify-end pr-1.5 text-[10px] text-muted-foreground">{hour}</div>
                      {parsedDates.map((_, dIdx) => {
                        const key = buildCoordinationSlotKey(dIdx, hour);
                        const isSelected = selectedSlots.has(key);
                        const existingSchedules = userSchedulesBySlot[key];
                        return (
                          <button
                            key={dIdx}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => toggleSlot(dIdx, hour)}
                            className={`relative h-10 w-16 shrink-0 overflow-hidden border-l border-border/50 bg-card transition-colors hover:bg-muted/60 ${isSelected ? 'ring-1 ring-primary/30 ring-inset' : ''}`}
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
          <div className="mx-4 overflow-hidden rounded-xl border border-border bg-card">
            <div className="overflow-x-auto scrollbar-hide">
              <div className="min-w-max">
                <div className="flex border-b border-border">
                  <div className="w-10 shrink-0" />
                  {parsedDates.map((d, i) => (
                    <div key={i} className="w-16 shrink-0 py-2 text-center text-[10px] font-medium text-muted-foreground">
                      {formatDateLabel(d)}
                    </div>
                  ))}
                </div>
                <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
                  {hours.map(hour => (
                    <div key={hour} className="flex border-b border-border/50">
                      <div className="flex w-10 shrink-0 items-center justify-end pr-1.5 text-[10px] text-muted-foreground">{hour}</div>
                      {parsedDates.map((_, dIdx) => {
                        const key = `${dIdx}-${hour}`;
                        const entry = heatmapMap[key];
                        const count = entry?.count || 0;
                        const ratio = count / totalParticipants;
                        const opacity = count > 0 ? getResultOpacity(count, totalParticipants) : 0;
                        return (
                          <button key={dIdx} onClick={() => setSelectedSlotDetail(selectedSlotDetail === key ? null : key)}
                            className={`relative h-10 w-16 shrink-0 border-l border-border/50 transition-colors ${count > 0 ? getResultColor(ratio) : ''} ${selectedSlotDetail === key ? 'ring-2 ring-foreground ring-inset' : ''}`}
                            style={count > 0 ? { opacity: opacity / 100 } : {}}>
                            {count > 0 && <span className="text-[9px] font-bold text-foreground">{count}</span>}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {selectedSlotDetail && (() => {
            const entry = heatmapMap[selectedSlotDetail];
            if (!entry) return null;
            const [dIdxStr, hourStr] = selectedSlotDetail.split('-');
            return (
              <div className="mx-4 mt-3 p-3 bg-card rounded-xl border border-border animate-fade-in">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-foreground">{formatDateLabel(parsedDates[parseInt(dIdxStr)])} {parseInt(hourStr)}:00</p>
                  <button onClick={() => setSelectedSlotDetail(null)}><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
                </div>
                <div className="max-h-28 overflow-y-auto">
                  <div className="flex flex-wrap gap-1.5">{entry.users?.map((u, i) => (<span key={i} className="max-w-full truncate rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">{u}</span>))}</div>
                </div>
              </div>
            );
          })()}
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
    </MobileLayout>
  );
};

export default CoordinationTimetablePage;
