import React, { useState, useCallback } from 'react';
import {
    Play,
    CheckCircle,
    XCircle,
    Clock,
    AlertTriangle,
    Package,
    ArrowRight,
    RefreshCw,
    Smartphone,
    Search,
    QrCode
} from 'lucide-react';
import { serviceActionAPI } from '../../api/serviceActionAPI';
import { productAPI } from '../../api/productAPI';
import { orderAPI } from '../../api/orderAPI';
import { debug } from '../../config/environment';

/**
 * Unified Workflow Testing Component
 * Tests the complete service action workflow from creation to maintenance integration
 */
const UnifiedWorkflowTest = ({ className = '' }) => {
    // Test state
    const [testState, setTestState] = useState({
        isRunning: false,
        currentStep: 0,
        results: [],
        testData: null,
        errors: []
    });

    // Test configuration
    const workflowSteps = [
        {
            id: 'search_customer',
            title: 'البحث عن العميل',
            description: 'البحث عن عميل باستخدام رقم الهاتف',
            icon: Search,
            testFunction: 'testCustomerSearch'
        },
        {
            id: 'create_service_action',
            title: 'إنشاء إجراء الخدمة',
            description: 'إنشاء إجراء خدمة جديد مع بيانات العميل والطلب',
            icon: Package,
            testFunction: 'testServiceActionCreation'
        },
        {
            id: 'confirm_action',
            title: 'تأكيد الإجراء',
            description: 'تأكيد إجراء الخدمة وإنشاء رقم تتبع جديد',
            icon: CheckCircle,
            testFunction: 'testActionConfirmation'
        },
        {
            id: 'move_to_pending',
            title: 'نقل للانتظار',
            description: 'نقل إجراء الخدمة إلى حالة انتظار الاستلام',
            icon: Clock,
            testFunction: 'testMoveToPending'
        },
        {
            id: 'scan_integration',
            title: 'مسح التكامل',
            description: 'مسح رقم التتبع الجديد في نظام الصيانة',
            icon: QrCode,
            testFunction: 'testMaintenanceIntegration'
        },
        {
            id: 'complete_maintenance',
            title: 'إكمال الصيانة',
            description: 'إكمال دورة الصيانة وإجراء الخدمة',
            icon: CheckCircle,
            testFunction: 'testMaintenanceCompletion'
        }
    ];

    // Test data for workflow
    const getTestData = useCallback(() => ({
        // Test customer data
        customer: {
            phone: '01123456789',
            name: 'أحمد محمد عبدالله',
            second_phone: '01012345678'
        },
        // Test order data
        order: {
            tracking_number: 'TEST_ORDER_12345',
            type: 'DELIVERY',
            description: 'جهاز لابتوب HP للاستبدال',
            cod_amount: 15000,
            status: 'DELIVERED'
        },
        // Test service action data
        serviceAction: {
            action_type: 'full_replace',
            notes: 'استبدال كامل للجهاز بسبب عطل في المعالج',
            product_id: 1, // Will be selected from real products
            refund_amount: null
        }
    }), []);

    // Start workflow test
    const startWorkflowTest = useCallback(async () => {
        setTestState({
            isRunning: true,
            currentStep: 0,
            results: [],
            testData: getTestData(),
            errors: []
        });

        debug.log('Starting unified workflow test');

        // Execute each step
        for (let i = 0; i < workflowSteps.length; i++) {
            setTestState(prev => ({ ...prev, currentStep: i }));

            const step = workflowSteps[i];
            const stepResult = await executeTestStep(step, i);

            setTestState(prev => ({
                ...prev,
                results: [...prev.results, stepResult]
            }));

            if (!stepResult.success) {
                setTestState(prev => ({
                    ...prev,
                    errors: [...prev.errors, stepResult.error]
                }));
                break;
            }

            // Wait between steps
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        setTestState(prev => ({ ...prev, isRunning: false }));
    }, [getTestData]);

    // Execute individual test step
    const executeTestStep = useCallback(async (step, index) => {
        const startTime = Date.now();

        try {
            let result;

            switch (step.testFunction) {
                case 'testCustomerSearch':
                    result = await testCustomerSearch();
                    break;
                case 'testServiceActionCreation':
                    result = await testServiceActionCreation();
                    break;
                case 'testActionConfirmation':
                    result = await testActionConfirmation();
                    break;
                case 'testMoveToPending':
                    result = await testMoveToPending();
                    break;
                case 'testMaintenanceIntegration':
                    result = await testMaintenanceIntegration();
                    break;
                case 'testMaintenanceCompletion':
                    result = await testMaintenanceCompletion();
                    break;
                default:
                    throw new Error(`Unknown test function: ${step.testFunction}`);
            }

            const duration = Date.now() - startTime;

            return {
                step: step.id,
                title: step.title,
                success: result.success,
                duration,
                data: result.data,
                message: result.message || 'تم بنجاح'
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            debug.error(`Test step ${step.id} failed`, error);

            return {
                step: step.id,
                title: step.title,
                success: false,
                duration,
                error: error.message || 'خطأ غير متوقع',
                message: 'فشل في التنفيذ'
            };
        }
    }, []);

    // Individual test functions
    const testCustomerSearch = useCallback(async () => {
        const testData = testState.testData;

        const result = await serviceActionAPI.searchCustomers('phone', testData.customer.phone, {
            page: 1,
            limit: 10
        });

        if (result.success && result.data.customers && result.data.customers.length > 0) {
            // Store found customer for next steps
            setTestState(prev => ({
                ...prev,
                testData: {
                    ...prev.testData,
                    foundCustomer: result.data.customers[0]
                }
            }));

            return {
                success: true,
                data: result.data.customers[0],
                message: `تم العثور على ${result.data.customers.length} عميل`
            };
        } else {
            // Customer not found, create mock customer data
            const mockCustomer = {
                customer: testData.customer,
                orders: [testData.order]
            };

            setTestState(prev => ({
                ...prev,
                testData: {
                    ...prev.testData,
                    foundCustomer: mockCustomer
                }
            }));

            return {
                success: true,
                data: mockCustomer,
                message: 'تم إنشاء بيانات عميل تجريبية'
            };
        }
    }, [testState.testData]);

    const testServiceActionCreation = useCallback(async () => {
        const testData = testState.testData;
        const customer = testData.foundCustomer;
        const order = customer.orders[0];

        // Get available products
        const productsResult = await productAPI.listProducts({ page: 1, limit: 10 });
        const product = productsResult.success && productsResult.data.products?.length > 0
            ? productsResult.data.products[0]
            : null;

        const serviceActionData = {
            action_type: testData.serviceAction.action_type,
            customer: {
                phone: customer.customer.primary_phone || customer.customer.phone,
                full_name: customer.customer.full_name || customer.customer.name,
                first_name: customer.customer.first_name || customer.customer.name?.split(' ')[0],
                last_name: customer.customer.last_name || customer.customer.name?.split(' ').slice(1).join(' '),
                second_phone: customer.customer.second_phone,
                id: customer.customer.id
            },
            original_tracking: order.tracking_number,
            product_id: product?.id || null,
            part_id: null,
            refund_amount: testData.serviceAction.refund_amount,
            notes: testData.serviceAction.notes,
            action_data: {
                order_type: order.type,
                order_description: order.description,
                cod_amount: order.cod_amount
            }
        };

        const result = await serviceActionAPI.createServiceAction(serviceActionData);

        if (result.success) {
            setTestState(prev => ({
                ...prev,
                testData: {
                    ...prev.testData,
                    createdServiceAction: result.data
                }
            }));
        }

        return result;
    }, [testState.testData]);

    const testActionConfirmation = useCallback(async () => {
        const serviceAction = testState.testData.createdServiceAction;

        if (!serviceAction) {
            throw new Error('لا يوجد إجراء خدمة للتأكيد');
        }

        const newTrackingNumber = `SA_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const result = await serviceActionAPI.confirmServiceAction(
            serviceAction.id,
            newTrackingNumber,
            'تم تأكيد إجراء الخدمة وإنشاء رقم تتبع جديد'
        );

        if (result.success) {
            setTestState(prev => ({
                ...prev,
                testData: {
                    ...prev.testData,
                    newTrackingNumber,
                    confirmedServiceAction: result.data
                }
            }));
        }

        return result;
    }, [testState.testData]);

    const testMoveToPending = useCallback(async () => {
        const serviceAction = testState.testData.confirmedServiceAction || testState.testData.createdServiceAction;

        if (!serviceAction) {
            throw new Error('لا يوجد إجراء خدمة للنقل');
        }

        const result = await serviceActionAPI.moveToPendingReceive(
            serviceAction.id,
            'تم نقل إجراء الخدمة إلى حالة انتظار الاستلام'
        );

        if (result.success) {
            setTestState(prev => ({
                ...prev,
                testData: {
                    ...prev.testData,
                    pendingServiceAction: result.data
                }
            }));
        }

        return result;
    }, [testState.testData]);

    const testMaintenanceIntegration = useCallback(async () => {
        const newTrackingNumber = testState.testData.newTrackingNumber;

        if (!newTrackingNumber) {
            throw new Error('لا يوجد رقم تتبع جديد للمسح');
        }

        // Simulate scanning the new tracking number in the maintenance hub
        const result = await orderAPI.scanOrder(newTrackingNumber);

        if (result.success) {
            setTestState(prev => ({
                ...prev,
                testData: {
                    ...prev.testData,
                    maintenanceOrder: result.data.order,
                    isIntegrated: true
                }
            }));

            return {
                success: true,
                data: result.data.order,
                message: 'تم دمج إجراء الخدمة بنجاح مع نظام الصيانة'
            };
        }

        return result;
    }, [testState.testData]);

    const testMaintenanceCompletion = useCallback(async () => {
        const serviceAction = testState.testData.pendingServiceAction;
        const maintenanceOrder = testState.testData.maintenanceOrder;

        if (!serviceAction || !maintenanceOrder) {
            throw new Error('البيانات المطلوبة للإكمال غير متوفرة');
        }

        // Complete the service action
        const result = await serviceActionAPI.completeServiceAction(
            serviceAction.id,
            'تم إكمال إجراء الخدمة بنجاح'
        );

        if (result.success) {
            setTestState(prev => ({
                ...prev,
                testData: {
                    ...prev.testData,
                    completedServiceAction: result.data
                }
            }));

            return {
                success: true,
                data: result.data,
                message: 'تم إكمال سير العمل الموحد بنجاح'
            };
        }

        return result;
    }, [testState.testData]);

    // Reset test
    const resetTest = useCallback(() => {
        setTestState({
            isRunning: false,
            currentStep: 0,
            results: [],
            testData: null,
            errors: []
        });
    }, []);

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="text-right">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        اختبار سير العمل الموحد
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        اختبار شامل لدورة إجراءات الخدمة من الإنشاء حتى الإكمال
                    </p>
                </div>

                <div className="flex items-center space-x-3 space-x-reverse">
                    <button
                        onClick={resetTest}
                        disabled={testState.isRunning}
                        className="arabic-button-secondary"
                    >
                        <RefreshCw className="w-4 h-4 ml-2" />
                        إعادة تعيين
                    </button>

                    <button
                        onClick={startWorkflowTest}
                        disabled={testState.isRunning}
                        className="arabic-button"
                    >
                        {testState.isRunning ? (
                            <>
                                <Clock className="w-4 h-4 ml-2 animate-spin" />
                                جاري التشغيل...
                            </>
                        ) : (
                            <>
                                <Play className="w-4 h-4 ml-2" />
                                بدء الاختبار
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Test Progress */}
            <div className="arabic-card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-right">
                    مراحل الاختبار
                </h3>

                <div className="space-y-4">
                    {workflowSteps.map((step, index) => {
                        const isActive = testState.currentStep === index && testState.isRunning;
                        const isCompleted = index < testState.results.length;
                        const result = testState.results[index];
                        const IconComponent = step.icon;

                        return (
                            <div
                                key={step.id}
                                className={`
                  flex items-center p-4 rounded-lg border transition-all
                  ${isActive ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20' : ''}
                  ${isCompleted && result?.success ? 'border-green-300 bg-green-50 dark:bg-green-900/20' : ''}
                  ${isCompleted && !result?.success ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : ''}
                  ${!isActive && !isCompleted ? 'border-gray-200 dark:border-gray-700' : ''}
                `}
                            >
                                <div className="flex items-center space-x-4 space-x-reverse flex-1">
                                    <div className={`
                    flex items-center justify-center w-10 h-10 rounded-full
                    ${isActive ? 'bg-blue-500 text-white' : ''}
                    ${isCompleted && result?.success ? 'bg-green-500 text-white' : ''}
                    ${isCompleted && !result?.success ? 'bg-red-500 text-white' : ''}
                    ${!isActive && !isCompleted ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400' : ''}
                  `}>
                                        {isActive ? (
                                            <Clock className="w-5 h-5 animate-spin" />
                                        ) : isCompleted ? (
                                            result?.success ? (
                                                <CheckCircle className="w-5 h-5" />
                                            ) : (
                                                <XCircle className="w-5 h-5" />
                                            )
                                        ) : (
                                            <IconComponent className="w-5 h-5" />
                                        )}
                                    </div>

                                    <div className="text-right flex-1">
                                        <h4 className="font-medium text-gray-900 dark:text-white">
                                            {step.title}
                                        </h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {step.description}
                                        </p>
                                        {result && (
                                            <p className={`text-sm mt-1 ${result.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                                }`}>
                                                {result.message} ({result.duration}ms)
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {index < workflowSteps.length - 1 && (
                                    <ArrowRight className="w-5 h-5 text-gray-400 ml-4" />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Test Results */}
            {testState.results.length > 0 && (
                <TestResults
                    results={testState.results}
                    errors={testState.errors}
                    testData={testState.testData}
                />
            )}
        </div>
    );
};

// Test Results Component
const TestResults = ({ results, errors, testData }) => {
    const successCount = results.filter(r => r.success).length;
    const totalTime = results.reduce((sum, r) => sum + r.duration, 0);

    return (
        <div className="arabic-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-right">
                نتائج الاختبار
            </h3>

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {successCount}/{results.length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        نجح
                    </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {totalTime}ms
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        إجمالي الوقت
                    </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {errors.length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        أخطاء
                    </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
                    <div className={`text-2xl font-bold ${successCount === results.length ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {successCount === results.length ? '✓' : '✗'}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        الحالة
                    </div>
                </div>
            </div>

            {/* Test Data Summary */}
            {testData && (
                <div className="mb-6">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3 text-right">
                        بيانات الاختبار
                    </h4>
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="font-medium">هاتف العميل:</span> {testData.customer.phone}
                            </div>
                            <div>
                                <span className="font-medium">رقم التتبع الأصلي:</span> {testData.order.tracking_number}
                            </div>
                            {testData.newTrackingNumber && (
                                <div>
                                    <span className="font-medium">رقم التتبع الجديد:</span> {testData.newTrackingNumber}
                                </div>
                            )}
                            {testData.createdServiceAction && (
                                <div>
                                    <span className="font-medium">رقم إجراء الخدمة:</span> {testData.createdServiceAction.id}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Errors */}
            {errors.length > 0 && (
                <div className="mb-6">
                    <h4 className="font-medium text-red-600 dark:text-red-400 mb-3 text-right">
                        الأخطاء
                    </h4>
                    <div className="space-y-2">
                        {errors.map((error, index) => (
                            <div key={index} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
                                <div className="flex items-center space-x-2 space-x-reverse">
                                    <AlertTriangle className="w-4 h-4 text-red-500" />
                                    <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Success Message */}
            {successCount === results.length && results.length > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-4">
                    <div className="flex items-center space-x-2 space-x-reverse">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-green-700 dark:text-green-300 font-medium">
                            🎉 تم إكمال اختبار سير العمل الموحد بنجاح! جميع المراحل نفذت بدون أخطاء.
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UnifiedWorkflowTest;
