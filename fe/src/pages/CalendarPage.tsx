import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MobileLayout from '@/components/layout/MobileLayout';
import PageHeader from '@/components/layout/PageHeader';
import ScheduleDetailModal from '@/components/schedule/ScheduleDetailModal';
import ConfirmModal from '@/components/common/ConfirmModal';
import CategoryBadge from '@/components/common/CategoryBadge';
import ScrollableFadeList from '@/components/common/ScrollableFadeList';
import { Schedule } from '@/types/types';
import { useSchedules, useUpdateSchedule, useDeleteSchedule } from '@/hooks/useSchedules';
import { appToast } from '@/lib/appToast';
import { getScheduleColorStyle } from '@/utils';
import { formatDurationLabel, formatScheduleClock } from '@/lib/scheduleTime';
import { endOfLocalMonth, startOfLocalMonth, toLocalDateTimeParam } from '@/lib/dateRange';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

const CalendarPage: React.FC = () => {
  const updateMutation = useUpdateSchedule();
  const deleteMutation = useDeleteSchedule();
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const [detailSchedule, setDetailSchedule] = useState<Schedule | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Schedule | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const scheduleRange = useMemo(() => ({
    startDate: toLocalDateTimeParam(startOfLocalMonth(currentDate)),
    endDate: toLocalDateTimeParam(endOfLocalMonth(currentDate), true),
    limit: 80,
  }), [currentDate]);
  const {
    data: schedules = [],
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSchedules(scheduleRange);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [firstDay, daysInMonth]);

  const getSchedulesForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return schedules.filter(s => s.startTime.slice(0, 10) === dateStr);
  };

  const prevMonth = () => {
    const d = new Date(year, month - 1, 1);
    setCurrentDate(d);
    setSelectedDay(d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear() ? today.getDate() : 1);
  };
  const nextMonth = () => {
    const d = new Date(year, month + 1, 1);
    setCurrentDate(d);
    setSelectedDay(d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear() ? today.getDate() : 1);
  };

  const isToday = (day: number) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const selectedSchedules = selectedDay ? getSchedulesForDay(selectedDay) : [];

  const handleUpdate = (id: string, updates: Partial<Schedule>) => {
    updateMutation.mutate(
      { id, data: updates },
      {
        onSuccess: () => appToast.success('일정을 수정했습니다'),
        onError: (error) => appToast.error('일정 수정에 실패했습니다', error),
      },
    );
  };

  const handleDeleteRequest = (schedule: Schedule) => {
    setConfirmDelete(schedule);
    setDetailSchedule(null);
  };

  const handleDeleteConfirm = () => {
    if (!confirmDelete) return;

    deleteMutation.mutate(confirmDelete.id, {
      onSuccess: () => {
        appToast.success('일정을 삭제했습니다');
        setConfirmDelete(null);
      },
      onError: (error) => appToast.error('일정 삭제에 실패했습니다', error),
    });
  };

  return (
    <MobileLayout>
      <div className="flex flex-col h-full">
        <div className="flex-shrink-0 bg-background">
          <PageHeader title="캘린더" />
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={prevMonth} className="p-2 text-muted-foreground hover:text-foreground"><ChevronLeft className="w-5 h-5" /></button>
            <h2 className="text-base font-bold text-foreground">{year}년 {month + 1}월</h2>
            <button onClick={nextMonth} className="p-2 text-muted-foreground hover:text-foreground"><ChevronRight className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-7 px-2">
            {DAYS.map(d => (<div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-1">{d}</div>))}
          </div>
          <div className="grid grid-cols-7 px-2 gap-y-0.5">
            {calendarDays.map((day, idx) => {
              if (day === null) return <div key={idx} />;
              const daySchedules = getSchedulesForDay(day);
              const isSelected = selectedDay === day;
              return (
                <button key={idx} onClick={() => setSelectedDay(day)}
                  className={`flex flex-col items-center py-1.5 rounded-lg transition-colors min-h-[60px] ${isSelected ? 'bg-primary/10' : 'hover:bg-muted'}`}>
                  <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday(day) ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>{day}</span>
                  <div className="flex flex-col gap-0.5 mt-0.5 w-full px-0.5">
                    {daySchedules.slice(0, 2).map(s => (
                      <div key={s.id} className="h-1 rounded-full" style={getScheduleColorStyle(s, 'line')} />
                    ))}
                    {daySchedules.length > 2 && <span className="text-[8px] text-muted-foreground text-center">+{daySchedules.length - 2}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {selectedDay && (
            <div className="px-4 pt-4 pb-4 animate-fade-in">
              <h3 className="text-sm font-semibold text-foreground mb-2">{month + 1}월 {selectedDay}일 일정</h3>
              {selectedSchedules.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">일정이 없습니다</p>
              ) : (
                <ScrollableFadeList ariaLabel="선택한 날짜의 일정 목록">
                  {selectedSchedules.map(s => (
                    <button key={s.id} onClick={() => setDetailSchedule(s)}
                      className="w-full flex items-center gap-3 p-3 bg-card rounded-xl border border-border text-left hover:border-muted-foreground/20 transition-all">
                      <div className="h-8 w-1 shrink-0 rounded-full" style={getScheduleColorStyle(s, 'line')} />
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex min-w-0 items-center gap-1.5 overflow-hidden">
                          <CategoryBadge category={s.category} />
                          {s.isImportant && <CategoryBadge category="important" />}
                        </div>
                        <p className="truncate text-sm font-medium text-foreground">{s.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatScheduleClock(s.startTime)} · {formatDurationLabel(s.duration)}
                        </p>
                      </div>
                    </button>
                  ))}
                </ScrollableFadeList>
              )}
              {hasNextPage ? (
                <button
                  type="button"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="mt-3 w-full rounded-xl border border-border bg-card py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                >
                  {isFetchingNextPage ? '불러오는 중...' : '이 달 일정 더 불러오기'}
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
      <ScheduleDetailModal
        schedule={detailSchedule}
        open={!!detailSchedule}
        onClose={() => setDetailSchedule(null)}
        onUpdate={handleUpdate}
        onDelete={handleDeleteRequest}
      />
      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="일정을 삭제하시겠습니까?"
        description="삭제한 일정은 되돌릴 수 없습니다."
        confirmLabel="삭제"
        cancelLabel="유지"
        variant="destructive"
      />
    </MobileLayout>
  );
};

export default CalendarPage;
