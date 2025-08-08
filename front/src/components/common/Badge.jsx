import React from 'react';

const Badge = ({ 
  children, 
  variant = 'default', 
  size = 'sm',
  className = '',
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-full transition-all duration-200';
  
  const variants = {
    default: 'bg-gray-200 text-gray-900 border-2 border-gray-300 shadow-sm',
    primary: 'bg-blue-200 text-blue-900 border-2 border-blue-300 shadow-sm',
    success: 'bg-green-200 text-green-900 border-2 border-green-300 shadow-sm',
    warning: 'bg-yellow-200 text-yellow-900 border-2 border-yellow-300 shadow-sm',
    danger: 'bg-red-200 text-red-900 border-2 border-red-300 shadow-sm',
    info: 'bg-cyan-200 text-cyan-900 border-2 border-cyan-300 shadow-sm',
    shipping: 'bg-purple-200 text-purple-900 border-2 border-purple-300 shadow-sm',
    maintenance: 'bg-orange-200 text-orange-900 border-2 border-orange-300 shadow-sm',
    completed: 'bg-emerald-200 text-emerald-900 border-2 border-emerald-300 shadow-sm',
    failed: 'bg-rose-200 text-rose-900 border-2 border-rose-300 shadow-sm',
    pending: 'bg-slate-200 text-slate-900 border-2 border-slate-300 shadow-sm',
    processing: 'bg-indigo-200 text-indigo-900 border-2 border-indigo-300 shadow-sm'
  };
  
  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <span 
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge; 