import React, { useState, useEffect, useMemo } from 'react';
import { Badge } from '../common';
import { serviceActionAPI } from '../../api/serviceActionAPI';
import { formatGregorianDate, formatTimeOnly } from '../../utils/dateUtils';

const PendingServiceActionsSection = ({
    className = '',
    onServiceActionClick = null,
    maxDisplay = 5
}) => {
    const [pendingActions, setPendingActions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Load pending service actions
    useEffect(() => {
        loadPendingActions();
    }, []);

    const loadPendingActions = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await serviceActionAPI.listPendingServiceActions(maxDisplay * 2); // Load more to allow for filtering
            if (response.success) {
                setPendingActions(response.data || []);
            } else {
                setError(response.message || 'فشل في تحميل إجراءات الخدمة');
            }
        } catch (error) {
            console.error('Failed to load pending service actions:', error);
            setError('خطأ في الاتصال بالخادم');
        } finally {
            setIsLoading(false);
        }
    };

    // Memoize filtered and limited actions
    const displayActions = useMemo(() => {
        return pendingActions
            .filter(action => action.status === 'pending_receive' || action.status === 'PENDING_RECEIVE')
            .slice(0, maxDisplay);
    }, [pendingActions, maxDisplay]);

    // Get action type label and color
    const getActionTypeConfig = (actionType) => {
        const configs = {
            'part_replace': { label: 'استبدال قطعة', color: 'maintenance', bg: 'bg-orange-50 border-orange-200' },
            'full_replace': { label: 'استبدال كامل', color: 'warning', bg: 'bg-yellow-50 border-yellow-200' },
            'return_from_customer': { label: 'استرجاع من العميل', color: 'info', bg: 'bg-cyan-50 border-cyan-200' }
        };
        return configs[actionType] || configs['part_replace'];
    };

    // Handle service action click
    const handleActionClick = (action) => {
        if (onServiceActionClick) {
            onServiceActionClick(action);
        }
    };

    if (isLoading) {
        return (
            <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
                <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600"></div>
                        <span className="text-sm text-gray-600 font-cairo">جاري تحميل إجراءات الخدمة...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
                <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-2 text-red-600">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-cairo">{error}</span>
                    </div>
                </div>
            </div>
        );
    }

    if (displayActions.length === 0) {
        return (
            <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
                <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-700 font-cairo">
                            إجراءات الخدمة في انتظار الاستلام
                        </h3>
                        <Badge variant="success" size="sm">0</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 font-cairo">
                        لا توجد إجراءات خدمة في انتظار الاستلام حالياً
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                        <h3 className="text-sm font-semibold text-gray-700 font-cairo">
                            إجراءات الخدمة في انتظار الاستلام
                        </h3>
                    </div>
                    <Badge variant="warning" size="sm">{displayActions.length}</Badge>
                </div>
                <p className="text-xs text-gray-600 mt-1 font-cairo">
                    جاهزة للتكامل مع دورة الصيانة
                </p>
            </div>

            {/* Actions List */}
            <div className="divide-y divide-gray-100">
                {displayActions.map((action) => {
                    const typeConfig = getActionTypeConfig(action.service_action_type);

                    return (
                        <div
                            key={action.id}
                            className={`
                px-4 py-3 hover:bg-gray-50 transition-colors duration-150 cursor-pointer
                ${typeConfig.bg} border-r-4 border-${typeConfig.color}-400
              `}
                            onClick={() => handleActionClick(action)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleActionClick(action);
                                }
                            }}
                            tabIndex={0}
                            role="button"
                            aria-label={`إجراء خدمة ${action.customer_name} - ${typeConfig.label}`}
                        >
                            {/* Customer Info */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                                            <span className="text-xs font-medium text-gray-600">
                                                {action.customer_name?.charAt(0) || '?'}
                                            </span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate font-cairo">
                                                {action.customer_name || 'غير محدد'}
                                            </p>
                                            <p className="text-xs text-gray-500 font-cairo">
                                                {action.customer_phone || 'لا يوجد رقم هاتف'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Type Badge */}
                                <Badge variant={typeConfig.color} size="sm">
                                    {typeConfig.label}
                                </Badge>
                            </div>

                            {/* Tracking & Product Info */}
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="text-gray-500">التتبع:</span>
                                    <code className="bg-gray-100 px-2 py-1 rounded font-mono text-xs">
                                        {action.original_tracking_number}
                                    </code>
                                    {action.new_tracking_number && (
                                        <>
                                            <span className="text-gray-500">جديد:</span>
                                            <code className="bg-blue-100 px-2 py-1 rounded font-mono text-xs text-blue-700">
                                                {action.new_tracking_number}
                                            </code>
                                        </>
                                    )}
                                </div>

                                {/* Product & Part Info */}
                                {(action.product_name || action.part_name) && (
                                    <div className="flex items-center gap-2 text-xs">
                                        {action.product_name && (
                                            <span className="text-gray-600">
                                                المنتج: <span className="font-medium">{action.product_name}</span>
                                            </span>
                                        )}
                                        {action.part_name && (
                                            <span className="text-gray-600">
                                                القطعة: <span className="font-medium">{action.part_name}</span>
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Return Reason (if applicable) */}
                                {action.return_reason && (
                                    <div className="text-xs text-gray-600">
                                        <span className="text-gray-500">السبب:</span> {action.return_reason}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                    </svg>
                                    <span>تم الإنشاء: {formatGregorianDate(action.created_at)}</span>
                                </div>

                                <div className="flex items-center gap-1 text-xs text-amber-600">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <span>جاهز للاستلام</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer with action */}
            {displayActions.length > 0 && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 font-cairo">
                            {displayActions.length} إجراء جاهز للتكامل
                        </span>
                        <button
                            onClick={() => window.location.href = '/services'}
                            className="text-xs text-amber-600 hover:text-amber-700 font-medium transition-colors font-cairo"
                            aria-label="عرض جميع إجراءات الخدمة"
                        >
                            عرض الكل →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(PendingServiceActionsSection);
