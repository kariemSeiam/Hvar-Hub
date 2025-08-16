import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { Badge } from '../common';
import { VALIDATION, ERROR_MESSAGES } from '../../config/environment';
import { formatGregorianDate } from '../../utils/dateUtils';

const ServiceActionForm = ({
    onSubmit,
    isSubmitting = false,
    initialData = null,
    onCancel,
    className = ''
}) => {
    // Initialize form data
    const [formData, setFormData] = useState({
        customer_phone: '',
        customer_name: '',
        tracking_number: '',
        selected_order_id: '',
        action_type: 'part_replace',
        product_id: '',
        part_id: '',
        replacement_product_id: '',
        notes: '',
        priority: 'normal'
    });

    // UI state
    const [customerOrders, setCustomerOrders] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showOrderSelection, setShowOrderSelection] = useState(false);
    const [availableProducts, setAvailableProducts] = useState([]);
    const [availableParts, setAvailableParts] = useState([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);
    const [errors, setErrors] = useState({});

    // Initialize form with existing data
    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({ ...prev, ...initialData }));
            if (initialData.customer_phone) {
                handleCustomerSearch(initialData.customer_phone);
            }
        }
    }, [initialData]);

    // Load products data from backend API
    useEffect(() => {
        loadProductsData();
    }, []);

    // Load products and parts from backend API
    const loadProductsData = async () => {
        try {
            setIsLoadingProducts(true);

            // Import productAPI dynamically to avoid circular dependencies
            const { productAPI } = await import('../../api/productAPI');

            console.log('🔍 Loading products from API...');

            // Load products
            const productsResponse = await productAPI.listProducts({ limit: 100 });
            console.log('📦 Products API Response:', productsResponse);

            if (productsResponse.success && productsResponse.data && productsResponse.data.products) {
                console.log('✅ Products loaded successfully:', productsResponse.data.products.length, 'products');
                setAvailableProducts(productsResponse.data.products);

                // Load parts for each product
                const allParts = [];
                for (const product of productsResponse.data.products) {
                    const partsResponse = await productAPI.getPartsByProduct(product.id);
                    console.log(`🔧 Parts for product ${product.id} (${product.name_ar}):`, partsResponse);
                    if (partsResponse.success && partsResponse.data) {
                        partsResponse.data.forEach(part => {
                            console.log(`  📦 Part data:`, part);
                            allParts.push({
                                ...part,
                                product_name: product.name_ar,
                                product_id: product.id
                            });
                        });
                    }
                }
                setAvailableParts(allParts);
                console.log('🔧 Parts loaded successfully:', allParts.length, 'parts');
                console.log('🔧 Sample part data:', allParts[0]);
            } else {
                console.warn('⚠️ No products found or API error:', productsResponse);
                console.warn('Response structure:', {
                    success: productsResponse.success,
                    hasData: !!productsResponse.data,
                    dataKeys: productsResponse.data ? Object.keys(productsResponse.data) : 'no data',
                    message: productsResponse.message
                });
                // Fallback: try to sync products from JSON first
                await syncProductsFromJSON();
            }
        } catch (error) {
            console.error('❌ Failed to load products data:', error);
            toast.error('فشل في تحميل بيانات المنتجات');

            // Fallback: try to sync products from JSON
            try {
                await syncProductsFromJSON();
            } catch (syncError) {
                console.error('❌ Failed to sync products from JSON:', syncError);
            }
        } finally {
            setIsLoadingProducts(false);
        }
    };

    // Fallback function to sync products from JSON if API fails
    const syncProductsFromJSON = async () => {
        try {
            const { productAPI } = await import('../../api/productAPI');

            // First check sync status
            const syncStatus = await productAPI.getSyncStatus();
            if (syncStatus.success && syncStatus.data.sync_needed) {
                // Sync products from JSON
                const syncResult = await productAPI.syncProductsFromJSON();
                if (syncResult.success) {
                    toast.success(`تمت مزامنة المنتجات: ${syncResult.data.products_created} منتج جديد`);
                    // Reload products after sync
                    await loadProductsData();
                } else {
                    console.error('Sync failed:', syncResult.message);
                }
            }
        } catch (error) {
            console.error('Failed to sync products:', error);
        }
    };

    // Enhanced customer search function using customer API
    const handleCustomerSearch = useCallback(async (query) => {
        if (!query || query.length < 3) {
            setCustomerOrders([]);
            setShowOrderSelection(false);
            return;
        }

        setIsSearching(true);
        try {
            // Import orderAPI dynamically to avoid circular dependencies
            const { orderAPI } = await import('../../api/orderAPI');

            let response;

            // Check if query looks like a tracking number (alphanumeric, longer than 3 chars)
            if (/^[A-Za-z0-9]{4,}$/.test(query)) {
                // Search by tracking number first using customer API
                try {
                    const customerResponse = await fetch(`/api/v1/bosta/search`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            tracking: query,
                            group: true,
                            limit: 20
                        })
                    });

                    if (customerResponse.ok) {
                        const customerData = await customerResponse.json();
                        if (customerData.success && customerData.data?.customers?.[0]?.orders) {
                            const orders = customerData.data.customers[0].orders;
                            setCustomerOrders(orders);
                            setShowOrderSelection(true);

                            // Auto-fill customer info
                            const customer = customerData.data.customers[0].customer;
                            setFormData(prev => ({
                                ...prev,
                                customer_name: customer.full_name || '',
                                customer_phone: customer.primary_phone || ''
                            }));
                            return;
                        }
                    }
                } catch (trackingError) {
                    console.warn('Tracking search failed, falling back to order search:', trackingError);
                }
            }

            // Search by phone number or customer name using customer API
            try {
                const customerResponse = await fetch(`/api/v1/bosta/search`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        phone: query,
                        group: true,
                        limit: 20
                    })
                });

                if (customerResponse.ok) {
                    const customerData = await customerResponse.json();
                    if (customerData.success && customerData.data?.customers?.[0]?.orders) {
                        const orders = customerData.data.customers[0].orders;
                        setCustomerOrders(orders);
                        setShowOrderSelection(true);

                        // Auto-fill customer info
                        const customer = customerData.data.customers[0].customer;
                        setFormData(prev => ({
                            ...prev,
                            customer_name: customer.full_name || '',
                            customer_phone: customer.primary_phone || ''
                        }));
                        return;
                    }
                }
            } catch (customerError) {
                console.warn('Customer API search failed, falling back to order search:', customerError);
            }

            // Fallback to order search
            response = await orderAPI.searchOrders(query, null);

            if (response.success && response.data?.orders) {
                const orders = response.data.orders;
                setCustomerOrders(orders);
                setShowOrderSelection(orders.length > 0);

                // If we find orders, auto-fill customer name from first order
                if (orders.length > 0) {
                    const firstOrder = orders[0];
                    const customerName = firstOrder.receiver?.fullName ||
                        firstOrder.receiver?.firstName ||
                        firstOrder.customer_name || '';
                    const customerPhone = firstOrder.receiver?.phone ||
                        firstOrder.customer_phone || '';

                    setFormData(prev => ({
                        ...prev,
                        customer_name: customerName,
                        customer_phone: customerPhone
                    }));
                }
            } else {
                setCustomerOrders([]);
                setShowOrderSelection(false);
                if (query.length >= 3) {
                    toast.info('لم يتم العثور على طلبات لهذا العميل');
                }
            }
        } catch (error) {
            console.error('Customer search failed:', error);
            toast.error('فشل في البحث عن العميل');
            setCustomerOrders([]);
            setShowOrderSelection(false);
        } finally {
            setIsSearching(false);
        }
    }, []);

    // Handle form input changes
    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Clear related errors
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }

        // Handle special cases
        if (field === 'customer_phone' || field === 'tracking_number') {
            setSearchQuery(value);
            // Debounced search
            const timer = setTimeout(() => {
                handleCustomerSearch(value);
            }, 500); // Increased debounce time for better UX
            return () => clearTimeout(timer);
        }

        if (field === 'action_type') {
            // Reset related fields when action type changes
            setFormData(prev => ({
                ...prev,
                product_id: '',
                part_id: '',
                replacement_product_id: ''
            }));
        }
    };

    // Handle order selection
    const handleOrderSelect = (order) => {
        setSelectedOrder(order);
        setFormData(prev => ({
            ...prev,
            selected_order_id: order._id || order.id || order.tracking || order.tracking_number,
            customer_phone: order.receiver?.phone || order.customer_phone || prev.customer_phone,
            customer_name: order.receiver?.fullName || order.receiver?.firstName || order.customer_name || prev.customer_name,
            tracking_number: order.tracking_number || order.trackingNumber || order.tracking || prev.tracking_number
        }));
        setShowOrderSelection(false);
    };

    // Form validation
    const validateForm = () => {
        const newErrors = {};

        // Make phone OR tracking number required (not both)
        if (!formData.customer_phone.trim() && !formData.tracking_number.trim()) {
            newErrors.customer_phone = 'يجب إدخال رقم الهاتف أو رقم التتبع';
            newErrors.tracking_number = 'يجب إدخال رقم الهاتف أو رقم التتبع';
        }

        if (!formData.customer_name.trim()) {
            newErrors.customer_name = 'اسم العميل مطلوب';
        }

        if (!formData.selected_order_id) {
            newErrors.selected_order_id = 'يجب اختيار طلب من طلبات العميل';
        }

        if (!formData.action_type) {
            newErrors.action_type = 'نوع الإجراء مطلوب';
        }

        // Conditional validation based on action type
        if (formData.action_type === 'part_replace' && !formData.part_id) {
            newErrors.part_id = 'يجب اختيار القطعة المراد استبدالها';
        }

        if ((formData.action_type === 'full_replace' || formData.action_type === 'part_replace') && !formData.product_id) {
            newErrors.product_id = 'يجب اختيار المنتج';
        }

        if (formData.action_type === 'full_replace' && !formData.replacement_product_id) {
            newErrors.replacement_product_id = 'يجب اختيار المنتج البديل';
        }

        if (formData.notes && formData.notes.length > VALIDATION.notes.maxLength) {
            newErrors.notes = `الملاحظات يجب أن تكون أقل من ${VALIDATION.notes.maxLength} حرف`;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Transform form data to backend API format
    const transformFormDataForAPI = (formData) => {
        // Transform customer data to backend format
        const customer = {
            phone: formData.customer_phone,
            primary_phone: formData.customer_phone,
            first_name: formData.customer_name.split(' ')[0] || formData.customer_name,
            last_name: formData.customer_name.split(' ').slice(1).join(' ') || '',
            full_name: formData.customer_name,
            name: formData.customer_name,
            // Add any other customer fields that might be needed
        };

        // Transform to backend API format
        return {
            action_type: formData.action_type,
            customer: customer,
            original_tracking: formData.tracking_number,
            product_id: formData.product_id ? parseInt(formData.product_id) : null,
            part_id: formData.part_id ? parseInt(formData.part_id) : null,
            refund_amount: formData.action_type === 'return_from_customer' ? 0.0 : null,
            notes: formData.notes,
            action_data: {
                priority: formData.priority,
                replacement_product_id: formData.replacement_product_id ? parseInt(formData.replacement_product_id) : null,
                selected_order_id: formData.selected_order_id
            }
        };
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error('يرجى تصحيح الأخطاء في النموذج');
            return;
        }

        try {
            // Transform form data to backend API format
            const apiData = transformFormDataForAPI(formData);
            console.log('📤 Sending data to backend:', apiData);

            await onSubmit(apiData);
        } catch (error) {
            console.error('Form submission failed:', error);
            toast.error(ERROR_MESSAGES.UNKNOWN_ERROR);
        }
    };

    // Get action type label
    const getActionTypeLabel = (type) => {
        const labels = {
            'part_replace': 'استبدال قطعة',
            'full_replace': 'استبدال كامل',
            'return_from_customer': 'استرجاع من العميل'
        };
        return labels[type] || type;
    };

    // Get status badge variant
    const getStatusVariant = (status) => {
        const variants = {
            'completed': 'success',
            'failed': 'danger',
            'in_maintenance': 'warning',
            'received': 'primary',
            'sending': 'info',
            'returned': 'secondary'
        };
        return variants[status] || 'default';
    };

    // Get status label
    const getStatusLabel = (status) => {
        const labels = {
            'completed': 'مكتمل',
            'failed': 'فاشل',
            'in_maintenance': 'تحت الصيانة',
            'received': 'مستلم',
            'sending': 'جاري الإرسال',
            'returned': 'مرتجع'
        };
        return labels[status] || status;
    };

    // Filter parts by selected product
    const filteredParts = useMemo(() => {
        if (!formData.product_id) return [];
        return availableParts.filter(part => part.product_id === parseInt(formData.product_id));
    }, [availableParts, formData.product_id]);

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 ${className}`}>
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3 space-x-reverse">
                        <div className="w-10 h-10 bg-gradient-to-br from-brand-blue-500 to-brand-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-cairo font-bold text-gray-900 dark:text-gray-100">
                                {initialData ? 'تعديل إجراء الخدمة' : 'إنشاء إجراء خدمة جديد'}
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 font-cairo">
                                قم بإدخال بيانات العميل واختيار نوع الخدمة المطلوبة
                            </p>
                        </div>
                    </div>
                </div>

                {/* Debug Information - Products and Parts Status */}
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4 space-x-reverse">
                            <span className="font-cairo font-medium text-blue-800 dark:text-blue-200">
                                حالة البيانات:
                            </span>
                            {isLoadingProducts ? (
                                <span className="flex items-center text-blue-600 dark:text-blue-400">
                                    <svg className="w-4 h-4 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    جاري التحميل...
                                </span>
                            ) : (
                                <span className="text-blue-600 dark:text-blue-400">
                                    المنتجات: {availableProducts.length} | القطع: {availableParts.length}
                                </span>
                            )}
                        </div>
                        {availableProducts.length === 0 && !isLoadingProducts && (
                            <button
                                type="button"
                                onClick={syncProductsFromJSON}
                                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                                مزامنة المنتجات
                            </button>
                        )}
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Customer Information */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <h3 className="text-md font-cairo font-semibold text-gray-900 dark:text-gray-100 mb-4">
                            معلومات العميل
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Customer Phone */}
                            <div>
                                <label className="block text-sm font-cairo font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    رقم هاتف العميل
                                </label>
                                <div className="relative">
                                    <input
                                        type="tel"
                                        value={formData.customer_phone}
                                        onChange={(e) => handleInputChange('customer_phone', e.target.value)}
                                        placeholder="01XXXXXXXXX"
                                        className={`w-full px-4 py-3 border-2 rounded-lg font-cairo text-sm text-right bg-white dark:bg-gray-800 dark:text-gray-100 transition-all duration-200 ${errors.customer_phone
                                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                                            : 'border-gray-300 dark:border-gray-600 focus:border-brand-blue-500 focus:ring-brand-blue-500'
                                            }`}
                                        dir="ltr"
                                        disabled={isSubmitting}
                                    />
                                    {isSearching && (
                                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                                            <svg className="w-4 h-4 animate-spin text-brand-blue-500" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                {errors.customer_phone && (
                                    <p className="mt-1 text-sm text-red-600 font-cairo">{errors.customer_phone}</p>
                                )}
                            </div>

                            {/* Tracking Number */}
                            <div>
                                <label className="block text-sm font-cairo font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    رقم التتبع (اختياري)
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={formData.tracking_number}
                                        onChange={(e) => handleInputChange('tracking_number', e.target.value)}
                                        placeholder="أو أدخل رقم التتبع"
                                        className={`w-full px-4 py-3 border-2 rounded-lg font-cairo text-sm text-right bg-white dark:bg-gray-800 dark:text-gray-100 transition-all duration-200 ${errors.tracking_number
                                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                                            : 'border-gray-300 dark:border-gray-600 focus:border-brand-blue-500 focus:ring-brand-blue-500'
                                            }`}
                                        dir="ltr"
                                        disabled={isSubmitting}
                                    />
                                    {isSearching && (
                                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                                            <svg className="w-4 h-4 animate-spin text-brand-blue-500" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                {errors.tracking_number && (
                                    <p className="mt-1 text-sm text-red-600 font-cairo">{errors.tracking_number}</p>
                                )}
                            </div>

                            {/* Customer Name */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-cairo font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    اسم العميل *
                                </label>
                                <input
                                    type="text"
                                    value={formData.customer_name}
                                    onChange={(e) => handleInputChange('customer_name', e.target.value)}
                                    placeholder="ادخل اسم العميل"
                                    className={`w-full px-4 py-3 border-2 rounded-lg font-cairo text-sm text-right bg-white dark:bg-gray-800 dark:text-gray-100 transition-all duration-200 ${errors.customer_name
                                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                                        : 'border-gray-300 dark:border-gray-600 focus:border-brand-blue-500 focus:ring-brand-blue-500'
                                        }`}
                                    dir="rtl"
                                    disabled={isSubmitting}
                                />
                                {errors.customer_name && (
                                    <p className="mt-1 text-sm text-red-600 font-cairo">{errors.customer_name}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Order Selection */}
                    {showOrderSelection && customerOrders.length > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                            <h3 className="text-md font-cairo font-semibold text-gray-900 dark:text-gray-100 mb-4">
                                اختيار الطلب
                            </h3>
                            <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-hide">
                                {customerOrders.map((order) => (
                                    <div
                                        key={order._id || order.id}
                                        onClick={() => handleOrderSelect(order)}
                                        className={`p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${selectedOrder?.id === order.id || selectedOrder?._id === order._id
                                            ? 'border-brand-blue-500 bg-brand-blue-50 dark:bg-brand-blue-900/30'
                                            : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-brand-blue-300'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-2 space-x-reverse mb-2">
                                                    <span className="font-cairo font-semibold text-sm text-gray-900 dark:text-gray-100">
                                                        {order.tracking_number || order.trackingNumber || order.tracking || 'غير محدد'}
                                                    </span>
                                                    <Badge variant={getStatusVariant(order.status || order.state)} size="sm">
                                                        {getStatusLabel(order.status || order.state)}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs font-cairo text-gray-600 dark:text-gray-400">
                                                    {order.description || order.specs?.packageDetails?.description || order.package_details?.description || 'لا يوجد وصف'}
                                                </p>
                                                <p className="text-xs font-cairo text-gray-500 dark:text-gray-500 mt-1">
                                                    {formatGregorianDate(order.created_at || order.creationTimestamp || order.createdAt || order.created_at || new Date())}
                                                </p>
                                            </div>
                                            <div className="flex items-center">
                                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {errors.selected_order_id && (
                                <p className="mt-2 text-sm text-red-600 font-cairo">{errors.selected_order_id}</p>
                            )}
                        </div>
                    )}

                    {/* Selected Order Display */}
                    {selectedOrder && (
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                            <div className="flex items-center space-x-2 space-x-reverse mb-2">
                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-cairo font-semibold text-sm text-green-800 dark:text-green-200">
                                    الطلب المحدد: {selectedOrder.tracking_number || selectedOrder.trackingNumber || selectedOrder.tracking || 'غير محدد'}
                                </span>
                            </div>
                            <p className="text-xs font-cairo text-green-700 dark:text-green-300">
                                {selectedOrder.description || selectedOrder.specs?.packageDetails?.description || selectedOrder.package_details?.description || 'لا يوجد وصف'}
                            </p>
                        </div>
                    )}

                    {/* Service Action Configuration */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <h3 className="text-md font-cairo font-semibold text-gray-900 dark:text-gray-100 mb-4">
                            تكوين إجراء الخدمة
                        </h3>

                        {/* Action Type */}
                        <div className="mb-4">
                            <label className="block text-sm font-cairo font-medium text-gray-700 dark:text-gray-300 mb-2">
                                نوع الإجراء *
                            </label>
                            <select
                                value={formData.action_type}
                                onChange={(e) => handleInputChange('action_type', e.target.value)}
                                className={`w-full px-4 py-3 border-2 rounded-lg font-cairo text-sm text-right bg-white dark:bg-gray-800 dark:text-gray-100 transition-all duration-200 ${errors.action_type
                                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                                    : 'border-gray-300 dark:border-gray-600 focus:border-brand-blue-500 focus:ring-brand-blue-500'
                                    }`}
                                dir="rtl"
                                disabled={isSubmitting}
                            >
                                <option value="part_replace">استبدال قطعة</option>
                                <option value="full_replace">استبدال كامل</option>
                                <option value="return_from_customer">استرجاع من العميل</option>
                            </select>
                            {errors.action_type && (
                                <p className="mt-1 text-sm text-red-600 font-cairo">{errors.action_type}</p>
                            )}
                        </div>

                        {/* Product Selection */}
                        {(formData.action_type === 'part_replace' || formData.action_type === 'full_replace') && (
                            <div className="mb-4">
                                <label className="block text-sm font-cairo font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    المنتج *
                                </label>
                                <select
                                    value={formData.product_id}
                                    onChange={(e) => handleInputChange('product_id', e.target.value)}
                                    className={`w-full px-4 py-3 border-2 rounded-lg font-cairo text-sm text-right bg-white dark:bg-gray-800 dark:text-gray-100 transition-all duration-200 ${errors.product_id
                                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                                        : 'border-gray-300 dark:border-gray-600 focus:border-brand-blue-500 focus:ring-brand-blue-500'
                                        }`}
                                    dir="rtl"
                                    disabled={isSubmitting || isLoadingProducts}
                                >
                                    <option value="">اختر المنتج</option>
                                    {availableProducts.map(product => (
                                        <option key={product.id} value={product.id}>
                                            {product.name_ar} - {product.sku}
                                        </option>
                                    ))}
                                </select>
                                {errors.product_id && (
                                    <p className="mt-1 text-sm text-red-600 font-cairo">{errors.product_id}</p>
                                )}
                            </div>
                        )}

                        {/* Part Selection */}
                        {formData.action_type === 'part_replace' && formData.product_id && (
                            <div className="mb-4">
                                <label className="block text-sm font-cairo font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    القطعة المراد استبدالها *
                                </label>
                                <select
                                    value={formData.part_id}
                                    onChange={(e) => handleInputChange('part_id', e.target.value)}
                                    className={`w-full px-4 py-3 border-2 rounded-lg font-cairo text-sm text-right bg-white dark:bg-gray-800 dark:text-gray-100 transition-all duration-200 ${errors.part_id
                                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                                        : 'border-gray-300 dark:border-gray-600 focus:border-brand-blue-500 focus:ring-brand-blue-500'
                                        }`}
                                    dir="rtl"
                                    disabled={isSubmitting || isLoadingProducts}
                                >
                                    <option value="">اختر القطعة</option>
                                    {filteredParts.map(part => (
                                        <option key={part.id} value={part.id}>
                                            {part.part_name} - {part.part_sku} (سعر: {part.cost_price} ج.م)
                                        </option>
                                    ))}
                                </select>
                                {errors.part_id && (
                                    <p className="mt-1 text-sm text-red-600 font-cairo">{errors.part_id}</p>
                                )}
                            </div>
                        )}

                        {/* Replacement Product Selection */}
                        {formData.action_type === 'full_replace' && (
                            <div className="mb-4">
                                <label className="block text-sm font-cairo font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    المنتج البديل *
                                </label>
                                <select
                                    value={formData.replacement_product_id}
                                    onChange={(e) => handleInputChange('replacement_product_id', e.target.value)}
                                    className={`w-full px-4 py-3 border-2 rounded-lg font-cairo text-sm text-right bg-white dark:bg-gray-800 dark:text-gray-100 transition-all duration-200 ${errors.replacement_product_id
                                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                                        : 'border-gray-300 dark:border-gray-600 focus:border-brand-blue-500 focus:ring-brand-blue-500'
                                        }`}
                                    dir="rtl"
                                    disabled={isSubmitting || isLoadingProducts}
                                >
                                    <option value="">اختر المنتج البديل</option>
                                    {availableProducts.map(product => (
                                        <option key={product.id} value={product.id}>
                                            {product.name_ar} - {product.sku}
                                        </option>
                                    ))}
                                </select>
                                {errors.replacement_product_id && (
                                    <p className="mt-1 text-sm text-red-600 font-cairo">{errors.replacement_product_id}</p>
                                )}
                            </div>
                        )}

                        {/* Priority */}
                        <div className="mb-4">
                            <label className="block text-sm font-cairo font-medium text-gray-700 dark:text-gray-300 mb-2">
                                الأولوية
                            </label>
                            <select
                                value={formData.priority}
                                onChange={(e) => handleInputChange('priority', e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg font-cairo text-sm text-right bg-white dark:bg-gray-800 dark:text-gray-100 focus:border-brand-blue-500 focus:ring-brand-blue-500 transition-all duration-200"
                                dir="rtl"
                                disabled={isSubmitting}
                            >
                                <option value="low">منخفضة</option>
                                <option value="normal">عادية</option>
                                <option value="high">عالية</option>
                                <option value="urgent">عاجلة</option>
                            </select>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-cairo font-medium text-gray-700 dark:text-gray-300 mb-2">
                                ملاحظات
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => handleInputChange('notes', e.target.value)}
                                placeholder="ملاحظات إضافية حول إجراء الخدمة..."
                                rows={3}
                                maxLength={VALIDATION.notes.maxLength}
                                className={`w-full px-4 py-3 border-2 rounded-lg font-cairo text-sm text-right bg-white dark:bg-gray-800 dark:text-gray-100 resize-none transition-all duration-200 ${errors.notes
                                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                                    : 'border-gray-300 dark:border-gray-600 focus:border-brand-blue-500 focus:ring-brand-blue-500'
                                    }`}
                                dir="rtl"
                                disabled={isSubmitting}
                            />
                            {errors.notes && (
                                <p className="mt-1 text-sm text-red-600 font-cairo">{errors.notes}</p>
                            )}
                        </div>
                    </div>

                    {/* Form Actions */}
                    <div className="flex items-center justify-end space-x-3 space-x-reverse pt-4 border-t border-gray-200 dark:border-gray-600">
                        {onCancel && (
                            <button
                                type="button"
                                onClick={onCancel}
                                disabled={isSubmitting}
                                className="px-6 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg font-cairo text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                إلغاء
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={isSubmitting || !selectedOrder}
                            className="px-6 py-2.5 bg-gradient-to-r from-brand-blue-500 to-brand-blue-600 text-white rounded-lg font-cairo text-sm font-medium shadow-sm hover:from-brand-blue-600 hover:to-brand-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 space-x-reverse"
                        >
                            {isSubmitting && (
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            )}
                            <span>{initialData ? 'تحديث الإجراء' : 'إنشاء إجراء الخدمة'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default React.memo(ServiceActionForm);