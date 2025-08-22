import React, { useState, useCallback, useEffect } from 'react';
import { Search, Phone, User, Package, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { serviceActionAPI } from '../../api/serviceActionAPI';
import { debug } from '../../config/environment';

/**
 * Enhanced Customer Search Form for Service Actions
 * Provides comprehensive search functionality with customer data and order selection
 */
const CustomerSearchForm = ({
    onCustomerSelect,
    onOrderSelect,
    className = '',
    disabled = false
}) => {
    // Search state
    const [searchType, setSearchType] = useState('phone');
    const [searchValue, setSearchValue] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [searchError, setSearchError] = useState('');

    // Clear search results when search value changes
    useEffect(() => {
        if (!searchValue) {
            setSearchResults([]);
            setSelectedCustomer(null);
            setSearchError('');
        }
    }, [searchValue]);

    // Perform customer search
    const handleSearch = useCallback(async () => {
        if (!searchValue.trim()) {
            setSearchError('يرجى إدخال قيمة للبحث');
            return;
        }

        setIsSearching(true);
        setSearchError('');
        setSearchResults([]);

        try {
            debug.log('Customer search initiated', { searchType, searchValue });

            const result = await serviceActionAPI.searchCustomers(searchType, searchValue.trim(), {
                page: 1,
                limit: 10
            });

            if (result.success && result.data.customers) {
                setSearchResults(result.data.customers);
                debug.log('Customer search completed', {
                    customersFound: result.data.customers.length
                });

                if (result.data.customers.length === 0) {
                    setSearchError('لم يتم العثور على عملاء');
                }
            } else {
                setSearchError(result.message || 'فشل في البحث عن العملاء');
            }
        } catch (error) {
            debug.error('Customer search error', error);
            setSearchError('خطأ في البحث - يرجى المحاولة مرة أخرى');
        } finally {
            setIsSearching(false);
        }
    }, [searchType, searchValue]);

    // Handle customer selection
    const handleCustomerSelection = useCallback((customer) => {
        setSelectedCustomer(customer);
        onCustomerSelect?.(customer);
        debug.log('Customer selected', {
            customerPhone: customer.customer.primary_phone,
            ordersCount: customer.orders.length
        });
    }, [onCustomerSelect]);

    // Handle order selection
    const handleOrderSelection = useCallback((order) => {
        onOrderSelect?.(order, selectedCustomer);
        debug.log('Order selected for service action', {
            trackingNumber: order.tracking_number,
            orderType: order.type
        });
    }, [onOrderSelect, selectedCustomer]);

    // Search type options
    const searchTypeOptions = [
        { value: 'phone', label: 'رقم الهاتف', icon: Phone, placeholder: 'أدخل رقم الهاتف (مثل: 01123456789)' },
        { value: 'name', label: 'اسم العميل', icon: User, placeholder: 'أدخل اسم العميل' },
        { value: 'tracking', label: 'رقم التتبع', icon: Package, placeholder: 'أدخل رقم التتبع' }
    ];

    const currentSearchType = searchTypeOptions.find(opt => opt.value === searchType);

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Search Form */}
            <div className="arabic-card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-right">
                    البحث عن العميل
                </h3>

                {/* Search Type Selection */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                        نوع البحث
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {searchTypeOptions.map((option) => {
                            const IconComponent = option.icon;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setSearchType(option.value)}
                                    disabled={disabled}
                                    className={`
                    p-3 text-sm font-medium rounded-lg border text-right transition-colors
                    ${searchType === option.value
                                            ? 'bg-brand-blue-500 text-white border-brand-blue-500'
                                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                                >
                                    <div className="flex items-center justify-center space-x-2 space-x-reverse">
                                        <span>{option.label}</span>
                                        <IconComponent className="w-4 h-4" />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Search Input */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                        {currentSearchType.label}
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder={currentSearchType.placeholder}
                            disabled={disabled || isSearching}
                            className="arabic-input pr-10"
                            dir="rtl"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                    </div>
                </div>

                {/* Search Button */}
                <button
                    type="button"
                    onClick={handleSearch}
                    disabled={disabled || isSearching || !searchValue.trim()}
                    className="arabic-button w-full"
                >
                    {isSearching ? (
                        <div className="flex items-center justify-center space-x-2 space-x-reverse">
                            <span>جاري البحث...</span>
                            <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                    ) : (
                        <div className="flex items-center justify-center space-x-2 space-x-reverse">
                            <span>بحث</span>
                            <Search className="w-4 h-4" />
                        </div>
                    )}
                </button>

                {/* Search Error */}
                {searchError && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="flex items-center space-x-2 space-x-reverse text-red-700 dark:text-red-300">
                            <span className="text-sm">{searchError}</span>
                            <AlertCircle className="w-4 h-4" />
                        </div>
                    </div>
                )}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
                <div className="arabic-card p-6">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-right">
                        نتائج البحث ({searchResults.length} عميل)
                    </h4>

                    <div className="space-y-4">
                        {searchResults.map((customerData, index) => (
                            <CustomerCard
                                key={`${customerData.customer.primary_phone}-${index}`}
                                customerData={customerData}
                                isSelected={selectedCustomer?.customer.primary_phone === customerData.customer.primary_phone}
                                onSelect={() => handleCustomerSelection(customerData)}
                                onOrderSelect={handleOrderSelection}
                                disabled={disabled}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * Customer Card Component
 * Displays customer information and their orders
 */
const CustomerCard = ({
    customerData,
    isSelected,
    onSelect,
    onOrderSelect,
    disabled
}) => {
    const { customer, orders } = customerData;

    return (
        <div className={`
      border rounded-lg p-4 transition-all cursor-pointer
      ${isSelected
                ? 'border-brand-blue-500 bg-brand-blue-50 dark:bg-brand-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
            }
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    `}>
            {/* Customer Header */}
            <div
                className="flex items-center justify-between mb-3"
                onClick={onSelect}
            >
                <div className="text-right">
                    <h5 className="font-medium text-gray-900 dark:text-white">
                        {customer.full_name || customer.first_name || 'عميل غير محدد'}
                    </h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {customer.primary_phone}
                    </p>
                    {customer.second_phone && (
                        <p className="text-sm text-gray-500 dark:text-gray-500">
                            هاتف ثاني: {customer.second_phone}
                        </p>
                    )}
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {orders.length} طلب
                    </span>
                    {isSelected && <CheckCircle className="w-5 h-5 text-brand-blue-500" />}
                </div>
            </div>

            {/* Orders List */}
            {isSelected && orders.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                    <h6 className="text-sm font-medium text-gray-900 dark:text-white mb-2 text-right">
                        اختر الطلب لإنشاء إجراء خدمة:
                    </h6>
                    <div className="space-y-2">
                        {orders.map((order, orderIndex) => (
                            <OrderItem
                                key={`${order.tracking_number}-${orderIndex}`}
                                order={order}
                                onSelect={() => onOrderSelect(order)}
                                disabled={disabled}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * Order Item Component
 * Displays individual order information
 */
const OrderItem = ({ order, onSelect, disabled }) => {
    return (
        <div
            className={`
        p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700
        hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
            onClick={!disabled ? onSelect : undefined}
        >
            <div className="flex items-center justify-between text-right">
                <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                        رقم التتبع: {order.tracking_number}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        النوع: {order.type || 'غير محدد'}
                    </p>
                    {order.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                            {order.description}
                        </p>
                    )}
                </div>
                <div className="text-left">
                    {order.cod_amount && (
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {order.cod_amount} جنيه
                        </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                        {order.status || 'غير محدد'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CustomerSearchForm;
