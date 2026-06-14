import React from 'react';

interface BrandMarkProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  className?: string;
}

const sizeClasses: Record<NonNullable<BrandMarkProps['size']>, string> = {
  sm: 'w-12 h-12 rounded-2xl',
  md: 'w-16 h-16 rounded-2xl',
  lg: 'w-20 h-20 rounded-3xl',
};

const BrandMark: React.FC<BrandMarkProps> = ({
  size = 'md',
  showWordmark = false,
  className = '',
}) => {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`.trim()}>
      <img
        src="/applogo.svg"
        alt="Timelink"
        className={`${sizeClasses[size]} shadow-[0_12px_30px_rgba(27,127,245,0.14)]`}
      />
      {showWordmark ? (
        <div className="text-left">
          <div className="text-[26px] font-bold tracking-tight text-foreground">Timelink</div>
          <div className="text-sm text-muted-foreground">개인과 모임 일정을 자연스럽게 연결합니다</div>
        </div>
      ) : null}
    </div>
  );
};

export default BrandMark;
