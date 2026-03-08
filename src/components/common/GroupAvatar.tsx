import React from 'react';

interface GroupAvatarProps {
  image?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'w-10 h-10',
  md: 'w-11 h-11',
  lg: 'w-14 h-14',
};

const iconSizeMap = {
  sm: 'w-5 h-5',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

const GroupAvatar: React.FC<GroupAvatarProps> = ({ image, name, size = 'sm' }) => {
  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className={`${sizeMap[size]} rounded-xl object-cover`}
      />
    );
  }

  return (
    <div className={`${sizeMap[size]} rounded-xl bg-category-group-light flex items-center justify-center`}>
      <svg className={`${iconSizeMap[size]} text-category-group`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </div>
  );
};

export default GroupAvatar;
