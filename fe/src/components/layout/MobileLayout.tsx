import React from 'react';
import BottomNav from './BottomNav';

interface MobileLayoutProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({ children, hideNav = false }) => {
  return (
    <div className="relative mx-auto min-h-screen w-full max-w-lg overflow-x-hidden bg-background">
      <div className={hideNav ? 'min-w-0' : 'app-content-with-nav min-w-0'}>
        {children}
      </div>
      {!hideNav && <BottomNav />}
    </div>
  );
};

export default MobileLayout;
