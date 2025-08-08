import React from 'react';
import { formatTimeOnly } from '../../utils/dateUtils';

const RecentScans = ({ recentScans = [], className = "" }) => {
  return (
    <div className={`flex-1 p-4 overflow-y-auto scrollbar-hide ${className}`}>
      <h4 className="text-sm font-semibold text-gray-900 mb-3 font-cairo-play">
        آخر المسح ({recentScans.length})
      </h4>
      <div className="space-y-2">
        {recentScans.length > 0 ? (
          recentScans.slice(0, 8).map((scan) => (
            <div 
              key={scan._id} 
              className="flex items-center justify-between bg-gray-50 rounded-lg p-2 hover:bg-gray-100 transition-colors duration-200"
            >
              <div className="flex items-center space-x-2 space-x-reverse flex-1 min-w-0">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-xs font-cairo-play truncate mb-1">
                    {scan.trackingNumber}
                  </p>
                  <p className="text-gray-600 text-xs font-cairo-play truncate">
                    {scan.receiver?.fullName || 'غير محدد'}
                  </p>
                  {scan.specs?.packageDetails?.description && (
                    <p className="text-gray-500 text-xs font-cairo-play truncate max-w-xs">
                      {scan.specs.packageDetails.description}
                    </p>
                  )}
                </div>
              </div>
              <span className="text-xs text-gray-500 font-cairo-play flex-shrink-0 mr-2">
                {scan.scannedAt ? formatTimeOnly(scan.scannedAt) : 'لا يوجد وقت'}
              </span>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm font-cairo-play">لا توجد عمليات مسح حديثة</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Use React.memo for performance optimization
export default React.memo(RecentScans);