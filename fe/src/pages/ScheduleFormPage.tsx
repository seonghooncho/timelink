import React, { useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MobileLayout from '@/components/layout/MobileLayout';
import PageHeader from '@/components/layout/PageHeader';
import ImageCropModal from '@/components/common/ImageCropModal';
import { ScheduleCategory } from '@/types/types';
import { Camera, Loader2, ImageIcon } from 'lucide-react';
import { aiApi } from '@/services/api';
import { useCreateSchedule } from '@/hooks/useSchedules';
import { appToast, getErrorMessage } from '@/lib/appToast';
import {
  buildScheduleCreateRequest,
  normalizeTimeToHalfHour,
} from '@/lib/scheduleForm';
import { SCHEDULE_DURATION_OPTIONS } from '@/lib/scheduleTime';
import HalfHourTimeSelect from '@/components/common/HalfHourTimeSelect';
import DurationSelect from '@/components/common/DurationSelect';
import { validateImageFile } from '@/lib/images';

const categories: { value: ScheduleCategory; label: string }[] = [
  { value: 'task', label: '할 일' },
  { value: 'appointment', label: '약속' },
  { value: 'repeat', label: '반복' },
  { value: 'group', label: '그룹' },
];

interface ScheduleFormLocationState {
  groupId?: string;
  groupName?: string;
  title?: string;
  content?: string;
  startDate?: string;
  startTime?: string;
  duration?: string | number;
  sourceLabel?: string;
}

const getExtractedDuration = (data: Awaited<ReturnType<typeof aiApi.extractSchedule>>) => {
  if (data.duration !== undefined && SCHEDULE_DURATION_OPTIONS.includes(data.duration)) {
    return String(data.duration);
  }

  if (!data.startDate || !data.startTime || !data.endTime) {
    return null;
  }

  const startTime = normalizeTimeToHalfHour(data.startTime);
  const endTime = normalizeTimeToHalfHour(data.endTime);
  const endDate = data.endDate || data.startDate;
  const start = new Date(`${data.startDate}T${startTime}:00`);
  const end = new Date(`${endDate}T${endTime}:00`);
  const duration = (end.getTime() - start.getTime()) / 3600000;

  return duration > 0 && Number.isInteger(duration * 2) ? String(duration) : null;
};

const ScheduleFormPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const createMutation = useCreateSchedule();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialContext = useMemo(() => {
    const state = location.state as ScheduleFormLocationState | null;
    return {
      groupId: state?.groupId,
      groupName: state?.groupName,
      title: state?.title ?? '',
      content: state?.content ?? '',
      startDate: state?.startDate ?? '',
      startTime: state?.startTime ? normalizeTimeToHalfHour(state.startTime) : '',
      duration: state?.duration !== undefined ? String(state.duration) : '1',
      sourceLabel: state?.sourceLabel,
    };
  }, [location.state]);

  const [category, setCategory] = useState<ScheduleCategory>(initialContext.groupId ? 'group' : 'task');
  const [title, setTitle] = useState(initialContext.title);
  const [content, setContent] = useState(initialContext.content);
  const [startDate, setStartDate] = useState(initialContext.startDate);
  const [startTime, setStartTime] = useState(initialContext.startTime);
  const [duration, setDuration] = useState(initialContext.duration);
  const [isImportant, setIsImportant] = useState(false);
  const [hasAlarm, setHasAlarm] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [cropSourceFile, setCropSourceFile] = useState<File | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validationMessage = validateImageFile(file);
    if (validationMessage) {
      appToast.error(validationMessage);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setCropSourceFile(file);
  };

  const analyzeImageFile = async (file: File, previewUrl: string) => {
    setPreviewImage(previewUrl);
    setIsAnalyzing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const data = await aiApi.extractSchedule(base64);
        if (data.title) setTitle(data.title);
        if (data.content) setContent(data.content);
        if (data.category && categories.some(c => c.value === data.category)) setCategory(data.category as ScheduleCategory);
        if (data.startDate) setStartDate(data.startDate);
        if (data.startTime) setStartTime(normalizeTimeToHalfHour(data.startTime));
        const extractedDuration = getExtractedDuration(data);
        if (extractedDuration) setDuration(extractedDuration);
        if (data.isImportant !== undefined) setIsImportant(data.isImportant);
        appToast.success('AI 분석 완료', '사진에서 일정 정보를 추출했습니다.');
      } catch (err: unknown) {
        appToast.error('분석 실패', getErrorMessage(err, '사진 분석에 실패했습니다.'));
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    const result = buildScheduleCreateRequest({
      title,
      content,
      category,
      isImportant,
      startDate,
      startTime,
      duration,
      hasAlarm,
      groupId: initialContext.groupId,
    });

    if (!result.ok) {
      appToast.error(result.message, result.description);
      return;
    }

    try {
      await createMutation.mutateAsync(result.data);
      appToast.success('일정이 등록되었습니다');
      navigate('/');
    } catch (err) {
      appToast.error('등록 실패', err, '일정 등록에 실패했습니다.');
    }
  };

  return (
    <MobileLayout>
      <PageHeader title="일정 등록" showBack backTo={initialContext.groupId ? `/groups/${initialContext.groupId}` : '/'} />
      <div className="px-4 py-4 space-y-5">
        {initialContext.sourceLabel ? (
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
            <p className="text-xs font-semibold text-primary">
              {initialContext.sourceLabel}에서 가져온 그룹 일정입니다.
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              일시와 소요시간을 확인한 뒤 등록하세요.
            </p>
          </div>
        ) : null}

        {/* AI Photo Upload */}
        <div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={handleImageUpload} />
          <button onClick={() => fileInputRef.current?.click()} disabled={isAnalyzing}
            className="w-full relative max-w-full overflow-hidden rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors active:scale-[0.98]">
            {previewImage && !isAnalyzing ? (
              <div className="relative">
                <img src={previewImage} alt="업로드된 사진" className="w-full h-32 object-cover rounded-xl opacity-80" />
                <div className="absolute inset-0 flex items-center justify-center bg-foreground/20 rounded-xl">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-background/90 rounded-lg">
                    <ImageIcon className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium text-foreground">다른 사진으로 변경</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                {isAnalyzing ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
                    <span className="text-xs font-medium text-primary">AI가 일정을 분석하고 있어요...</span>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><Camera className="w-5 h-5 text-primary" /></div>
                    <span className="text-xs font-semibold text-primary">📸 사진으로 일정 등록</span>
                    <span className="max-w-full px-3 text-center text-[10px] text-muted-foreground">15MB 이하 사진을 맞춘 뒤 AI가 일정 정보를 채워줘요</span>
                  </>
                )}
              </div>
            )}
          </button>
        </div>

        {/* Category */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-2 block">카테고리</label>
          <div className="flex gap-2">
            {categories.map(c => (
              <button key={c.value} onClick={() => setCategory(c.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${category === c.value ? 'bg-foreground text-background border-foreground' : 'bg-card text-muted-foreground border-border hover:border-muted-foreground'}`}>
                {c.label}
              </button>
            ))}
          </div>
          {initialContext.groupId ? (
            <p className="text-[11px] text-muted-foreground mt-2">
              현재 그룹: {initialContext.groupName || '선택된 그룹'}
            </p>
          ) : null}
        </div>

        {/* Title */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">제목</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="일정 제목을 입력하세요"
            className="w-full px-3 py-2.5 bg-muted rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/50" />
        </div>

        {/* Content */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">내용</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="일정 내용을 입력하세요" rows={3}
            className="w-full px-3 py-2.5 bg-muted rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring resize-none placeholder:text-muted-foreground/50" />
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">날짜</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2.5 bg-muted rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">시간</label>
            <HalfHourTimeSelect value={startTime} onChange={setStartTime} ariaLabel="시간" />
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">소요시간</label>
          <DurationSelect value={duration} onChange={setDuration} />
        </div>

        {/* Toggles */}
        <div className="flex gap-4">
          <button onClick={() => setIsImportant(!isImportant)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${isImportant ? 'bg-category-important-light text-category-important-strong border-category-important' : 'bg-card text-muted-foreground border-border'}`}>
            ⭐ 중요
          </button>
          <button onClick={() => setHasAlarm(!hasAlarm)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${hasAlarm ? 'bg-primary/10 text-primary border-primary' : 'bg-card text-muted-foreground border-border'}`}>
            🔔 알림
          </button>
        </div>

        {/* Submit */}
        <button type="button" onClick={handleSubmit} disabled={createMutation.isPending}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors active:scale-[0.98] disabled:opacity-50">
          {createMutation.isPending ? '등록 중...' : '등록하기'}
        </button>
      </div>
      {cropSourceFile ? (
        <ImageCropModal
          file={cropSourceFile}
          title="일정 사진 맞추기"
          description="분석할 영역을 조정한 뒤 저장하세요."
          outputNamePrefix="schedule-ai"
          aspectRatio={4 / 3}
          outputWidth={1200}
          onClose={() => {
            setCropSourceFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
          onConfirm={(file, previewUrl) => {
            setCropSourceFile(null);
            void analyzeImageFile(file, previewUrl);
          }}
        />
      ) : null}
    </MobileLayout>
  );
};

export default ScheduleFormPage;
