import React from 'react';
import { GroupMember } from '@/types/types';

interface MemberSelectorProps {
  members: GroupMember[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}

const MemberSelector: React.FC<MemberSelectorProps> = ({ members, selectedIds, onToggle }) => (
  <div>
    <h3 className="text-sm font-bold text-foreground mb-2">참여 멤버</h3>
    <div className="flex flex-wrap gap-2">
      {members.map(m => {
        const selected = selectedIds.has(m.id);
        return (
          <button
            key={m.id}
            onClick={() => onToggle(m.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              selected
                ? 'bg-foreground text-background border-foreground'
                : 'bg-card text-muted-foreground border-border hover:bg-muted'
            }`}
          >
            {m.name}
          </button>
        );
      })}
    </div>
  </div>
);

export default MemberSelector;
