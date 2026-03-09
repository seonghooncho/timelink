import React from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FABProps {
  to?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  variant?: 'default' | 'group';
}

const FAB: React.FC<FABProps> = ({ to, onClick, icon, variant = 'default' }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) onClick();
    else if (to) navigate(to);
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-24 right-5 z-40 w-14 h-14 rounded-2xl shadow-fab flex items-center justify-center pressable bg-primary text-primary-foreground"
    >
      {icon || <Plus className="w-6 h-6" strokeWidth={2.2} />}
    </button>
  );
};

export default FAB;
