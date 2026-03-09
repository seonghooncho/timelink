import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGroups } from '@/hooks/useGroups';
import { coordinationApi } from '@/services/api';
import MemberSelector from '@/components/common/MemberSelector';
import TimePicker from '@/components/common/TimePicker';
import { toast } from 'sonner';

interface CoordinationOneTimeProps {
  groupId?: string;
}

const CoordinationOneTime: React.FC<CoordinationOneTimeProps> = ({ groupId }) => {
  const navigate = useNavigate();
  const { data: groups = [] } = useGroups();
  const group = groups.find(g => g.id === groupId);
  const members = group?.members ?? [];

  const [title, setTitle] = useState('');
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set(members.map(m => m.id)));
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(18);
  const [isCreating, setIsCreating] = useState(false);

  const calendarData = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    const dates: Date[] = [];
    const current = new Date(startDate);
    for (let i = 0; i < 35; i++) { dates.push(new Date(current)); current.setDate(current.getDate() + 1); }
    return { dates, currentMonth: month, currentYear: year };
  }, []);

  const toggleDate = (key: string) => {
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
  const toggleMember = (id: string) => {
    setSelectedMembers(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatDateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const isCurrentMonth = (d: Date) => d.getMonth() === calendarData.currentMonth;
  const dayHeaders = ['일', '월', '화', '수', '목', '금', '토'];

  const handleCreate = async () => {
    if (!groupId) return;
    setIsCreating(true);
    try {
      const dates = Array.from(selectedDates).sort();
      const result = await coordinationApi.create(groupId, {
        title,
        mode: 'once',
        dates,
        startHour,
        endHour,
      });
      navigate(`/groups/${groupId}/coordination/${result.id}/timetable`);
    } catch (err) {
      toast.error('조율 생성에 실패했습니다');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="px-4 pt-5">
      <input type="text" placeholder="제목" value={title} onChange={e => setTitle(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />

      {members.length > 0 && (
        <div className="mt-5">
          <MemberSelector members={members} selectedIds={selectedMembers} onToggle={toggleMember} />
        </div>
      )}

      <div className="mt-5">
        <h3 className="text-sm font-bold text-foreground mb-3">며칠에 만날까요?</h3>
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
            const displayDate = date.getDate() === 1 ? `${date.getMonth() + 1}/${date.getDate()}` : `${date.getDate()}`;
            return (
              <button key={i} onClick={() => toggleDate(key)}
                className={`aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-all ${
                  selected ? 'bg-foreground text-background' : inMonth ? 'text-foreground hover:bg-muted' : 'text-muted-foreground/40'
                } ${isToday && !selected ? 'ring-1 ring-primary' : ''}`}>
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
        disabled={!title.trim() || selectedDates.size === 0 || isCreating}
        className="w-full mt-8 py-3.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-40">
        {isCreating ? '생성 중...' : '생성하기'}
      </button>
    </div>
  );
};

export default CoordinationOneTime;
