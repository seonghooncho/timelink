import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { coordinationApi } from '@/services/api';
import TimePicker from '@/components/common/TimePicker';
import { appToast } from '@/lib/appToast';
import { trackEvent } from '@/lib/analytics';

interface CoordinationOneTimeProps {
  groupId?: string;
}

const formatDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const getMonthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const formatSelectedDateLabel = (key: string) => {
  const [, month, day] = key.split('-').map(Number);
  return `${month}/${day}`;
};

const CoordinationOneTime: React.FC<CoordinationOneTimeProps> = ({ groupId }) => {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [visibleMonth, setVisibleMonth] = useState(() => getMonthStart(new Date()));
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(18);
  const [isCreating, setIsCreating] = useState(false);

  const currentMonthStart = useMemo(() => getMonthStart(new Date()), []);
  const todayKey = useMemo(() => formatDateKey(new Date()), []);
  const calendarData = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    const dates: Date[] = [];
    const current = new Date(startDate);
    for (let i = 0; i < 42; i++) { dates.push(new Date(current)); current.setDate(current.getDate() + 1); }
    return { dates, currentMonth: month, currentYear: year };
  }, [visibleMonth]);

  const selectedDateLabels = useMemo(() => {
    const sorted = Array.from(selectedDates).sort();
    const preview = sorted.slice(0, 3).map(formatSelectedDateLabel).join(', ');
    return {
      count: sorted.length,
      text: sorted.length > 3 ? `${preview} 외 ${sorted.length - 3}일` : preview,
    };
  }, [selectedDates]);

  const canMovePrevMonth = visibleMonth.getTime() > currentMonthStart.getTime();

  const moveMonth = (offset: number) => {
    setVisibleMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const toggleDate = (key: string) => {
    if (key < todayKey) {
      appToast.info('지난 날짜는 선택할 수 없습니다');
      return;
    }
    setSelectedDates(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const isCurrentMonth = (d: Date) => d.getMonth() === calendarData.currentMonth;
  const dayHeaders = ['일', '월', '화', '수', '목', '금', '토'];

  const handleCreate = async () => {
    if (!groupId) {
      appToast.error('그룹 정보를 확인할 수 없습니다');
      return;
    }
    if (!title.trim()) {
      appToast.error('조율 제목을 입력해주세요');
      return;
    }
    if (selectedDates.size === 0) {
      appToast.error('조율할 날짜를 선택해주세요');
      return;
    }
    if (endHour <= startHour) {
      appToast.error('시간 범위를 확인해주세요', '종료 시간은 시작 시간보다 뒤여야 합니다.');
      return;
    }

    setIsCreating(true);
    try {
      const dates = Array.from(selectedDates).sort();
      trackEvent('coordination_create_start', {
        mode: 'once',
        date_count: dates.length,
        hour_count: endHour - startHour,
      });
      const result = await coordinationApi.create(groupId, {
        title: title.trim(),
        mode: 'once',
        dates,
        startHour,
        endHour,
      });
      navigate(`/groups/${groupId}/coordination/${result.id}/timetable`);
    } catch (err) {
      appToast.error('조율 생성에 실패했습니다', err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="px-4 pt-5">
      <input type="text" placeholder="제목" value={title} onChange={e => setTitle(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />

      <div className="mt-5 rounded-xl border border-border bg-card px-4 py-3">
        <p className="text-[11px] font-semibold text-muted-foreground">대상</p>
        <p className="mt-1 text-sm font-bold text-foreground">그룹 전체 · 생성자 포함</p>
      </div>

      <div className="mt-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-foreground">며칠에 만날까요?</h3>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {selectedDateLabels.count > 0
                ? `${selectedDateLabels.count}일 선택 · ${selectedDateLabels.text}`
                : '오늘 이후 날짜를 여러 개 선택할 수 있습니다'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-xl border border-border bg-card p-1">
            <button
              type="button"
              aria-label="이전 달"
              onClick={() => moveMonth(-1)}
              disabled={!canMovePrevMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[4.5rem] text-center text-xs font-bold text-foreground">
              {calendarData.currentYear}.{String(calendarData.currentMonth + 1).padStart(2, '0')}
            </span>
            <button
              type="button"
              aria-label="다음 달"
              onClick={() => moveMonth(1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 mb-1">
          {dayHeaders.map(day => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1.5">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {calendarData.dates.map((date, i) => {
            const key = formatDateKey(date);
            const selected = selectedDates.has(key);
            const inMonth = isCurrentMonth(date);
            const isToday = date.toDateString() === new Date().toDateString();
            const isPast = key < todayKey;
            const displayDate = date.getDate() === 1 ? `${date.getMonth() + 1}/${date.getDate()}` : `${date.getDate()}`;
            return (
              <button key={i} onClick={() => toggleDate(key)} disabled={isPast}
                className={`aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-all ${
                  selected
                    ? 'bg-foreground text-background'
                    : isPast
                      ? 'text-muted-foreground/25'
                      : inMonth
                        ? 'text-foreground hover:bg-muted'
                        : 'text-muted-foreground/45 hover:bg-muted'
                } ${isToday && !selected ? 'ring-1 ring-primary' : ''} disabled:cursor-not-allowed`}>
                {displayDate}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-bold text-foreground mb-3">몇시에 만날까요?</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <TimePicker value={startHour} onChange={(h) => { setStartHour(h); if (h >= endHour) setEndHour(h + 1); }} maxHour={23} />
          <span className="text-xs text-muted-foreground">~</span>
          <TimePicker value={endHour} onChange={setEndHour} minHour={startHour + 1} maxHour={24} />
        </div>
      </div>

      <button onClick={handleCreate}
        disabled={isCreating}
        className="w-full mt-8 py-3.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-40">
        {isCreating ? '생성 중...' : '생성하기'}
      </button>
    </div>
  );
};

export default CoordinationOneTime;
