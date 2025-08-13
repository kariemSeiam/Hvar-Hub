import React from 'react';

const ConfirmationPanel = ({ 
  scannedOrder, 
  onConfirm, 
  onCancel,
  isReturnOrder = false,
  className = "" 
}) => {
  if (!scannedOrder) return null;

  return (
    <div className={`bg-gradient-to-r border-b p-3 ${
      isReturnOrder
        ? 'from-orange-50 to-red-50 border-orange-200'
        : 'from-green-50 to-emerald-50 border-green-200'
    } ${className}`}>
      <div className="flex items-center justify-between">
        {/* Left - Order Details */}
        <div className="flex items-center space-x-3 space-x-reverse flex-1">
          {/* Status Icon */}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            isReturnOrder ? 'bg-orange-100' : 'bg-green-100'
          }`}>
            <svg className={`w-4 h-4 ${
              isReturnOrder ? 'text-orange-600' : 'text-green-600'
            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isReturnOrder ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              )}
            </svg>
          </div>

          {/* Expert Horizontal Order Information */}
          <div className="flex-1 min-w-0">
            {/* Horizontal Layout with Single Icons */}
            <div className="flex items-center space-x-6 space-x-reverse">

              {/* 1. Tracking Number */}
              <div className="flex items-center space-x-3 space-x-reverse flex-shrink-0">
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 text-xs font-cairo mb-1">
                    رقم التتبع
                  </p>
                  <span className="text-gray-900 text-md font-bold font-cairo truncate max-w-32">
                    {scannedOrder.trackingNumber}
                  </span>
                </div>
              </div>

              {/* Visual Separator */}
              <div className="w-px h-12 bg-gradient-to-b from-gray-200 to-gray-300 flex-shrink-0"></div>

              {/* 2. Customer Information */}
              <div className="flex items-center space-x-3 space-x-reverse flex-shrink-0">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="min-w-0 max-w-32">
                  <p className="font-bold text-gray-900 text-xs font-cairo mb-1">
                    العميل
                  </p>
                  <span className="text-gray-700 text-sm font-small font-cairo truncate max-w-full">
                    {scannedOrder.receiver?.fullName || 'غير محدد'}
                  </span>
                </div>
              </div>

              {/* Visual Separator */}
              <div className="w-px h-12 bg-gradient-to-b from-gray-200 to-gray-300 flex-shrink-0"></div>

              {/* 3. Product Information */}
              <div className="flex items-start space-x-3 space-x-reverse flex-1 min-w-0">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-sm flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-xs font-cairo mb-1">
                    وصف المنتج
                  </p>
                  <span className="text-gray-700 text-sm font-small font-cairo line-clamp-2 break-words">
                    {scannedOrder.specs?.packageDetails?.description || 'لا يوجد وصف للمنتج'}
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Right - Action Buttons */}
        <div className="flex items-center space-x-2 space-x-reverse flex-shrink-0">
          <button
            onClick={onConfirm}
            className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-cairo transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            aria-label="تأكيد استلام الطلب"
          >
            تأكيد (Enter)
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-cairo transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            aria-label="إلغاء استلام الطلب"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};

// Use React.memo for performance optimization
export default React.memo(ConfirmationPanel);