import React from 'react';
import { ScheduleCategory } from '@/types/types';
import { getCategoryLabel, getCategoryColor } from '@/utils';

interface CategoryBadgeProps {
  category: ScheduleCategory;
  variant?: 'default' | 'light' | 'strong';
  size?: 'sm' | 'md';
}

const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category, variant = 'light', size = 'sm' }) => {
  return (
    <span className={`inline-flex items-center rounded-lg font-semibold ${getCategoryColor(category, variant)} ${
      size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
    }`}>
      {getCategoryLabel(category)}
    </span>
  );
};

export default CategoryBadge;
