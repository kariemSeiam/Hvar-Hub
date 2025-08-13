import React, { useMemo } from 'react';
import { OrderCard } from '../common';

const OrderList = ({ 
  orders = [], 
  isLoading = false, 
  activeTab = 'received',
  highlightedOrderId = null,
  actionInProgress = null,
  onAction,
  onShowTimeline,
  forceUpdate = 0
}) => {
  // Memoize the highlight classes to prevent recalculation
  const getHighlightClasses = useMemo(() => {
    const tabColorMap = {
      'received': 'blue',
      'inMaintenance': 'amber', 
      'completed': 'green',
      'failed': 'red',
      'sending': 'purple',
      'returns': 'gray'
    };
    
    const color = tabColorMap[activeTab] || 'blue';
    
    const highlightStyles = {
      blue: 'border-l-4 border-blue-500 bg-gradient-to-r from-blue-50/80 to-blue-100/40 shadow-lg shadow-blue-200/50 ring-2 ring-blue-300/30',
      amber: 'border-l-4 border-amber-500 bg-gradient-to-r from-amber-50/80 to-amber-100/40 shadow-lg shadow-amber-200/50 ring-2 ring-amber-300/30',
      green: 'border-l-4 border-green-500 bg-gradient-to-r from-green-50/80 to-green-100/40 shadow-lg shadow-green-200/50 ring-2 ring-green-300/30',
      red: 'border-l-4 border-red-500 bg-gradient-to-r from-red-50/80 to-red-100/40 shadow-lg shadow-red-200/50 ring-2 ring-red-300/30',
      purple: 'border-l-4 border-purple-500 bg-gradient-to-r from-purple-50/80 to-purple-100/40 shadow-lg shadow-purple-200/50 ring-2 ring-purple-300/30',
      gray: 'border-l-4 border-gray-500 bg-gradient-to-r from-gray-50/80 to-gray-100/40 shadow-lg shadow-gray-200/50 ring-2 ring-gray-300/30'
    };
    
    return highlightStyles[color];
  }, [activeTab]);

  // Memoize orders to prevent unnecessary re-renders
  const memoizedOrders = useMemo(() => orders, [orders, forceUpdate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-600 font-cairo">جاري تحميل الطلبات...</span>
        </div>
      </div>
    );
  }

  if (!memoizedOrders || memoizedOrders.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2 font-cairo">
          لا توجد طلبات
        </h3>
        <p className="text-gray-600 font-cairo">
          لا توجد طلبات في هذه المرحلة حالياً
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {memoizedOrders.map((order) => (
        <OrderCard
          key={`${order._id}-${forceUpdate}`}
          order={order}
          onAction={onAction}
          showTimeline={false}
          onShowTimeline={onShowTimeline}
          className={`text-sm transition-all duration-500 ease-out transform ${
            highlightedOrderId === order._id 
              ? `${getHighlightClasses} scale-[1.02]` 
              : ''
          } ${actionInProgress ? 'opacity-75' : ''}`}
          disabled={actionInProgress}
        />
      ))}
    </div>
  );
};

// Use React.memo for performance optimization
export default React.memo(OrderList);