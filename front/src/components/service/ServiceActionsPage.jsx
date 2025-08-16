import React, { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { useServiceActions } from '../../hooks/useServiceActions';
import ServiceActionForm from './ServiceActionForm';
import ServiceActionList from './ServiceActionList';
import ServiceActionTabNavigation from './ServiceActionTabNavigation';
import ServiceActionFAB from './ServiceActionFAB';
import { Badge } from '../common';
import ThemeToggle from '../common/ThemeToggle';

// Loading components
const LoadingSpinner = () => (
    <div className="flex items-center justify-center py-8">
        <div className="flex items-center space-x-2 space-x-reverse">
            <svg className="w-6 h-6 animate-spin text-brand-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm font-cairo text-gray-600">جارٍ التحميل...</span>
        </div>
    </div>
);

const ServiceActionsPage = () => {
    // Service actions hook
    const {
        serviceActions,
        filteredActions,
        isLoading,
        activeStatus,
        actionInProgress,
        highlightedActionId,
        handleStatusChange,
        handleAction,
        createServiceAction,
        updateServiceAction,
        refresh,
        getStatusCounts,
        getPendingReceiveCount
    } = useServiceActions();

    // Local state
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingAction, setEditingAction] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [relatedOrders, setRelatedOrders] = useState({});
    const [pageStats, setPageStats] = useState({
        totalActions: 0,
        pendingReceive: 0,
        completedToday: 0,
        urgentActions: 0
    });

    // Load related orders when service actions change
    useEffect(() => {
        loadRelatedOrders();
        updatePageStats();
    }, [serviceActions]);

    // Load related orders for display
    const loadRelatedOrders = async () => {
        try {
            const orderIds = [...new Set(serviceActions.map(action => action.related_order_id).filter(Boolean))];
            if (orderIds.length === 0) return;

            // Import orderAPI dynamically
            const { orderAPI } = await import('../../api/orderAPI');
            const orders = {};

            // Batch load orders (simplified - in real implementation, add proper batch endpoint)
            for (const orderId of orderIds) {
                try {
                    const response = await orderAPI.getOrder(orderId);
                    if (response.success) {
                        orders[orderId] = response.data;
                    }
                } catch (error) {
                    console.warn(`Failed to load order ${orderId}:`, error);
                }
            }

            setRelatedOrders(orders);
        } catch (error) {
            console.error('Failed to load related orders:', error);
        }
    };

    // Update page statistics
    const updatePageStats = useCallback(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const stats = {
            totalActions: serviceActions.length,
            pendingReceive: getPendingReceiveCount(),
            completedToday: serviceActions.filter(action =>
                action.status === 'completed' &&
                new Date(action.updated_at) >= today
            ).length,
            failedActions: serviceActions.filter(action => action.status === 'failed').length,
            urgentActions: serviceActions.filter(action => action.priority === 'urgent').length
        };

        setPageStats(stats);
    }, [serviceActions, getPendingReceiveCount]);

    // Handle form submission
    const handleFormSubmit = useCallback(async (formData) => {
        try {
            let result;
            if (editingAction) {
                result = await updateServiceAction(editingAction.id, formData);
            } else {
                result = await createServiceAction(formData);
            }

            if (result.success) {
                setShowCreateForm(false);
                setEditingAction(null);
                toast.success(editingAction ? 'تم تحديث إجراء الخدمة بنجاح' : 'تم إنشاء إجراء الخدمة بنجاح');
            }
        } catch (error) {
            console.error('Form submission failed:', error);
            toast.error('فشل في حفظ إجراء الخدمة');
        }
    }, [editingAction, createServiceAction, updateServiceAction]);

    // Handle action execution with enhanced feedback
    const handleServiceAction = useCallback(async (actionType, serviceAction, notes = '', trackingNumber = '') => {
        try {
            await handleAction(actionType, serviceAction.id || serviceAction._id, notes, trackingNumber);

            // Provide specific success messages
            const successMessages = {
                'confirm': 'تم تأكيد إجراء الخدمة',
                'pending_receive': 'تم نقل الإجراء لانتظار الاستلام',
                'receive': 'تم تأكيد استلام الإجراء',
                'complete': 'تم إكمال إجراء الخدمة',
                'fail': 'تم تسجيل فشل الإجراء',
                'retry': 'تم إعادة تشغيل الإجراء'
            };

            toast.success(successMessages[actionType] || 'تم تنفيذ الإجراء بنجاح');
        } catch (error) {
            console.error('Service action failed:', error);
            toast.error('فشل في تنفيذ الإجراء');
        }
    }, [handleAction]);

    // Memoized status counts
    const statusCounts = useMemo(() => getStatusCounts(), [getStatusCounts]);

    // Handle edit action
    const handleEditAction = useCallback((action) => {
        setEditingAction(action);
        setShowCreateForm(true);
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-4 space-x-reverse">
                            <div className="flex items-center space-x-3 space-x-reverse">
                                <div className="w-10 h-10 bg-gradient-to-br from-brand-blue-500 to-brand-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                                    </svg>
                                </div>
                                <div>
                                    <h1 className="text-xl font-cairo font-bold text-gray-900 dark:text-gray-100">
                                        إدارة إجراءات الخدمة
                                    </h1>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 font-cairo">
                                        نظام إدارة شامل للخدمات المتكاملة
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3 space-x-reverse">
                            {/* Quick Stats */}
                            <div className="hidden md:flex items-center space-x-3 space-x-reverse">
                                <div className="flex items-center space-x-2 space-x-reverse px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                    </svg>
                                    <span className="text-sm font-cairo font-medium text-blue-800 dark:text-blue-200">
                                        الإجمالي: {pageStats.totalActions}
                                    </span>
                                </div>

                                {pageStats.pendingReceive > 0 && (
                                    <div className="flex items-center space-x-2 space-x-reverse px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                        <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="text-sm font-cairo font-medium text-amber-800 dark:text-amber-200">
                                            انتظار استلام: {pageStats.pendingReceive}
                                        </span>
                                    </div>
                                )}

                                {pageStats.urgentActions > 0 && (
                                    <div className="flex items-center space-x-2 space-x-reverse px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                        <span className="text-sm font-cairo font-medium text-red-800 dark:text-red-200">
                                            عاجل: {pageStats.urgentActions}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons - Removed the Create button, kept refresh and theme toggle */}
                            <button
                                onClick={refresh}
                                disabled={isLoading}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
                                title="تحديث"
                            >
                                <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>

                            <ThemeToggle />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Create/Edit Form Modal */}
                {showCreateForm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                            <Suspense fallback={<LoadingSpinner />}>
                                <ServiceActionForm
                                    onSubmit={handleFormSubmit}
                                    initialData={editingAction}
                                    onCancel={() => {
                                        setShowCreateForm(false);
                                        setEditingAction(null);
                                    }}
                                    isSubmitting={actionInProgress}
                                />
                            </Suspense>
                        </div>
                    </div>
                )}

                <div className="space-y-6">
                    {/* Tab Navigation */}
                    <Suspense fallback={<LoadingSpinner />}>
                        <ServiceActionTabNavigation
                            activeTab={activeStatus}
                            onTabChange={handleStatusChange}
                            statusCounts={statusCounts}
                            className="sticky top-20 z-30"
                        />
                    </Suspense>

                    {/* Dashboard Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="mr-4">
                                    <div className="text-sm font-cairo text-gray-500 dark:text-gray-400">إجمالي الإجراءات</div>
                                    <div className="text-2xl font-cairo font-bold text-gray-900 dark:text-gray-100">{pageStats.totalActions}</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="mr-4">
                                    <div className="text-sm font-cairo text-gray-500 dark:text-gray-400">في انتظار الاستلام</div>
                                    <div className="text-2xl font-cairo font-bold text-gray-900 dark:text-gray-100">{pageStats.pendingReceive}</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="mr-4">
                                    <div className="text-sm font-cairo text-gray-500 dark:text-gray-400">مكتمل اليوم</div>
                                    <div className="text-2xl font-cairo font-bold text-gray-900 dark:text-gray-100">{pageStats.completedToday}</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="mr-4">
                                    <div className="text-sm font-cairo text-gray-500 dark:text-gray-400">إجراءات فاشلة</div>
                                    <div className="text-2xl font-cairo font-bold text-gray-900 dark:text-gray-100">{pageStats.failedActions}</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="mr-4">
                                    <div className="text-sm font-cairo text-gray-500 dark:text-gray-400">إجراءات عاجلة</div>
                                    <div className="text-2xl font-cairo font-bold text-gray-900 dark:text-gray-100">{pageStats.urgentActions}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Service Actions List */}
                    <Suspense fallback={<LoadingSpinner />}>
                        <ServiceActionList
                            serviceActions={filteredActions}
                            relatedOrders={relatedOrders}
                            activeStatus={activeStatus}
                            onAction={handleServiceAction}
                            onStatusFilter={handleStatusChange}
                            isLoading={isLoading}
                            highlightedActionId={highlightedActionId}
                            searchQuery={searchQuery}
                            showFilters={true}
                            showSearch={true}
                        />
                    </Suspense>
                </div>
            </div>

            {/* Floating Action Button */}
            <ServiceActionFAB onClick={() => setShowCreateForm(true)} />
        </div>
    );
};

export default React.memo(ServiceActionsPage);
