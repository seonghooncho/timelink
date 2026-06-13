import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, CalendarDays, MessageCircle, Users, User } from 'lucide-react';

const navItems = [
  { path: '/', icon: Home, label: '홈' },
  { path: '/calendar', icon: CalendarDays, label: '캘린더' },
  { path: '/groups', icon: Users, label: '모임' },
  { path: '/community', icon: MessageCircle, label: '커뮤니티' },
  { path: '/mypage', icon: User, label: '마이' },
];

const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 app-layer-navigation glass bg-card/80 border-t border-border/60 app-bottom-nav">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16">
        {navItems.map(item => {
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-1.5 transition-all"
            >
              <div className={`p-1.5 rounded-xl transition-all ${
                isActive ? 'bg-primary/10' : ''
              }`}>
                <item.icon
                  className={`w-[22px] h-[22px] transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                  strokeWidth={isActive ? 2 : 1.6}
                />
              </div>
              <span className={`text-[10px] font-medium transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
