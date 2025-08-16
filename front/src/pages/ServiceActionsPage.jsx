import React, { useState } from 'react';
import { ServiceActionTabNavigation, ServiceActionList, ServiceActionForm } from '../components/service';
import { ConfirmationModal } from '../components/common';
import { useServiceActions } from '../hooks/useServiceActions';

const ServiceActionsPage = () => {
    // Use the custom hook for service actions management
    const {
        filteredActions,
        isLoading,
        activeStatus,
        actionInProgress,
        highlightedActionId,
        forceUpdate,
        handleStatusChange,
        handleAction,
        createServiceAction,
        updateServiceAction,
        getStatusCounts,
        getPendingReceiveCount
    } = useServiceActions('all');

    // Form state
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingAction, setEditingAction] = useState(null);

    // Confirmation modal state
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);

    // Handle tab change
    const handleTabChange = (tabId) => {
        handleStatusChange(tabId);
    };

    // Handle form submission
    const handleFormSubmit = async (formData) => {
        let result;

        if (editingAction) {
            // Update existing action
            result = await updateServiceAction(editingAction.id, formData);
        } else {
            // Create new action
            result = await createServiceAction(formData);
        }

        if (result.success) {
            // Close form
            setShowCreateForm(false);
            setEditingAction(null);
        }
    };

    // Handle form cancellation
    const handleFormCancel = () => {
        setShowCreateForm(false);
        setEditingAction(null);
    };

    // Handle action confirmation (for destructive actions)
    const handleConfirmAction = (actionType, actionId, actionLabel) => {
        setConfirmAction({ type: actionType, id: actionId, label: actionLabel });
        setShowConfirmModal(true);
    };

    // Execute confirmed action
    const executeConfirmedAction = async () => {
        if (!confirmAction) return;

        await handleAction(confirmAction.type, confirmAction.id);
        setShowConfirmModal(false);
        setConfirmAction(null);
    };

    return (
        <div className="min-h-screen bg-gray-50 py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Page Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 font-cairo">
                                إجراءات الخدمة
                            </h1>
                            <p className="mt-2 text-gray-600 font-cairo">
                                إدارة إجراءات الخدمة والاسترجاعات والاستبدالات
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Pending Receive Integration Button */}
                            {getPendingReceiveCount() > 0 && (
                                <button
                                    onClick={() => handleStatusChange('PENDING_RECEIVE')}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                    {getPendingReceiveCount()} في انتظار التكامل
                                </button>
                            )}

                            {/* Create New Action Button */}
                            <button
                                onClick={() => setShowCreateForm(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                إنشاء إجراء جديد
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Left Sidebar - Tab Navigation */}
                    <div className="lg:col-span-1">
                        <ServiceActionTabNavigation
                            activeTab={activeStatus}
                            onTabChange={handleTabChange}
                            counts={getStatusCounts()}
                        />
                    </div>

                    {/* Right Content Area */}
                    <div className="lg:col-span-3">
                        {/* Service Actions List */}
                        <ServiceActionList
                            serviceActions={filteredActions}
                            isLoading={isLoading}
                            activeStatus={activeStatus}
                            highlightedOrderId={highlightedActionId}
                            actionInProgress={actionInProgress}
                            onAction={handleAction}
                            forceUpdate={forceUpdate}
                        />
                    </div>
                </div>

                {/* Create/Edit Form Modal */}
                {showCreateForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                            <ServiceActionForm
                                onSubmit={handleFormSubmit}
                                onCancel={handleFormCancel}
                                isLoading={false}
                                initialData={editingAction}
                            />
                        </div>
                    </div>
                )}

                {/* Confirmation Modal */}
                <ConfirmationModal
                    isOpen={showConfirmModal}
                    onClose={() => setShowConfirmModal(false)}
                    onConfirm={executeConfirmedAction}
                    title="تأكيد الإجراء"
                    message={confirmAction ? `هل أنت متأكد من ${confirmAction.label}؟` : ''}
                    confirmText="تأكيد"
                    cancelText="إلغاء"
                    variant="danger"
                />
            </div>
        </div>
    );
};

export default ServiceActionsPage;
