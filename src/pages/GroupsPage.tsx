import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Bell } from 'lucide-react';
import MobileLayout from '@/components/layout/MobileLayout';
import PageHeader from '@/components/layout/PageHeader';
import GroupAvatar from '@/components/common/GroupAvatar';
import FAB from '@/components/common/FAB';
import { useGroups } from '@/hooks/useGroups';

const GroupsPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: groups = [] } = useGroups();

  return (
    <MobileLayout>
      <PageHeader title="나의 그룹" rightElement={
        <button onClick={() => navigate('/notifications')} className="p-2 rounded-xl text-muted-foreground hover:bg-muted transition-all">
          <Bell className="w-5 h-5" />
        </button>
      } />
      <div className="px-5 py-4 space-y-2.5">
        {groups.map(group => (
          <button key={group.id} onClick={() => navigate(`/groups/${group.id}`)}
            className="w-full flex items-center gap-4 p-4 bg-card rounded-2xl shadow-soft hover:shadow-card transition-all text-left pressable">
            <GroupAvatar image={group.image} name={group.name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">{group.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">멤버 {group.members.length}명</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
          </button>
        ))}
      </div>
      <FAB to="/groups/new" />
    </MobileLayout>
  );
};

export default GroupsPage;
