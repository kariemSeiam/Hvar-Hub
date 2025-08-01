import React from 'react';

const CompactProfile = ({ 
  name, 
  phone, 
  avatar, 
  status = 'active',
  size = 'md',
  showDetails = true,
  className = '',
  ...props 
}) => {
  const sizes = {
    sm: {
      container: 'flex items-center space-x-3 space-x-reverse',
      avatar: 'w-8 h-8',
      text: 'text-sm'
    },
    md: {
      container: 'flex items-center space-x-4 space-x-reverse',
      avatar: 'w-10 h-10',
      text: 'text-base'
    },
    lg: {
      container: 'flex items-center space-x-4 space-x-reverse',
      avatar: 'w-12 h-12',
      text: 'text-lg'
    }
  };

  const statusColors = {
    active: 'bg-green-500',
    inactive: 'bg-gray-400',
    busy: 'bg-yellow-500',
    offline: 'bg-red-500'
  };

  return (
    <div className={`${sizes[size].container} ${className}`} {...props}>
      {/* Avatar */}
      <div className="relative">
        <div className={`${sizes[size].avatar} rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold`}>
          {avatar ? (
            <img src={avatar} alt={name} className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-sm font-cairo-play">
              {name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          )}
        </div>
        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${statusColors[status]}`}></div>
      </div>

      {/* Details */}
      {showDetails && (
        <div className="flex-1 min-w-0">
          <div className={`font-cairo-play font-medium text-gray-900 ${sizes[size].text}`}>
            {name || 'اسم العميل'}
          </div>
          {phone && (
            <div className="text-gray-500 text-sm font-roboto">
              {phone}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CompactProfile; 