import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Schedule } from '@/types/types';
import CategoryBadge from '@/components/common/CategoryBadge';
import { appToast } from '@/lib/appToast';

interface ScheduleDetailModalProps {
  schedule: Schedule | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Schedule>) => void;
}

const ScheduleDetailModal: React.FC<ScheduleDetailModalProps> = ({ schedule, open, onClose, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  if (!schedule) return null;

  const startDate = new Date(schedule.startTime);
  const endDate = new Date(schedule.endTime);

  const handleEdit = () => {
    setEditTitle(schedule.title);
    setEditContent(schedule.content);
    setIsEditing(true);
  };

  const handleSave = () => {
    const nextTitle = editTitle.trim();
    if (!nextTitle) {
      appToast.error('제목을 입력해주세요');
      return;
    }

    onUpdate(schedule.id, { title: nextTitle, content: editContent.trim() });
    setIsEditing(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative bg-card rounded-t-3xl w-full max-w-lg p-6 pb-10 shadow-elevated"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Handle */}
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />

            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <CategoryBadge category={schedule.category} size="md" />
                {schedule.isImportant && <CategoryBadge category="important" size="md" />}
              </div>
              <button onClick={onClose} className="p-2 rounded-xl text-muted-foreground hover:bg-muted transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            {isEditing ? (
              <div className="space-y-3">
                <input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full text-lg font-bold bg-muted rounded-xl px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  rows={3}
                  className="w-full text-sm bg-muted rounded-xl px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-ring resize-none"
                />
                <button
                  onClick={handleSave}
                  className="w-full py-3.5 bg-primary text-primary-foreground rounded-2xl text-sm font-bold pressable"
                >
                  저장하기
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-foreground mb-1">{schedule.title}</h2>

                <div className="space-y-3 mt-5">
                  <DetailRow label="시작" value={`${startDate.getMonth()+1}/${startDate.getDate()} ${startDate.getHours()}:${String(startDate.getMinutes()).padStart(2,'0')}`} />
                  <DetailRow label="종료" value={`${endDate.getMonth()+1}/${endDate.getDate()} ${endDate.getHours()}:${String(endDate.getMinutes()).padStart(2,'0')}`} />
                  <DetailRow label="소요" value={`${schedule.duration}시간`} />
                </div>

                {schedule.content && (
                  <div className="mt-5 p-4 bg-muted rounded-2xl">
                    <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{schedule.content}</p>
                  </div>
                )}

                <button
                  onClick={handleEdit}
                  className="w-full mt-5 py-3.5 bg-muted text-foreground rounded-2xl text-sm font-semibold hover:bg-accent transition-colors pressable"
                >
                  수정하기
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-num text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

export default ScheduleDetailModal;
