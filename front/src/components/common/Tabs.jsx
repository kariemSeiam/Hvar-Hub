import React, { useState, useMemo } from 'react';

const Tabs = ({ 
  tabs, 
  activeTab, 
  onTabChange, 
  variant = 'default',
  size = 'md',
  className = '',
  ...props 
}) => {
  const variants = {
    default: {
      container: 'border-b border-gray-200',
      tab: 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
      active: 'border-blue-500 text-blue-600'
    },
    pills: {
      container: 'space-x-1 space-x-reverse',
      tab: 'rounded-lg px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100',
      active: 'bg-blue-100 text-blue-700'
    },
    underline: {
      container: 'border-b border-gray-200',
      tab: 'border-b-2 border-transparent text-gray-600 hover:text-gray-800',
      active: 'border-indigo-500 text-indigo-600'
    },
    modern: {
      container: 'bg-white rounded-xl shadow-sm border border-gray-100 p-1',
      tab: 'relative rounded-lg px-4 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all duration-200',
      active: 'bg-gradient-to-r from-brand-red-500 to-brand-red-600 text-white shadow-lg transform scale-105'
    },
    compact: {
      container: 'bg-gray-50 rounded-lg p-1',
      tab: 'relative rounded-md px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-white transition-all duration-150',
      active: 'bg-white text-brand-red-600 shadow-sm border border-gray-200'
    },
    glass: {
      container: 'backdrop-blur-sm bg-white/80 rounded-2xl shadow-lg border border-white/20 p-1',
      tab: 'relative rounded-xl px-4 py-2.5 text-gray-700 hover:text-gray-900 hover:bg-white/50 transition-all duration-200',
      active: 'bg-white/90 text-brand-red-600 shadow-md backdrop-blur-sm'
    }
  };

  const sizes = {
    sm: 'text-xs px-2 py-1.5',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-3'
  };

  const currentVariant = variants[variant];

  // Memoize tab rendering for performance
  const renderedTabs = useMemo(() => {
    return tabs.map((tab) => {
      const isActive = activeTab === tab.id;
      const hasBadge = tab.badge && tab.badge !== '0';
      
      return (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            ${currentVariant.tab}
            ${isActive ? currentVariant.active : ''}
            ${sizes[size]}
            font-cairo font-medium transition-all duration-200
            focus:outline-none
            group relative overflow-hidden
            ${isActive ? 'z-10' : 'z-0'}
          `}
          aria-selected={isActive}
          role="tab"
        >
          {/* Active indicator */}
          {isActive && (
            <div className="absolute inset-0 bg-gradient-to-r from-brand-red-500 to-brand-red-600 rounded-lg opacity-90"></div>
          )}
          
          {/* Content wrapper */}
          <div className="relative z-10 flex items-center justify-center space-x-2 space-x-reverse">
            {/* Icon */}
            {tab.icon && (
              <span className={`
                transition-all duration-200
                ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'}
              `}>
                {tab.icon}
              </span>
            )}
            
            {/* Label */}
            <span className={`
              transition-all duration-200 font-medium
              ${isActive ? 'text-white' : 'text-gray-700 group-hover:text-gray-900'}
            `}>
              {tab.label}
            </span>
            
            {/* Badge */}
            {hasBadge && (
              <span className={`
                inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-bold transition-all duration-200
                ${isActive 
                  ? 'bg-white/20 text-white border border-white/30' 
                  : 'bg-brand-red-100 text-brand-red-700 group-hover:bg-brand-red-200'
                }
              `}>
                {tab.badge}
              </span>
            )}
          </div>
          
          {/* Hover effect */}
          {!isActive && (
            <div className="absolute inset-0 bg-gradient-to-r from-brand-red-500/10 to-brand-red-600/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          )}
        </button>
      );
    });
  }, [tabs, activeTab, currentVariant, sizes, size]);

  return (
    <div 
      className={`${currentVariant.container} ${className}`} 
      role="tablist"
      aria-label="Order management tabs"
      {...props}
    >
      <nav className="flex space-x-1 space-x-reverse" aria-label="Tabs">
        {renderedTabs}
      </nav>
    </div>
  );
};

export default Tabs; 