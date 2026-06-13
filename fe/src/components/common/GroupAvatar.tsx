import React from 'react';

interface GroupAvatarProps {
  image?: string;
  thumbnail?: string;
  name: string;
  status?: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const sizeMap = {
  xs: 'w-8 h-8',
  sm: 'w-10 h-10',
  md: 'w-11 h-11',
  lg: 'w-14 h-14',
};

const iconSizeMap = {
  xs: 'w-4 h-4',
  sm: 'w-5 h-5',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

const GroupAvatar: React.FC<GroupAvatarProps> = ({ image, thumbnail, name, status, size = 'sm' }) => {
  const isProcessing = status === 'PROCESSING';
  const isFailed = status === 'FAILED';
  const displayImage = thumbnail || image;

  if (displayImage) {
    return (
      <div className={`${sizeMap[size]} relative shrink-0 overflow-hidden rounded-xl`}>
        <img
          src={displayImage}
          alt={name}
          className="h-full w-full object-cover"
        />
        {isProcessing ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`${sizeMap[size]} relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-category-group-light`}>
      <svg className={`${iconSizeMap[size]} text-category-group`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      {isProcessing ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/35">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        </div>
      ) : null}
      {isFailed ? (
        <span className="absolute inset-x-0 bottom-0 bg-destructive px-1 py-0.5 text-center text-[8px] font-bold text-destructive-foreground">
          실패
        </span>
      ) : null}
    </div>
  );
};

export default GroupAvatar;
