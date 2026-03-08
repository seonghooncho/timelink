import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGroups } from '@/hooks/useGroups';
import { coordinationApi } from '@/services/api';
import MemberSelector from '@/components/common/MemberSelector';
import TimePicker from '@/components/common/TimePicker';
import { toast } from 'sonner';

interface CoordinationRepeatProps {
  groupId?: string;
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

const CoordinationRepeat: React.FC<CoordinationRepeatProps> = ({ groupId }) => {
  const navigate = useNavigate();
  const { data: groups = [] } = useGroups();
  const group = groups.find(g => g.id === groupId);
  const members = group?.members ?? [];

  const [title, setTitle] = useState('');
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set(members.map(m => m.id)));
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(18);
  const [isCreating, setIsCreating] = useState(false);

  const toggleDay = (idx: number) => {
    setSelectedDays(prev => { const next = new Set(prev); next.has(idx) ? next.delete(idx) : next.add(idx); return next; });
  };
  const toggleMember = (id: string) => {
    setSelectedMembers(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const handleCreate = async () => {
    if (!groupId) return;
    setIsCreating(true);
    try {
      const dates: string[] = [];
      const today = new Date();
      for (let w = 0; w < 4; w++) {
        selectedDays.forEach(dayIdx => {
          const d = new Date(today);
          const diff = (dayIdx - today.getDay() + 7) % 7 + w * 7;
          d.setDate(today.getDate() + diff);
          dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
        });
      }
      dates.sort();

      const result = await coordinationApi.create(groupId, {
        title,
        mode: 'repeat',
        dates,
        startHour,
        endHour,
      });
      navigate(`/groups/${groupId}/coordination/${result.id}/timetable`);
    } catch {
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
        <h3 className="text-sm font-bold text-foreground mb-3">무슨 요일에 만날까요?</h3>
        <div className="grid grid-cols-7 gap-1.5">
          {DAYS.map((day, idx) => {
            const selected = selectedDays.has(idx);
            return (
              <button key={idx} onClick={() => toggleDay(idx)}
                className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all ${
                  selected ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}>{day}</button>
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
        disabled={!title.trim() || selectedDays.size === 0 || isCreating}
        className="w-full mt-8 py-3.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-40">
        {isCreating ? '생성 중...' : '생성하기'}
      </button>
    </div>
  );
};

export default CoordinationRepeat;
