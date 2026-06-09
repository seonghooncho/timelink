import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BrandMark from '@/components/common/BrandMark';
import MobileLayout from '@/components/layout/MobileLayout';
import ScheduleStrip from '@/components/schedule/ScheduleStrip';
import ScheduleDetailModal from '@/components/schedule/ScheduleDetailModal';
import Timetable from '@/components/schedule/Timetable';
import ConfirmModal from '@/components/common/ConfirmModal';
import FAB from '@/components/common/FAB';
import { useApp } from '@/context/AppContext';
import { Schedule } from '@/types/types';
import { getDayLabel } from '@/utils';
import { useGroupedSchedules } from '@/hooks/useGroupedSchedules';
import { useSchedules, useUpdateSchedule, useDeleteSchedule } from '@/hooks/useSchedules';
import { getDefaultScheduleAnchor } from '@/components/schedule/timetableUtils';

const MainPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedSchedule, setSelectedSchedule, showScheduleDetail, setShowScheduleDetail } = useApp();
  const { data: schedules = [] } = useSchedules();
  const updateMutation = useUpdateSchedule();
  const deleteMutation = useDeleteSchedule();
  const [timetableStart, setTimetableStart] = useState(new Date());
  const [confirmDelete, setConfirmDelete] = useState<Schedule | null>(null);
  const didSetInitialTimetableStartRef = useRef(false);

  const groupedSchedules = useGroupedSchedules(schedules);
  const scheduleAnchor = useMemo(() => getDefaultScheduleAnchor(schedules), [schedules]);

  useEffect(() => {
    if (didSetInitialTimetableStartRef.current || schedules.length === 0) {
      return;
    }

    setTimetableStart(scheduleAnchor.anchorDate);
    didSetInitialTimetableStartRef.current = true;
  }, [scheduleAnchor.anchorDate, schedules.length]);

  const handleComplete = (schedule: Schedule) => {
    setConfirmDelete(schedule);
  };

  const handleDeleteConfirm = () => {
    if (confirmDelete) {
      deleteMutation.mutate(confirmDelete.id);
      setConfirmDelete(null);
    }
  };

  const handleBlockClick = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setShowScheduleDetail(true);
  };

  const handleScheduleClick = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setShowScheduleDetail(true);
  };

  const handlePrevDays = () => {
    const prev = new Date(timetableStart);
    prev.setDate(prev.getDate() - 3);
    setTimetableStart(prev);
  };

  const handleNextDays = () => {
    const next = new Date(timetableStart);
    next.setDate(next.getDate() + 3);
    setTimetableStart(next);
  };

  const handleUpdate = (id: string, updates: Partial<Schedule>) => {
    updateMutation.mutate({ id, data: updates });
  };

  const todayDate = new Date();
  const month = todayDate.getMonth() + 1;
  const date = todayDate.getDate();
  const dayLabel = getDayLabel(todayDate.toISOString());

  return (
    <MobileLayout>
      <header className="sticky top-0 z-40 glass bg-card/80 border-b border-border/40">
        <div className="flex items-center justify-between h-14 px-5">
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">TODAY</p>
            <h1 className="text-lg font-bold text-foreground tracking-tight font-num">
              {month}.{String(date).padStart(2, '0')}
              <span className="text-muted-foreground font-normal text-sm ml-1">({dayLabel})</span>
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => navigate('/notifications')} className="p-2.5 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
              <Bell className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <section className="pt-3">
        {groupedSchedules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <BrandMark size="md" className="justify-center mb-4" />
            <p className="text-sm font-medium text-foreground mb-1">일정이 없어요</p>
            <p className="text-xs text-muted-foreground">+ 버튼을 눌러 일정을 추가해 보세요</p>
          </div>
        ) : (
          <ScheduleStrip
            groups={groupedSchedules}
            initialScheduleId={scheduleAnchor.anchorScheduleId}
            hasPreviousSchedules={scheduleAnchor.hasPreviousSchedules}
            onScheduleClick={handleScheduleClick}
            onComplete={handleComplete}
          />
        )}
      </section>

      <section className="mt-2">
        <Timetable schedules={schedules} startDate={timetableStart} days={4} onBlockClick={handleBlockClick} onPrev={handlePrevDays} onNext={handleNextDays} />
      </section>

      <FAB to="/schedule/new" />

      <ScheduleDetailModal schedule={selectedSchedule} open={showScheduleDetail} onClose={() => setShowScheduleDetail(false)} onUpdate={handleUpdate} />

      <ConfirmModal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={handleDeleteConfirm}
        title="일정을 완료하였습니다." description="일정을 삭제하시겠습니까?" confirmLabel="삭제" cancelLabel="유지" variant="destructive" />
    </MobileLayout>
  );
};

export default MainPage;
