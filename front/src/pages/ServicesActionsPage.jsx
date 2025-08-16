import React, { useMemo, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import axios from '../api/axios';
import { orderAPI } from '../api/orderAPI';

function ServicesActionsPage() {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [customer, setCustomer] = useState(null);
    const [deliveries, setDeliveries] = useState([]);
    const [selectedTracking, setSelectedTracking] = useState('');
    const [newTracking, setNewTracking] = useState('');
    const [cod, setCod] = useState('');

    const canSearch = useMemo(() => query && query.trim().length >= 3, [query]);

    const handleSearch = useCallback(async () => {
        if (!canSearch) return;
        setLoading(true);
        try {
            // Improved phone number detection for Egyptian numbers
            const isPhone = /^(\+2|002|0)?1[0-9]{9}$/.test(query.trim());
            const isTracking = /^\d{5,}$/.test(query.trim());

            console.log(`🔍 Search query: "${query.trim()}" - isPhone: ${isPhone}, isTracking: ${isTracking}`);

            if (isTracking) {
                console.log('📦 Searching by tracking number...');
                const resp = await axios.get(`/api/v1/bosta/customer-orders`, { params: { tracking: query.trim(), limit: 50 } });
                if (resp.data?.success) {
                    setCustomer(resp.data.data.customer);
                    setDeliveries(resp.data.data.deliveries || []);
                    toast.success('تم جلب طلبات العميل');
                } else {
                    toast.error(resp.data?.message || 'فشل في الجلب');
                }
            } else {
                // generic search to list deliveries to pick one
                const body = isPhone ? { phone: query.trim() } : { name: query.trim() };
                console.log('🔍 Searching by phone/name:', body);

                const resp = await axios.post(`/api/v1/bosta/search`, { ...body, limit: 50 });
                if (resp.data?.success) {
                    setCustomer(null);
                    setDeliveries(resp.data.data.deliveries || []);
                    const source = resp.data.data.source === 'local_fallback' ? ' (من قاعدة البيانات المحلية)' : '';
                    toast.success(`تم جلب النتائج${source}`);
                } else {
                    toast.error(resp.data?.message || 'فشل في الجلب');
                }
            }
        } catch (e) {
            console.error('Search error:', e);
            let errorMessage = 'خطأ في الشبكة';

            if (e.response) {
                // Server responded with error status
                if (e.response.status === 400) {
                    errorMessage = e.response.data?.message || 'طلب غير صحيح';
                } else if (e.response.status === 401) {
                    errorMessage = 'خطأ في المصادقة';
                } else if (e.response.status === 500) {
                    errorMessage = 'خطأ في الخادم';
                } else {
                    errorMessage = `خطأ ${e.response.status}: ${e.response.data?.message || 'خطأ غير معروف'}`;
                }
            } else if (e.request) {
                // Request was made but no response received
                errorMessage = 'لا يمكن الاتصال بالخادم';
            } else {
                // Something else happened
                errorMessage = e.message || 'خطأ غير متوقع';
            }

            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [canSearch, query]);

    // Test API connectivity
    const testAPI = useCallback(async () => {
        try {
            setLoading(true);
            const resp = await axios.get('/api/v1/bosta/test');
            if (resp.data?.success) {
                toast.success('Bosta API يعمل بشكل صحيح');
                console.log('✅ API test successful:', resp.data);
            } else {
                toast.error(`فشل اختبار API: ${resp.data?.message}`);
                console.log('❌ API test failed:', resp.data);
            }
        } catch (e) {
            toast.error('فشل في اختبار الاتصال');
            console.error('API test error:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    const performAction = useCallback(async (type) => {
        if (!selectedTracking) {
            return toast.error('اختر طلباً أولاً');
        }
        try {
            // Ensure order exists in backend; fetch or scan
            const fetchResp = await orderAPI.getOrderByTracking(selectedTracking);
            let orderId = fetchResp?.data?.order?.id;
            if (!orderId) {
                const scanResp = await orderAPI.scanOrder(selectedTracking);
                orderId = scanResp?.data?.order?.id;
            }
            if (!orderId) return toast.error('تعذر تجهيز الطلب');

            // Map simple service actions to backend MaintenanceAction
            const actionMap = {
                return: 'return_order',
                partReplace: 'refund_or_replace',
                fullReplace: 'refund_or_replace'
            };
            const action = actionMap[type];
            const actionData = {};
            if (newTracking?.trim()) actionData.new_tracking_number = newTracking.trim();
            if (cod?.toString().trim()) actionData.new_cod = cod.toString().trim();
            const notes = type === 'return' ? 'طلب مرتجع من العميل' : (type === 'partReplace' ? 'استبدال جزء' : 'استبدال كامل');

            const resp = await orderAPI.performOrderAction(orderId, action, notes, 'خدمة العملاء', actionData);
            if (resp.success) toast.success('تم تسجيل الإجراء');
            else toast.error(resp.message || 'فشل الإجراء');
        } catch (e) {
            toast.error('فشل تنفيذ الإجراء');
        }
    }, [selectedTracking, newTracking, cod]);

    // Custom HVAR Professional Logo
    const HvarSystemIcon = () => (
        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-brand-red-500 via-brand-red-600 to-brand-red-700 rounded-xl shadow-brand-red relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>

            <svg
                className="w-7 h-7 text-white relative z-10"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
            >
                {/* HVAR Letters */}
                <path
                    d="M6 8h2v8H6V8zm4 0h2v8h-2V8zm4 0h2v8h-2V8z"
                    fill="currentColor"
                />
                {/* Circuit Lines */}
                <path
                    d="M4 6h16M4 18h16M8 4v16M16 4v16M8 4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    stroke="currentColor"
                    strokeWidth="0.5"
                    strokeLinecap="round"
                />
                {/* Connection Dots */}
                <circle cx="6" cy="6" r="0.5" fill="currentColor" />
                <circle cx="18" cy="6" r="0.5" fill="currentColor" />
                <circle cx="6" cy="18" r="0.5" fill="currentColor" />
                <circle cx="18" cy="18" r="0.5" fill="currentColor" />
                <circle cx="12" cy="12" r="0.5" fill="currentColor" />
            </svg>

            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand-red-400/20 to-transparent rounded-xl"></div>
        </div>
    );

    return (
        <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors" dir="rtl">
            {/* Clean Navigation Bar */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 transition-colors">
                <div className="flex items-center justify-between">
                    {/* Left - Title with Icon */}
                    <div className="flex items-center space-x-3 space-x-reverse">
                        <HvarSystemIcon />
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 font-cairo">
                                إجراءات الخدمات
                            </h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400 font-cairo">
                                إدارة المرتجعات والاستبدالات
                            </p>
                        </div>
                    </div>

                    {/* Right - Status Indicator */}
                    <div className="flex items-center space-x-3 space-x-reverse shrink-0">
                        <div className="flex items-center space-x-2 space-x-reverse">
                            <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${loading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'
                                }`}></div>
                            <span className="text-xs text-gray-600 dark:text-gray-300 font-cairo">
                                {loading ? 'جاري البحث...' : 'جاهز'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel - Search and Actions */}
                <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col transition-colors">
                    {/* Search Section */}
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 font-cairo mb-3">
                            البحث عن العميل
                        </h3>

                        <div className="space-y-3">
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="رقم تتبع / رقم هاتف / اسم"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-cairo text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 placeholder:dark:text-gray-300"
                                dir="rtl"
                                aria-label="البحث عن العميل"
                            />

                            <button
                                disabled={!canSearch || loading}
                                onClick={handleSearch}
                                className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-cairo transition-colors duration-200 disabled:cursor-not-allowed"
                                aria-label={loading ? 'جاري البحث' : 'بحث'}
                            >
                                {loading ? (
                                    <div className="flex items-center justify-center space-x-2 space-x-reverse">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>جاري البحث...</span>
                                    </div>
                                ) : (
                                    'بحث'
                                )}
                            </button>
                        </div>

                        {/* Search Tips */}
                        <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <p className="text-xs text-blue-700 dark:text-blue-300 font-cairo">
                                💡 يمكنك البحث برقم التتبع أو رقم الهاتف أو اسم العميل
                            </p>
                            <button
                                onClick={testAPI}
                                className="mt-2 w-full px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs rounded font-cairo transition-colors"
                            >
                                اختبار اتصال Bosta API
                            </button>
                        </div>
                    </div>

                    {/* Action Section */}
                    <div className="flex-1 p-4 space-y-4">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 font-cairo mb-3">
                            إجراءات الخدمة
                        </h3>

                        <div className="space-y-3">
                            <button
                                onClick={() => performAction('return')}
                                className="w-full py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-lg text-sm font-cairo transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
                                aria-label="مرتجع من العميل"
                            >
                                <div className="flex items-center justify-center space-x-2 space-x-reverse">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                    </svg>
                                    <span>مرتجع من العميل</span>
                                </div>
                            </button>

                            <button
                                onClick={() => performAction('partReplace')}
                                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg text-sm font-cairo transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
                                aria-label="استبدال جزء"
                            >
                                <div className="flex items-center justify-center space-x-2 space-x-reverse">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span>استبدال جزء</span>
                                </div>
                            </button>

                            <button
                                onClick={() => performAction('fullReplace')}
                                className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg text-sm font-cairo transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
                                aria-label="استبدال كامل"
                            >
                                <div className="flex items-center justify-center space-x-2 space-x-reverse">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    <span>استبدال كامل</span>
                                </div>
                            </button>
                        </div>

                        {/* Additional Inputs */}
                        <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="space-y-2">
                                <label className="text-xs text-gray-700 dark:text-gray-300 font-cairo">رقم تتبع جديد (اختياري)</label>
                                <input
                                    value={newTracking}
                                    onChange={(e) => setNewTracking(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-cairo text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 placeholder:dark:text-gray-300"
                                    placeholder="مثال: 68427300"
                                    dir="rtl"
                                    aria-label="رقم تتبع جديد"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-gray-700 dark:text-gray-300 font-cairo">قيمة COD (اختياري)</label>
                                <input
                                    value={cod}
                                    onChange={(e) => setCod(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-cairo text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 placeholder:dark:text-gray-300"
                                    placeholder="مثال: 100"
                                    dir="rtl"
                                    aria-label="قيمة COD"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Results */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Customer Info Header */}
                    {customer && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-b border-blue-200 dark:border-blue-800 p-4">
                            <div className="flex items-center space-x-4 space-x-reverse">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>

                                <div className="flex-1">
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 font-cairo">
                                        {customer.full_name || 'غير محدد'}
                                    </h2>
                                    <div className="flex items-center space-x-4 space-x-reverse text-sm text-gray-600 dark:text-gray-400 font-cairo">
                                        <span>📱 {customer.phone || '-'}</span>
                                        {customer.second_phone && (
                                            <span className="flex items-center space-x-1 space-x-reverse">
                                                <span>📞 {customer.second_phone}</span>
                                                <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">رقم إضافي</span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Deliveries List */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 font-cairo">
                                طلبات العميل ({deliveries.length})
                            </h3>
                            {deliveries.length > 0 && (
                                <span className="text-sm text-gray-600 dark:text-gray-400 font-cairo">
                                    اختر طلباً لتنفيذ الإجراء
                                </span>
                            )}
                        </div>

                        {deliveries.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-gray-400 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 font-cairo">
                                    لا توجد نتائج
                                </h3>
                                <p className="text-gray-600 dark:text-gray-300 font-cairo">
                                    ابحث عن عميل لعرض طلباته
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {deliveries.map((delivery) => (
                                    <div key={delivery.tracking_number} className="relative">
                                        <label className="block cursor-pointer">
                                            <input
                                                type="radio"
                                                name="selectedDelivery"
                                                value={delivery.tracking_number}
                                                onChange={() => setSelectedTracking(delivery.tracking_number)}
                                                className="sr-only"
                                                aria-label={`اختيار الطلب ${delivery.tracking_number}`}
                                            />

                                            <div className={`
                        p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer
                        ${selectedTracking === delivery.tracking_number
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg shadow-blue-200/50'
                                                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                                                }
                      `}>
                                                {/* Header */}
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center space-x-2 space-x-reverse">
                                                        <div className={`w-3 h-3 rounded-full border-2 ${selectedTracking === delivery.tracking_number
                                                            ? 'border-blue-500 bg-blue-500'
                                                            : 'border-gray-300 dark:border-gray-600'
                                                            }`}></div>
                                                        <span className="font-bold text-gray-900 dark:text-gray-100 font-cairo">
                                                            {delivery.tracking_number}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center space-x-2 space-x-reverse">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold font-cairo ${delivery.order_type === 'Send'
                                                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                                                            : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200'
                                                            }`}>
                                                            {delivery.order_type}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Customer Info */}
                                                <div className="mb-3">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 font-cairo mb-1">
                                                        {delivery.receiver?.full_name || 'غير محدد'}
                                                    </p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 font-cairo">
                                                        📱 {delivery.receiver?.phone || '-'}
                                                        {delivery.receiver?.has_second_phone && (
                                                            <span className="ml-2 text-green-600">📞 رقم إضافي</span>
                                                        )}
                                                    </p>
                                                </div>

                                                {/* Order Details */}
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-gray-600 dark:text-gray-400 font-cairo">
                                                        COD: {delivery.cod_amount || 0} ج.م
                                                    </span>
                                                    <span className="text-gray-500 dark:text-gray-500 font-cairo">
                                                        {delivery.masked_state || 'غير محدد'}
                                                    </span>
                                                </div>

                                                {/* Selection Indicator */}
                                                {selectedTracking === delivery.tracking_number && (
                                                    <div className="absolute top-2 right-2">
                                                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ServicesActionsPage;


