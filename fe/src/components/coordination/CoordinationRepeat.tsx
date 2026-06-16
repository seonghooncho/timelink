import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { coordinationApi } from '@/services/api';
import TimePicker from '@/components/common/TimePicker';
import { appToast } from '@/lib/appToast';
import { trackEvent } from '@/lib/analytics';
import { trackProductEvent } from '@/lib/productAnalytics';
import {
  COORDINATION_DESCRIPTION_MAX_LENGTH,
  COORDINATION_TITLE_MAX_LENGTH,
  trimCoordinationDescription,
} from '@/lib/coordinationForm';

interface CoordinationRepeatProps {
  groupId?: string;
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

const CoordinationRepeat: React.FC<CoordinationRepeatProps> = ({ groupId }) => {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(18);
  const [isCreating, setIsCreating] = useState(false);

  const toggleDay = (idx: number) => {
    setSelectedDays(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const handleCreate = async () => {
    if (!groupId) {
      appToast.error('모임 정보를 확인할 수 없습니다');
      return;
    }
    if (!title.trim()) {
      appToast.error('조율 제목을 입력해주세요');
      return;
    }
    if (selectedDays.size === 0) {
      appToast.error('조율할 요일을 선택해주세요');
      return;
    }
    if (endHour <= startHour) {
      appToast.error('시간 범위를 확인해주세요', '종료 시간은 시작 시간보다 뒤여야 합니다.');
      return;
    }

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

      trackEvent('coordination_create_start', {
        mode: 'repeat',
        date_count: dates.length,
        hour_count: endHour - startHour,
      });
      const result = await coordinationApi.create(groupId, {
        title: title.trim(),
        description: trimCoordinationDescription(description),
        mode: 'repeat',
        dates,
        startHour,
        endHour,
      });
      trackProductEvent('link_created', {
        feature: 'schedule',
        link_type: 'coordination',
        source: 'coordination_repeat',
      });
      navigate(`/groups/${groupId}/coordination/${result.id}/timetable`);
    } catch (error) {
      appToast.error('조율 생성에 실패했습니다', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="px-4 pt-5">
      <input type="text" placeholder="제목" value={title} onChange={e => setTitle(e.target.value)} maxLength={COORDINATION_TITLE_MAX_LENGTH}
        className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
      <p className="mt-1 text-right text-[10px] text-muted-foreground">{title.length}/{COORDINATION_TITLE_MAX_LENGTH}</p>

      <div className="mt-3">
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={COORDINATION_DESCRIPTION_MAX_LENGTH}
          rows={2}
          className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="설명 (선택)"
        />
        <p className="mt-1 text-right text-[10px] text-muted-foreground">{description.length}/{COORDINATION_DESCRIPTION_MAX_LENGTH}</p>
      </div>

      <div className="mt-5 rounded-xl border border-border bg-card px-4 py-3">
        <p className="text-[11px] font-semibold text-muted-foreground">대상</p>
        <p className="mt-1 text-sm font-bold text-foreground">모임 전체 · 생성자 포함</p>
      </div>

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
        disabled={isCreating}
        className="w-full mt-8 py-3.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-40">
        {isCreating ? '생성 중...' : '생성하기'}
      </button>
    </div>
  );
};

export default CoordinationRepeat;
