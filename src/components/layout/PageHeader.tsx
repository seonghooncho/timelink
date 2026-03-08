import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  rightElement?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, showBack = false, rightElement }) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 glass bg-card/80 border-b border-border/40">
      <div className="flex items-center justify-between h-14 px-5">
        <div className="flex items-center gap-3">
          {showBack && (
            <button onClick={() => navigate(-1)} className="p-1 -ml-2 text-foreground hover:text-primary transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-[17px] font-bold text-foreground tracking-tight">{title}</h1>
        </div>
        {rightElement && <div>{rightElement}</div>}
      </div>
    </header>
  );
};

export default PageHeader;
