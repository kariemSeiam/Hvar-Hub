import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { toast } from 'react-hot-toast';
import ServiceActionCard from './ServiceActionCard';
import { PERFORMANCE } from '../../config/environment';

// Loading skeleton component
const ServiceActionCardSkeleton = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 animate-pulse">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center space-x-3 space-x-reverse">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-xl"></div>
                <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                </div>
            </div>
        </div>
        <div className="p-4">
            <div className="space-y-2">
                <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-5/6"></div>
            </div>
        </div>
    </div>
);

const ServiceActionList = ({
    serviceActions = [],
    relatedOrders = {},
    activeStatus = 'all',
    onAction,
    onStatusFilter,
    isLoading = false,
    highlightedActionId = null,
    searchQuery = '',
    className = '',
    emptyStateMessage = 'لا توجد إجراءات خدمة',
    showFilters = true,
    showSearch = true,
    ...props
}) => {
    // Local state
    const [searchTerm, setSearchTerm] = useState(searchQuery);
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('desc');
    const [selectedPriority, setSelectedPriority] = useState('all');
    const [selectedActionType, setSelectedActionType] = useState('all');

    // Update search term when prop changes
    useEffect(() => {
        setSearchTerm(searchQuery);
    }, [searchQuery]);

    // Filter and sort service actions
    const filteredAndSortedActions = useMemo(() => {
        let filtered = [...serviceActions];

        // Status filter
        if (activeStatus !== 'all') {
            filtered = filtered.filter(action => action.status === activeStatus);
        }

        // Search filter
        if (searchTerm.trim()) {
            const query = searchTerm.toLowerCase().trim();
            filtered = filtered.filter(action =>
                action.customer_name?.toLowerCase().includes(query) ||
                action.customer_phone?.includes(query) ||
                action.notes?.toLowerCase().includes(query) ||
                action.id?.toString().includes(query) ||
                action._id?.includes(query) ||
                action.product_name?.toLowerCase().includes(query) ||
                action.part_name?.toLowerCase().includes(query)
            );
        }

        // Priority filter
        if (selectedPriority !== 'all') {
            filtered = filtered.filter(action => action.priority === selectedPriority);
        }

        // Action type filter
        if (selectedActionType !== 'all') {
            filtered = filtered.filter(action => action.action_type === selectedActionType);
        }

        // Sort
        filtered.sort((a, b) => {
            let aVal = a[sortBy];
            let bVal = b[sortBy];

            // Handle date sorting
            if (sortBy === 'created_at' || sortBy === 'updated_at') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }

            // Handle string sorting
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
            }
            if (typeof bVal === 'string') {
                bVal = bVal.toLowerCase();
            }

            if (sortOrder === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });

        return filtered;
    }, [serviceActions, activeStatus, searchTerm, selectedPriority, selectedActionType, sortBy, sortOrder]);

    // Get status counts for display
    const statusCounts = useMemo(() => {
        const counts = {};
        serviceActions.forEach(action => {
            counts[action.status] = (counts[action.status] || 0) + 1;
        });
        return counts;
    }, [serviceActions]);

    // Handle search with debouncing
    const handleSearchChange = useCallback((value) => {
        setSearchTerm(value);
        // Optional: Call parent search handler if provided
        if (onStatusFilter) {
            const debounced = setTimeout(() => {
                // Could trigger parent search here if needed
            }, PERFORMANCE.searchDebounce);
            return () => clearTimeout(debounced);
        }
    }, [onStatusFilter]);

    // Handle action execution
    const handleAction = useCallback(async (actionType, serviceAction, notes, trackingNumber) => {
        try {
            await onAction?.(actionType, serviceAction, notes, trackingNumber);
        } catch (error) {
            console.error('Action failed:', error);
            toast.error('فشل في تنفيذ الإجراء');
        }
    }, [onAction]);

    // Status filter options
    const statusOptions = [
        { value: 'all', label: 'الكل', count: serviceActions.length },
        { value: 'created', label: 'تم الإنشاء', count: statusCounts.created || 0 },
        { value: 'confirmed', label: 'مؤكد', count: statusCounts.confirmed || 0 },
        { value: 'pending_receive', label: 'في انتظار الاستلام', count: statusCounts.pending_receive || 0 },
        { value: 'completed', label: 'مكتمل', count: statusCounts.completed || 0 },
        { value: 'failed', label: 'فاشل', count: statusCounts.failed || 0 },
        { value: 'cancelled', label: 'ملغي', count: statusCounts.cancelled || 0 }
    ];

    // Priority filter options
    const priorityOptions = [
        { value: 'all', label: 'كل الأولويات' },
        { value: 'low', label: 'منخفضة' },
        { value: 'normal', label: 'عادية' },
        { value: 'high', label: 'عالية' },
        { value: 'urgent', label: 'عاجلة' }
    ];

    // Action type filter options
    const actionTypeOptions = [
        { value: 'part_replace', label: 'استبدال قطعة' },
        { value: 'full_replace', label: 'استبدال كامل' },
        { value: 'return_from_customer', label: 'استرجاع من العميل' }
    ];

    return (
        <div className={`space-y-4 ${className}`} {...props}>
            {/* Filters and Search */}
            {showFilters && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Search */}
                        {showSearch && (
                            <div>
                                <label className="block text-sm font-cairo font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    البحث
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => handleSearchChange(e.target.value)}
                                        placeholder="ابحث بالاسم، الهاتف، المعرف..."
                                        className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg font-cairo text-sm text-right bg-white dark:bg-gray-800 dark:text-gray-100 focus:border-brand-blue-500 focus:ring-brand-blue-500 transition-all duration-200"
                                        dir="rtl"
                                    />
                                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Status Filter */}
                        <div>
                            <label className="block text-sm font-cairo font-medium text-gray-700 dark:text-gray-300 mb-2">
                                الحالة
                            </label>
                            <select
                                value={activeStatus}
                                onChange={(e) => onStatusFilter?.(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-cairo text-sm text-right bg-white dark:bg-gray-800 dark:text-gray-100 focus:border-brand-blue-500 focus:ring-brand-blue-500 transition-all duration-200"
                                dir="rtl"
                            >
                                {statusOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label} ({option.count})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Priority Filter */}
                        <div>
                            <label className="block text-sm font-cairo font-medium text-gray-700 dark:text-gray-300 mb-2">
                                الأولوية
                            </label>
                            <select
                                value={selectedPriority}
                                onChange={(e) => setSelectedPriority(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-cairo text-sm text-right bg-white dark:bg-gray-800 dark:text-gray-100 focus:border-brand-blue-500 focus:ring-brand-blue-500 transition-all duration-200"
                                dir="rtl"
                            >
                                {priorityOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Action Type Filter */}
                        <div>
                            <label className="block text-sm font-cairo font-medium text-gray-700 dark:text-gray-300 mb-2">
                                نوع الإجراء
                            </label>
                            <select
                                value={selectedActionType}
                                onChange={(e) => setSelectedActionType(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-cairo text-sm text-right bg-white dark:bg-gray-800 dark:text-gray-100 focus:border-brand-blue-500 focus:ring-brand-blue-500 transition-all duration-200"
                                dir="rtl"
                            >
                                {actionTypeOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Sort Controls */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex items-center space-x-3 space-x-reverse">
                            <span className="text-sm font-cairo font-medium text-gray-700 dark:text-gray-300">
                                ترتيب حسب:
                            </span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded font-cairo text-sm text-right bg-white dark:bg-gray-800 dark:text-gray-100"
                                dir="rtl"
                            >
                                <option value="created_at">تاريخ الإنشاء</option>
                                <option value="updated_at">آخر تحديث</option>
                                <option value="customer_name">اسم العميل</option>
                                <option value="priority">الأولوية</option>
                                <option value="status">الحالة</option>
                            </select>
                            <button
                                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                title={sortOrder === 'asc' ? 'تصاعدي' : 'تنازلي'}
                            >
                                <svg className={`w-4 h-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                </svg>
                            </button>
                        </div>

                        <div className="text-sm font-cairo text-gray-600 dark:text-gray-400">
                            عرض {filteredAndSortedActions.length} من {serviceActions.length}
                        </div>
                    </div>
                </div>
            )}

            {/* Service Actions List */}
            {isLoading ? (
                <div className="space-y-4">
                    {Array.from({ length: 3 }, (_, index) => (
                        <ServiceActionCardSkeleton key={index} />
                    ))}
                </div>
            ) : filteredAndSortedActions.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-cairo font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            {emptyStateMessage}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 font-cairo">
                            {searchTerm || activeStatus !== 'all' || selectedPriority !== 'all' || selectedActionType !== 'all'
                                ? 'لا توجد إجراءات تطابق المرشحات المحددة'
                                : 'لم يتم إنشاء أي إجراءات خدمة بعد'
                            }
                        </p>
                        {(searchTerm || activeStatus !== 'all' || selectedPriority !== 'all' || selectedActionType !== 'all') && (
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setSelectedPriority('all');
                                    setSelectedActionType('all');
                                    onStatusFilter?.('all');
                                }}
                                className="mt-4 px-4 py-2 bg-brand-blue-500 text-white rounded-lg font-cairo text-sm hover:bg-brand-blue-600 transition-colors"
                            >
                                إعادة تعيين المرشحات
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredAndSortedActions.map((serviceAction) => (
                        <Suspense
                            key={serviceAction.id || serviceAction._id}
                            fallback={<ServiceActionCardSkeleton />}
                        >
                            <ServiceActionCard
                                serviceAction={serviceAction}
                                relatedOrder={relatedOrders[serviceAction.related_order_id]}
                                onAction={handleAction}
                                isHighlighted={highlightedActionId === (serviceAction.id || serviceAction._id)}
                                className="transition-all duration-200 hover:scale-[1.01]"
                            />
                        </Suspense>
                    ))}
                </div>
            )}

            {/* Load More / Pagination could go here if needed */}
        </div>
    );
};

export default React.memo(ServiceActionList);
