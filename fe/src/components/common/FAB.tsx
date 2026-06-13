import React from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FABProps {
  to?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  variant?: 'default' | 'group' | 'community';
  ariaLabel?: string;
  className?: string;
}

const FAB: React.FC<FABProps> = ({ to, onClick, icon, variant = 'default', ariaLabel, className = '' }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) onClick();
    else if (to) navigate(to);
  };

  const colorClassName = {
    default: 'bg-primary text-primary-foreground',
    group: 'bg-category-group text-primary-foreground',
    community: 'bg-coord-green text-primary-foreground',
  }[variant];

  return (
    <button
      onClick={handleClick}
      aria-label={ariaLabel}
      className={`fixed app-floating-action right-5 app-layer-floating w-14 h-14 rounded-2xl shadow-fab flex items-center justify-center pressable ${colorClassName} ${className}`}
    >
      {icon || <Plus className="w-6 h-6" strokeWidth={2.2} />}
    </button>
  );
};

export default FAB;
