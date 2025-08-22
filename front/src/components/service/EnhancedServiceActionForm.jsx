import React, { useState, useCallback, useEffect } from 'react';
import {
    Save,
    Package,
    Wrench,
    RefreshCw,
    ArrowLeft,
    AlertCircle,
    CheckCircle,
    Loader2,
    User,
    Phone,
    MessageSquare
} from 'lucide-react';
import { serviceActionAPI } from '../../api/serviceActionAPI';
import { productAPI } from '../../api/productAPI';
import CustomerSearchForm from './CustomerSearchForm';
import { debug } from '../../config/environment';

/**
 * Enhanced Service Action Form with Complete Workflow
 * Handles the entire service action creation process from customer search to confirmation
 */
const EnhancedServiceActionForm = ({
    onSubmit,
    onCancel,
    initialData = null,
    disabled = false,
    className = ''
}) => {
    // Form steps
    const [currentStep, setCurrentStep] = useState('customer'); // customer, action, review, confirmation

    // Customer and order data
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [selectedOrder, setSelectedOrder] = useState(null);

    // Service action data
    const [actionType, setActionType] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedPart, setSelectedPart] = useState(null);
    const [refundAmount, setRefundAmount] = useState('');
    const [notes, setNotes] = useState('');

    // Product and parts data
    const [products, setProducts] = useState([]);
    const [parts, setParts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [loadingParts, setLoadingParts] = useState(false);

    // Form state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [submitError, setSubmitError] = useState('');

    // Action type options
    const actionTypes = [
        {
            value: 'part_replace',
            label: 'استبدال قطعة',
            description: 'استبدال قطعة معينة في المنتج',
            icon: Wrench,
            requiresProduct: true,
            requiresPart: true,
            requiresRefund: false
        },
        {
            value: 'full_replace',
            label: 'استبدال كامل',
            description: 'استبدال المنتج بالكامل',
            icon: RefreshCw,
            requiresProduct: true,
            requiresPart: false,
            requiresRefund: false
        },
        {
            value: 'return_from_customer',
            label: 'استرجاع من العميل',
            description: 'استرجاع المنتج من العميل مع رد مبلغ',
            icon: ArrowLeft,
            requiresProduct: false,
            requiresPart: false,
            requiresRefund: true
        }
    ];

    // Initialize form data if editing
    useEffect(() => {
        if (initialData) {
            setActionType(initialData.action_type || '');
            setNotes(initialData.notes || '');
            setRefundAmount(initialData.refund_amount?.toString() || '');
            // Set customer and order data if available
            if (initialData.customer_data) {
                setSelectedCustomer(initialData.customer_data);
            }
            if (initialData.order_data) {
                setSelectedOrder(initialData.order_data);
            }
        }
    }, [initialData]);

    // Load products when action type is selected
    useEffect(() => {
        const selectedActionType = actionTypes.find(type => type.value === actionType);
        if (selectedActionType?.requiresProduct) {
            loadProducts();
        }
    }, [actionType]);

    // Load parts when product is selected
    useEffect(() => {
        if (selectedProduct && actionType === 'part_replace') {
            loadParts(selectedProduct.id);
        }
    }, [selectedProduct, actionType]);

    // Load products
    const loadProducts = useCallback(async () => {
        setLoadingProducts(true);
        try {
            const result = await productAPI.listProducts({ page: 1, limit: 100 });
            if (result.success && result.data.products) {
                setProducts(result.data.products);
                debug.log('Products loaded', { count: result.data.products.length });
            }
        } catch (error) {
            debug.error('Failed to load products', error);
        } finally {
            setLoadingProducts(false);
        }
    }, []);

    // Load parts for selected product
    const loadParts = useCallback(async (productId) => {
        setLoadingParts(true);
        try {
            const result = await productAPI.listParts({ product_id: productId, page: 1, limit: 100 });
            if (result.success && result.data.parts) {
                setParts(result.data.parts);
                debug.log('Parts loaded', { productId, count: result.data.parts.length });
            }
        } catch (error) {
            debug.error('Failed to load parts', error);
        } finally {
            setLoadingParts(false);
        }
    }, []);

    // Handle customer selection
    const handleCustomerSelect = useCallback((customer) => {
        setSelectedCustomer(customer);
        setSelectedOrder(null); // Reset order selection
        debug.log('Customer selected in form', { customerPhone: customer.customer.primary_phone });
    }, []);

    // Handle order selection
    const handleOrderSelect = useCallback((order, customer) => {
        setSelectedOrder(order);
        setSelectedCustomer(customer);
        setCurrentStep('action');
        debug.log('Order selected, moving to action step', { trackingNumber: order.tracking_number });
    }, []);

    // Validate current step
    const validateStep = useCallback((step) => {
        const newErrors = {};

        switch (step) {
            case 'customer':
                if (!selectedCustomer) newErrors.customer = 'يجب اختيار عميل';
                if (!selectedOrder) newErrors.order = 'يجب اختيار طلب';
                break;

            case 'action':
                if (!actionType) newErrors.actionType = 'يجب اختيار نوع الإجراء';

                const selectedActionType = actionTypes.find(type => type.value === actionType);
                if (selectedActionType) {
                    if (selectedActionType.requiresProduct && !selectedProduct) {
                        newErrors.product = 'يجب اختيار منتج';
                    }
                    if (selectedActionType.requiresPart && !selectedPart) {
                        newErrors.part = 'يجب اختيار قطعة';
                    }
                    if (selectedActionType.requiresRefund && (!refundAmount || parseFloat(refundAmount) <= 0)) {
                        newErrors.refundAmount = 'يجب إدخال مبلغ الاسترداد';
                    }
                }
                break;

            case 'review':
                // All validations from previous steps
                const customerErrors = validateStep('customer');
                const actionErrors = validateStep('action');
                Object.assign(newErrors, customerErrors, actionErrors);
                break;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [selectedCustomer, selectedOrder, actionType, selectedProduct, selectedPart, refundAmount, actionTypes]);

    // Handle step navigation
    const handleNext = useCallback(() => {
        if (validateStep(currentStep)) {
            const steps = ['customer', 'action', 'review', 'confirmation'];
            const currentIndex = steps.indexOf(currentStep);
            if (currentIndex < steps.length - 1) {
                setCurrentStep(steps[currentIndex + 1]);
            }
        }
    }, [currentStep, validateStep]);

    const handlePrevious = useCallback(() => {
        const steps = ['customer', 'action', 'review', 'confirmation'];
        const currentIndex = steps.indexOf(currentStep);
        if (currentIndex > 0) {
            setCurrentStep(steps[currentIndex - 1]);
        }
    }, [currentStep]);

    // Handle form submission
    const handleSubmit = useCallback(async () => {
        if (!validateStep('review')) {
            return;
        }

        setIsSubmitting(true);
        setSubmitError('');

        try {
            // Prepare service action data
            const serviceActionData = {
                action_type: actionType,
                customer: {
                    phone: selectedCustomer.customer.primary_phone,
                    full_name: selectedCustomer.customer.full_name,
                    first_name: selectedCustomer.customer.first_name,
                    last_name: selectedCustomer.customer.last_name,
                    second_phone: selectedCustomer.customer.second_phone,
                    id: selectedCustomer.customer.id
                },
                original_tracking: selectedOrder.tracking_number,
                product_id: selectedProduct?.id || null,
                part_id: selectedPart?.id || null,
                refund_amount: refundAmount ? parseFloat(refundAmount) : null,
                notes: notes.trim() || '',
                action_data: {
                    order_type: selectedOrder.type,
                    order_description: selectedOrder.description,
                    cod_amount: selectedOrder.cod_amount
                }
            };

            debug.log('Submitting service action', serviceActionData);

            const result = await serviceActionAPI.createServiceAction(serviceActionData);

            if (result.success) {
                setCurrentStep('confirmation');
                onSubmit?.(result.data);
                debug.log('Service action created successfully', { actionId: result.data.id });
            } else {
                setSubmitError(result.message || 'فشل في إنشاء إجراء الخدمة');
            }
        } catch (error) {
            debug.error('Service action submission error', error);
            setSubmitError('خطأ في إرسال البيانات - يرجى المحاولة مرة أخرى');
        } finally {
            setIsSubmitting(false);
        }
    }, [validateStep, actionType, selectedCustomer, selectedOrder, selectedProduct, selectedPart, refundAmount, notes, onSubmit]);

    // Get current action type details
    const currentActionType = actionTypes.find(type => type.value === actionType);

    return (
        <div className={`max-w-4xl mx-auto ${className}`}>
            {/* Step Indicator */}
            <div className="mb-8">
                <StepIndicator
                    currentStep={currentStep}
                    steps={[
                        { id: 'customer', label: 'اختيار العميل' },
                        { id: 'action', label: 'تفاصيل الإجراء' },
                        { id: 'review', label: 'مراجعة' },
                        { id: 'confirmation', label: 'تأكيد' }
                    ]}
                />
            </div>

            {/* Step Content */}
            <div className="space-y-6">
                {currentStep === 'customer' && (
                    <CustomerStep
                        onCustomerSelect={handleCustomerSelect}
                        onOrderSelect={handleOrderSelect}
                        selectedCustomer={selectedCustomer}
                        selectedOrder={selectedOrder}
                        errors={errors}
                        disabled={disabled}
                    />
                )}

                {currentStep === 'action' && (
                    <ActionStep
                        actionType={actionType}
                        setActionType={setActionType}
                        actionTypes={actionTypes}
                        selectedProduct={selectedProduct}
                        setSelectedProduct={setSelectedProduct}
                        selectedPart={selectedPart}
                        setSelectedPart={setSelectedPart}
                        refundAmount={refundAmount}
                        setRefundAmount={setRefundAmount}
                        notes={notes}
                        setNotes={setNotes}
                        products={products}
                        parts={parts}
                        loadingProducts={loadingProducts}
                        loadingParts={loadingParts}
                        errors={errors}
                        disabled={disabled}
                    />
                )}

                {currentStep === 'review' && (
                    <ReviewStep
                        selectedCustomer={selectedCustomer}
                        selectedOrder={selectedOrder}
                        actionType={actionType}
                        currentActionType={currentActionType}
                        selectedProduct={selectedProduct}
                        selectedPart={selectedPart}
                        refundAmount={refundAmount}
                        notes={notes}
                        errors={errors}
                    />
                )}

                {currentStep === 'confirmation' && (
                    <ConfirmationStep
                        onCancel={onCancel}
                    />
                )}
            </div>

            {/* Navigation Buttons */}
            {currentStep !== 'confirmation' && (
                <div className="mt-8 flex items-center justify-between">
                    <div>
                        {currentStep !== 'customer' && (
                            <button
                                type="button"
                                onClick={handlePrevious}
                                disabled={disabled}
                                className="arabic-button-secondary"
                            >
                                <div className="flex items-center space-x-2 space-x-reverse">
                                    <span>السابق</span>
                                    <ArrowLeft className="w-4 h-4" />
                                </div>
                            </button>
                        )}
                    </div>

                    <div className="flex items-center space-x-3 space-x-reverse">
                        {submitError && (
                            <div className="text-red-600 dark:text-red-400 text-sm">
                                {submitError}
                            </div>
                        )}

                        {currentStep === 'review' ? (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={disabled || isSubmitting}
                                className="arabic-button"
                            >
                                {isSubmitting ? (
                                    <div className="flex items-center space-x-2 space-x-reverse">
                                        <span>جاري الإنشاء...</span>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    </div>
                                ) : (
                                    <div className="flex items-center space-x-2 space-x-reverse">
                                        <span>إنشاء إجراء الخدمة</span>
                                        <Save className="w-4 h-4" />
                                    </div>
                                )}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleNext}
                                disabled={disabled}
                                className="arabic-button"
                            >
                                التالي
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// Step Components
const StepIndicator = ({ currentStep, steps }) => {
    const currentIndex = steps.findIndex(step => step.id === currentStep);

    return (
        <div className="flex items-center justify-center space-x-4 space-x-reverse">
            {steps.map((step, index) => (
                <React.Fragment key={step.id}>
                    <div className={`
            flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
            ${index <= currentIndex
                            ? 'bg-brand-blue-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        }
          `}>
                        {index + 1}
                    </div>
                    <span className={`
            text-sm font-medium
            ${index <= currentIndex
                            ? 'text-brand-blue-500'
                            : 'text-gray-500 dark:text-gray-400'
                        }
          `}>
                        {step.label}
                    </span>
                    {index < steps.length - 1 && (
                        <div className={`
              w-8 h-0.5
              ${index < currentIndex
                                ? 'bg-brand-blue-500'
                                : 'bg-gray-200 dark:bg-gray-700'
                            }
            `} />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};

const CustomerStep = ({
    onCustomerSelect,
    onOrderSelect,
    selectedCustomer,
    selectedOrder,
    errors,
    disabled
}) => (
    <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-right">
            البحث عن العميل واختيار الطلب
        </h2>

        <CustomerSearchForm
            onCustomerSelect={onCustomerSelect}
            onOrderSelect={onOrderSelect}
            disabled={disabled}
        />

        {errors.customer && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center space-x-2 space-x-reverse text-red-700 dark:text-red-300">
                    <span className="text-sm">{errors.customer}</span>
                    <AlertCircle className="w-4 h-4" />
                </div>
            </div>
        )}

        {errors.order && (
            <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center space-x-2 space-x-reverse text-red-700 dark:text-red-300">
                    <span className="text-sm">{errors.order}</span>
                    <AlertCircle className="w-4 h-4" />
                </div>
            </div>
        )}
    </div>
);

const ActionStep = ({
    actionType,
    setActionType,
    actionTypes,
    selectedProduct,
    setSelectedProduct,
    selectedPart,
    setSelectedPart,
    refundAmount,
    setRefundAmount,
    notes,
    setNotes,
    products,
    parts,
    loadingProducts,
    loadingParts,
    errors,
    disabled
}) => {
    const currentActionType = actionTypes.find(type => type.value === actionType);

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white text-right">
                تفاصيل إجراء الخدمة
            </h2>

            {/* Action Type Selection */}
            <div className="arabic-card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-right">
                    نوع الإجراء
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {actionTypes.map((type) => {
                        const IconComponent = type.icon;
                        return (
                            <button
                                key={type.value}
                                type="button"
                                onClick={() => setActionType(type.value)}
                                disabled={disabled}
                                className={`
                  p-4 text-right border rounded-lg transition-all
                  ${actionType === type.value
                                        ? 'border-brand-blue-500 bg-brand-blue-50 dark:bg-brand-blue-900/20'
                                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                                    }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                            >
                                <div className="flex items-start space-x-3 space-x-reverse">
                                    <IconComponent className={`
                    w-6 h-6 mt-1
                    ${actionType === type.value ? 'text-brand-blue-500' : 'text-gray-400'}
                  `} />
                                    <div>
                                        <h4 className="font-medium text-gray-900 dark:text-white">
                                            {type.label}
                                        </h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                            {type.description}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
                {errors.actionType && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="flex items-center space-x-2 space-x-reverse text-red-700 dark:text-red-300">
                            <span className="text-sm">{errors.actionType}</span>
                            <AlertCircle className="w-4 h-4" />
                        </div>
                    </div>
                )}
            </div>

            {/* Product Selection */}
            {currentActionType?.requiresProduct && (
                <div className="arabic-card p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-right">
                        اختيار المنتج
                    </h3>
                    {loadingProducts ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-brand-blue-500" />
                            <span className="mr-2 text-gray-600 dark:text-gray-400">جاري تحميل المنتجات...</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {products.map((product) => (
                                <button
                                    key={product.id}
                                    type="button"
                                    onClick={() => setSelectedProduct(product)}
                                    disabled={disabled}
                                    className={`
                    p-3 text-right border rounded-lg transition-all
                    ${selectedProduct?.id === product.id
                                            ? 'border-brand-blue-500 bg-brand-blue-50 dark:bg-brand-blue-900/20'
                                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                                        }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                                >
                                    <div className="flex items-center space-x-3 space-x-reverse">
                                        <Package className={`
                      w-5 h-5
                      ${selectedProduct?.id === product.id ? 'text-brand-blue-500' : 'text-gray-400'}
                    `} />
                                        <div>
                                            <h4 className="font-medium text-gray-900 dark:text-white">
                                                {product.name_ar}
                                            </h4>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                SKU: {product.sku}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                    {errors.product && (
                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <div className="flex items-center space-x-2 space-x-reverse text-red-700 dark:text-red-300">
                                <span className="text-sm">{errors.product}</span>
                                <AlertCircle className="w-4 h-4" />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Part Selection */}
            {currentActionType?.requiresPart && selectedProduct && (
                <div className="arabic-card p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-right">
                        اختيار القطعة
                    </h3>
                    {loadingParts ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-brand-blue-500" />
                            <span className="mr-2 text-gray-600 dark:text-gray-400">جاري تحميل القطع...</span>
                        </div>
                    ) : parts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {parts.map((part) => (
                                <button
                                    key={part.id}
                                    type="button"
                                    onClick={() => setSelectedPart(part)}
                                    disabled={disabled}
                                    className={`
                    p-3 text-right border rounded-lg transition-all
                    ${selectedPart?.id === part.id
                                            ? 'border-brand-blue-500 bg-brand-blue-50 dark:bg-brand-blue-900/20'
                                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                                        }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                                >
                                    <div className="flex items-center space-x-3 space-x-reverse">
                                        <Wrench className={`
                      w-5 h-5
                      ${selectedPart?.id === part.id ? 'text-brand-blue-500' : 'text-gray-400'}
                    `} />
                                        <div>
                                            <h4 className="font-medium text-gray-900 dark:text-white">
                                                {part.part_name}
                                            </h4>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                SKU: {part.part_sku}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            لا توجد قطع متاحة لهذا المنتج
                        </div>
                    )}
                    {errors.part && (
                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <div className="flex items-center space-x-2 space-x-reverse text-red-700 dark:text-red-300">
                                <span className="text-sm">{errors.part}</span>
                                <AlertCircle className="w-4 h-4" />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Refund Amount */}
            {currentActionType?.requiresRefund && (
                <div className="arabic-card p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-right">
                        مبلغ الاسترداد
                    </h3>
                    <div className="max-w-md">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                            المبلغ (جنيه مصري)
                        </label>
                        <input
                            type="number"
                            value={refundAmount}
                            onChange={(e) => setRefundAmount(e.target.value)}
                            placeholder="أدخل مبلغ الاسترداد"
                            min="0"
                            step="0.01"
                            disabled={disabled}
                            className="arabic-input"
                            dir="rtl"
                        />
                        {errors.refundAmount && (
                            <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-sm">
                                {errors.refundAmount}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Notes */}
            <div className="arabic-card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-right">
                    ملاحظات
                </h3>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="أدخل أي ملاحظات إضافية..."
                    rows={4}
                    disabled={disabled}
                    className="arabic-input"
                    dir="rtl"
                />
            </div>
        </div>
    );
};

const ReviewStep = ({
    selectedCustomer,
    selectedOrder,
    actionType,
    currentActionType,
    selectedProduct,
    selectedPart,
    refundAmount,
    notes,
    errors
}) => (
    <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white text-right">
            مراجعة إجراء الخدمة
        </h2>

        {/* Customer Information */}
        <div className="arabic-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-right">
                معلومات العميل
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
                <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">الاسم</label>
                    <p className="text-gray-900 dark:text-white">{selectedCustomer?.customer.full_name || 'غير محدد'}</p>
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">الهاتف</label>
                    <p className="text-gray-900 dark:text-white">{selectedCustomer?.customer.primary_phone}</p>
                </div>
                {selectedCustomer?.customer.second_phone && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">هاتف ثاني</label>
                        <p className="text-gray-900 dark:text-white">{selectedCustomer.customer.second_phone}</p>
                    </div>
                )}
                <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">رقم التتبع الأصلي</label>
                    <p className="text-gray-900 dark:text-white">{selectedOrder?.tracking_number}</p>
                </div>
            </div>
        </div>

        {/* Action Details */}
        <div className="arabic-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-right">
                تفاصيل الإجراء
            </h3>
            <div className="space-y-4 text-right">
                <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">نوع الإجراء</label>
                    <p className="text-gray-900 dark:text-white">{currentActionType?.label}</p>
                </div>

                {selectedProduct && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">المنتج</label>
                        <p className="text-gray-900 dark:text-white">{selectedProduct.name_ar} ({selectedProduct.sku})</p>
                    </div>
                )}

                {selectedPart && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">القطعة</label>
                        <p className="text-gray-900 dark:text-white">{selectedPart.part_name} ({selectedPart.part_sku})</p>
                    </div>
                )}

                {refundAmount && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">مبلغ الاسترداد</label>
                        <p className="text-gray-900 dark:text-white">{refundAmount} جنيه مصري</p>
                    </div>
                )}

                {notes && (
                    <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">الملاحظات</label>
                        <p className="text-gray-900 dark:text-white">{notes}</p>
                    </div>
                )}
            </div>
        </div>

        {/* Validation Errors */}
        {Object.keys(errors).length > 0 && (
            <div className="arabic-card p-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-4 text-right">
                    يجب تصحيح الأخطاء التالية:
                </h3>
                <ul className="space-y-2 text-right">
                    {Object.values(errors).map((error, index) => (
                        <li key={index} className="flex items-center space-x-2 space-x-reverse text-red-700 dark:text-red-300">
                            <span className="text-sm">{error}</span>
                            <AlertCircle className="w-4 h-4" />
                        </li>
                    ))}
                </ul>
            </div>
        )}
    </div>
);

const ConfirmationStep = ({ onCancel }) => (
    <div className="text-center py-8">
        <div className="flex items-center justify-center mb-6">
            <CheckCircle className="w-16 h-16 text-green-500" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            تم إنشاء إجراء الخدمة بنجاح!
        </h2>

        <p className="text-gray-600 dark:text-gray-400 mb-8">
            تم إنشاء إجراء الخدمة وهو الآن في حالة "تم الإنشاء". يمكنك الآن متابعة الإجراء من خلال صفحة إدارة إجراءات الخدمة.
        </p>

        <button
            type="button"
            onClick={onCancel}
            className="arabic-button"
        >
            العودة إلى قائمة إجراءات الخدمة
        </button>
    </div>
);

export default EnhancedServiceActionForm;
