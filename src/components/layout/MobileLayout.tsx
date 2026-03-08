import React from 'react';
import BottomNav from './BottomNav';

interface MobileLayoutProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({ children, hideNav = false }) => {
  return (
    <div className="min-h-screen max-w-lg mx-auto bg-background relative">
      <div className={hideNav ? '' : 'pb-20'}>
        {children}
      </div>
      {!hideNav && <BottomNav />}
    </div>
  );
};

export default MobileLayout;
