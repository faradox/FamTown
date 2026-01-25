/**
 * Avatar component - displays user avatar image or initials
 */

import React, { useState } from 'react';
import { profileAPI } from '../../services/profileAPI';

const Avatar = ({ user, size = 'md', className = '' }) => {
  const [imageError, setImageError] = useState(false);

  // Calculate initials from name
  const getInitials = () => {
    if (!user?.name) return '?';

    const nameParts = user.name.trim().split(' ');
    if (nameParts.length >= 2) {
      return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
    }
    return nameParts[0].substring(0, 2).toUpperCase();
  };

  // Size classes
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-lg',
    lg: 'w-16 h-16 text-2xl',
    xl: 'w-24 h-24 text-4xl',
    '2xl': 'w-32 h-32 text-5xl',
  };

  const shouldShowImage = user?.id && user?.hasAvatar && !imageError;

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-semibold ${className}`}
      style={{
        backgroundColor: shouldShowImage ? 'transparent' : '#4F46E5',
        color: shouldShowImage ? 'inherit' : 'white',
      }}
    >
      {shouldShowImage ? (
        <img
          src={profileAPI.getAvatarUrl(user.id)}
          alt={user.name || 'User avatar'}
          className="w-full h-full rounded-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <span>{getInitials()}</span>
      )}
    </div>
  );
};

export default Avatar;
