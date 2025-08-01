import React from 'react';

const Badge = ({ 
  children, 
  variant = 'default', 
  size = 'md',
  className = '',
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-full transition-all duration-200';
  
  const variants = {
    default: 'bg-gray-100 text-gray-800 border border-gray-200',
    primary: 'bg-blue-100 text-blue-800 border border-blue-200',
    success: 'bg-green-100 text-green-800 border border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    danger: 'bg-red-100 text-red-800 border border-red-200',
    info: 'bg-cyan-100 text-cyan-800 border border-cyan-200',
    shipping: 'bg-purple-100 text-purple-800 border border-purple-200',
    maintenance: 'bg-orange-100 text-orange-800 border border-orange-200',
    completed: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    failed: 'bg-rose-100 text-rose-800 border border-rose-200',
    pending: 'bg-slate-100 text-slate-800 border border-slate-200',
    processing: 'bg-indigo-100 text-indigo-800 border border-indigo-200'
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