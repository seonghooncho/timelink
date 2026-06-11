import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { To } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  backTo?: To;
  rightElement?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, showBack = false, backTo = '/', rightElement }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    const historyState = window.history.state as { idx?: number } | null;
    const canGoBackWithinApp = location.key !== 'default' && typeof historyState?.idx === 'number' && historyState.idx > 0;

    if (canGoBackWithinApp) {
      navigate(-1);
      return;
    }

    navigate(backTo, { replace: true });
  };

  return (
    <header className="sticky top-0 app-layer-header glass bg-card/80 border-b border-border/40">
      <div className="flex items-center justify-between h-14 px-5">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              type="button"
              onClick={handleBack}
              className="p-1 -ml-2 text-foreground hover:text-primary transition-colors"
              aria-label="이전 페이지로 이동"
            >
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
