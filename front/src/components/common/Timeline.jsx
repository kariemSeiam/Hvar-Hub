import React from 'react';

const Timeline = ({ 
  items, 
  variant = 'default',
  className = '',
  ...props 
}) => {
  const variants = {
    default: {
      container: 'relative',
      item: 'relative pb-8',
      line: 'absolute right-4 top-4 w-0.5 h-full bg-gray-200',
      dot: 'absolute right-4 top-4 w-3 h-3 rounded-full border-2 border-white shadow-sm',
      content: 'mr-12'
    },
    compact: {
      container: 'relative',
      item: 'relative pb-6',
      line: 'absolute right-3 top-3 w-0.5 h-full bg-gray-200',
      dot: 'absolute right-3 top-3 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm',
      content: 'mr-8'
    }
  };

  const statusColors = {
    completed: 'bg-green-500',
    processing: 'bg-blue-500',
    pending: 'bg-yellow-500',
    failed: 'bg-red-500',
    shipping: 'bg-purple-500',
    maintenance: 'bg-orange-500',
    delivered: 'bg-emerald-500',
    returned: 'bg-rose-500'
  };

  const currentVariant = variants[variant];

  return (
    <div className={`${currentVariant.container} ${className}`} {...props}>
      {items.map((item, index) => (
        <div key={index} className={currentVariant.item}>
          {/* Timeline line */}
          {index < items.length - 1 && (
            <div className={currentVariant.line}></div>
          )}
          
          {/* Timeline dot */}
          <div className={`${currentVariant.dot} ${statusColors[item.status] || 'bg-gray-400'}`}></div>
          
          {/* Timeline content */}
          <div className={currentVariant.content}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-cairo-play font-semibold text-gray-900 mb-1">
                  {item.title}
                </h4>
                {item.description && (
                  <p className="text-gray-600 text-sm mb-2 font-roboto">
                    {item.description}
                  </p>
                )}
                {item.details && (
                  <div className="text-xs text-gray-500 font-roboto">
                    {item.details}
                  </div>
                )}
              </div>
              <div className="text-right">
                <time className="text-xs text-gray-500 font-roboto">
                  {item.time}
                </time>
              </div>
            </div>
            
            {/* Action buttons */}
            {item.actions && (
              <div className="mt-3 flex space-x-2 space-x-reverse">
                {item.actions.map((action, actionIndex) => (
                  <button
                    key={actionIndex}
                    onClick={action.onClick}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors duration-200"
                  >
                    {action.icon && (
                      <span className="ml-1 ml-reverse mr-1">
                        {action.icon}
                      </span>
                    )}
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Timeline; 