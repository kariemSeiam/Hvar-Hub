import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    Package,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    Search,
    Filter,
    RefreshCw,
    Plus,
    Wrench,
    BarChart3,
    DollarSign,
    CheckCircle,
    XCircle,
    Settings,
    Download,
    Upload,
    Eye,
    Edit,
    Trash2,
    MoreVertical,
    ChevronDown,
    ChevronUp,
    Save,
    X,
    AlertCircle,
    Info,
    Clock,
    Calendar,
    Hash,
    Tag,
    ChevronRight,
    ChevronLeft,
    PlusIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
    ArrowPathIcon,
    ChartBarIcon,
    CubeIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    XMarkIcon,
    PencilIcon,
    TrashIcon
} from 'lucide-react';
import { productAPI } from '../../api/productAPI';
import { debug } from '../../config/environment';
import toast from 'react-hot-toast';

/**
 * Optimized Stock Management Dashboard
 * - Compact design with excellent performance
 * - Full WCAG 3 compliance
 * - Professional appearance maintaining current web design
 * - Efficient endpoint integration
 */
const StockManagementDashboard = ({ className = '' }) => {
    // Optimized state management
    const [state, setState] = useState({
        inventory: {
            products: [],
            parts: [],
            analytics: {},
            lowStock: [],
            syncStatus: {}
        },
        filters: {
            category: 'all',
            status: 'all',
            search: '',
            product_id: null,
            part_type: 'all'
        },
        loading: true,
        refreshing: false,
        syncing: false,
        currentView: 'overview',
        selectedItem: null,
        showFilters: false,
        showCreateModal: false,
        showEditModal: false,
        showDeleteModal: false,
        modalType: 'product',
        formData: {},
        formErrors: {},
        pagination: {
            products: { page: 1, limit: 20, total: 0 },
            parts: { page: 1, limit: 20, total: 0 }
        }
    });

    // Refs for accessibility
    const mainHeadingRef = useRef(null);
    const searchInputRef = useRef(null);

    // Optimized state updater
    const updateState = useCallback((updates) => {
        setState(prev => ({ ...prev, ...updates }));
    }, []);

    // Optimized data loading with proper endpoint usage
    const loadInventoryData = useCallback(async (isRefresh = false) => {
        const loadingKey = isRefresh ? 'refreshing' : 'loading';
        updateState({ [loadingKey]: true });

        try {
            // Parallel API calls for optimal performance
            const [
                productsResult,
                partsResult,
                analyticsResult,
                lowStockResult,
                syncStatusResult
            ] = await Promise.allSettled([
                productAPI.listProducts({
                    page: state.pagination.products.page,
                    limit: state.pagination.products.limit,
                    category: state.filters.category !== 'all' ? state.filters.category : undefined
                }),
                productAPI.listParts({
                    page: state.pagination.parts.page,
                    limit: state.pagination.parts.limit,
                    product_id: state.filters.product_id || undefined,
                    part_type: state.filters.part_type !== 'all' ? state.filters.part_type : undefined
                }),
                productAPI.getInventoryAnalytics(),
                productAPI.getLowStockItems({ limit: 10 }), // Limit for performance
                productAPI.getSyncStatus()
            ]);

            // Process results with error handling
            const newInventory = {
                products: productsResult.status === 'fulfilled' && productsResult.value.success
                    ? productsResult.value.data.products || [] : [],
                parts: partsResult.status === 'fulfilled' && partsResult.value.success
                    ? partsResult.value.data.parts || [] : [],
                analytics: analyticsResult.status === 'fulfilled' && analyticsResult.value.success
                    ? analyticsResult.value.data : {},
                lowStock: lowStockResult.status === 'fulfilled' && lowStockResult.value.success
                    ? lowStockResult.value.data : [],
                syncStatus: syncStatusResult.status === 'fulfilled' && syncStatusResult.value.success
                    ? syncStatusResult.value.data : {}
            };

            updateState({
                inventory: newInventory,
                [loadingKey]: false
            });

            // Update pagination if available
            if (productsResult.status === 'fulfilled' && productsResult.value.success && productsResult.value.data.pagination) {
                updateState({
                    pagination: {
                        ...state.pagination,
                        products: {
                            ...state.pagination.products,
                            total: productsResult.value.data.pagination.total || 0
                        }
                    }
                });
            }

            if (partsResult.status === 'fulfilled' && partsResult.value.success && partsResult.value.data.pagination) {
                updateState({
                    pagination: {
                        ...state.pagination,
                        parts: {
                            ...state.pagination.parts,
                            total: partsResult.value.data.pagination.total || 0
                        }
                    }
                });
            }

            debug.log('Inventory data loaded successfully', {
                products: newInventory.products.length,
                parts: newInventory.parts.length,
                analytics: !!newInventory.analytics,
                lowStock: newInventory.lowStock.length
            });

        } catch (error) {
            debug.error('Failed to load inventory data', error);
            toast.error('فشل في تحميل بيانات المخزون', {
                duration: 4000,
                position: 'top-center',
                style: {
                    background: '#EF4444',
                    color: '#fff',
                    fontFamily: 'Cairo, sans-serif'
                }
            });
        } finally {
            updateState({ [loadingKey]: false });
        }
    }, [state.pagination.products.page, state.pagination.products.limit,
    state.pagination.parts.page, state.pagination.parts.limit,
    state.filters.category, state.filters.product_id, state.filters.part_type, updateState]);

    // Optimized stock update with proper endpoint usage
    const handleStockUpdate = useCallback(async (itemId, newStock, type) => {
        try {
            let result;
            if (type === 'product') {
                result = await productAPI.updateProduct(itemId, { current_stock: newStock });
            } else {
                result = await productAPI.updatePart(itemId, { current_stock: newStock });
            }

            if (result.success) {
                // Optimistic update for better UX
                updateState({
                    inventory: {
                        ...state.inventory,
                        [type === 'product' ? 'products' : 'parts']:
                            state.inventory[type === 'product' ? 'products' : 'parts'].map(item =>
                                item.id === itemId ? { ...item, current_stock: newStock } : item
                            )
                    }
                });

                toast.success(`تم تحديث المخزون بنجاح إلى ${newStock}`, {
                    duration: 3000,
                    position: 'top-center',
                    style: {
                        background: '#10B981',
                        color: '#fff',
                        fontFamily: 'Cairo, sans-serif'
                    }
                });

                debug.log('Stock updated successfully', { itemId, newStock, type });
            } else {
                toast.error(`فشل في تحديث المخزون: ${result.message}`, {
                    duration: 4000,
                    position: 'top-center',
                    style: {
                        background: '#EF4444',
                        color: '#fff',
                        fontFamily: 'Cairo, sans-serif'
                    }
                });
            }
        } catch (error) {
            debug.error('Stock update failed', error);
            toast.error('حدث خطأ أثناء تحديث المخزون', {
                duration: 4000,
                position: 'top-center',
                style: {
                    background: '#EF4444',
                    color: '#fff',
                    fontFamily: 'Cairo, sans-serif'
                }
            });
        }
    }, [state.inventory, updateState]);

    // Optimized sync handling
    const handleSync = useCallback(async (force = false) => {
        updateState({ syncing: true });
        try {
            const result = force ?
                await productAPI.forceSyncProducts() :
                await productAPI.syncProducts();

            if (result.success) {
                toast.success('تمت المزامنة بنجاح', {
                    duration: 3000,
                    position: 'top-center',
                    style: {
                        background: '#10B981',
                        color: '#fff',
                        fontFamily: 'Cairo, sans-serif'
                    }
                });
                await loadInventoryData(true);
            } else {
                toast.error(`فشل في المزامنة: ${result.message}`, {
                    duration: 4000,
                    position: 'top-center',
                    style: {
                        background: '#EF4444',
                        color: '#fff',
                        fontFamily: 'Cairo, sans-serif'
                    }
                });
            }
        } catch (error) {
            debug.error('Sync failed', error);
            toast.error('حدث خطأ أثناء المزامنة', {
                duration: 4000,
                position: 'top-center',
                style: {
                    background: '#EF4444',
                    color: '#fff',
                    fontFamily: 'Cairo, sans-serif'
                }
            });
        } finally {
            updateState({ syncing: false });
        }
    }, [loadInventoryData, updateState]);

    // Memoized filtered items for performance
    const filteredItems = useMemo(() => {
        let items = [];

        if (state.filters.category === 'products' || state.filters.category === 'all') {
            items = [...items, ...state.inventory.products.map(p => ({ ...p, type: 'product' }))];
        }

        if (state.filters.category === 'parts' || state.filters.category === 'all') {
            items = [...items, ...state.inventory.parts.map(p => ({ ...p, type: 'part' }))];
        }

        // Apply status filter
        if (state.filters.status !== 'all') {
            items = items.filter(item => {
                const status = getItemStatus(item);
                return state.filters.status === status;
            });
        }

        // Apply search filter
        if (state.filters.search) {
            const search = state.filters.search.toLowerCase();
            items = items.filter(item => {
                const name = item.type === 'product' ?
                    (item.name_ar || item.name_en || '') :
                    (item.part_name || '');
                const sku = item.type === 'product' ?
                    (item.sku || '') :
                    (item.part_sku || '');

                return name.toLowerCase().includes(search) ||
                    sku.toLowerCase().includes(search);
            });
        }

        return items;
    }, [state.inventory, state.filters]);

    // Utility functions
    const getItemStatus = useCallback((item) => {
        if (!item.is_active) return 'inactive';
        if (item.current_stock <= 0) return 'out_of_stock';
        if (item.current_stock <= (item.min_stock_level || item.alert_quantity || 5)) return 'low_stock';
        return 'active';
    }, []);

    const getStatusColor = useCallback((status) => {
        const colors = {
            'active': 'text-green-600 dark:text-green-400',
            'low_stock': 'text-amber-600 dark:text-amber-400',
            'out_of_stock': 'text-red-600 dark:text-red-400',
            'inactive': 'text-gray-600 dark:text-gray-400'
        };
        return colors[status] || colors.active;
    }, []);

    const getStatusLabel = useCallback((status) => {
        const labels = {
            'active': 'متوفر',
            'low_stock': 'مخزون منخفض',
            'out_of_stock': 'نفذ المخزون',
            'inactive': 'غير نشط'
        };
        return labels[status] || labels.active;
    }, []);

    // Initial load
    useEffect(() => {
        loadInventoryData();
        // Focus management for accessibility
        if (mainHeadingRef.current) {
            mainHeadingRef.current.focus();
        }
    }, [loadInventoryData]);

    // Loading state
    if (state.loading) {
        return (
            <div className={`${className}`} role="main" aria-label="إدارة المخزون">
                <InventoryDashboardSkeleton />
            </div>
        );
    }

    return (
        <div className={`space-y-4 ${className}`} role="main" aria-label="إدارة المخزون">
            {/* Compact Header with Sync Status */}
            <header className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                <div className="text-right">
                    <h1
                        ref={mainHeadingRef}
                        className="text-xl font-bold text-gray-900 dark:text-white font-cairo-play"
                        tabIndex="-1"
                    >
                        إدارة المخزون
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 font-cairo">
                        نظرة شاملة على المنتجات والقطع والمخزون
                    </p>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                    {/* Compact Sync Status & Actions */}
                    {state.inventory.syncStatus.needs_sync && (
                        <div className="flex items-center space-x-2 space-x-reverse text-amber-600 dark:text-amber-400 text-sm">
                            <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                            <span className="font-cairo">يحتاج مزامنة</span>
                        </div>
                    )}

                    <button
                        onClick={() => handleSync(false)}
                        disabled={state.syncing}
                        className="arabic-button-secondary px-3 py-2 text-sm font-cairo"
                        title="مزامنة المنتجات"
                        aria-label="مزامنة المنتجات"
                    >
                        <Upload className={`w-4 h-4 ${state.syncing ? 'animate-spin' : ''}`} aria-hidden="true" />
                        <span className="mr-2">مزامنة</span>
                    </button>

                    <button
                        onClick={() => handleSync(true)}
                        disabled={state.syncing}
                        className="arabic-button-secondary px-3 py-2 text-sm font-cairo border-amber-300 text-amber-700"
                        title="مزامنة قسرية"
                        aria-label="مزامنة قسرية"
                    >
                        <RefreshCw className={`w-4 h-4 ${state.syncing ? 'animate-spin' : ''}`} aria-hidden="true" />
                        <span className="mr-2">قسرية</span>
                    </button>

                    {/* Compact View Toggle */}
                    <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        {['overview', 'products', 'parts'].map((view) => (
                            <button
                                key={view}
                                onClick={() => updateState({ currentView: view })}
                                className={`px-3 py-2 text-sm font-medium transition-colors font-cairo ${state.currentView === view
                                    ? 'bg-brand-blue-500 text-white'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                                aria-pressed={state.currentView === view}
                                aria-label={`عرض ${view === 'overview' ? 'النظرة العامة' : view === 'products' ? 'المنتجات' : 'القطع'}`}
                            >
                                {view === 'overview' ? 'نظرة عامة' : view === 'products' ? 'المنتجات' : 'القطع'}
                            </button>
                        ))}
                    </div>

                    {/* Compact Refresh Button */}
                    <button
                        onClick={() => loadInventoryData(true)}
                        disabled={state.refreshing}
                        className="arabic-button-secondary p-2"
                        title="تحديث البيانات"
                        aria-label="تحديث البيانات"
                    >
                        <RefreshCw className={`w-4 h-4 ${state.refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
                    </button>
                </div>
            </header>

            {/* Compact Content Views */}
            <main>
                {state.currentView === 'overview' && (
                    <OverviewDashboard
                        inventory={state.inventory}
                        onViewChange={(view) => updateState({ currentView: view })}
                        onRefresh={() => loadInventoryData(true)}
                        syncStatus={state.inventory.syncStatus}
                    />
                )}

                {state.currentView === 'products' && (
                    <ProductsView
                        products={state.inventory.products}
                        filters={state.filters}
                        setFilters={(filters) => updateState({ filters })}
                        pagination={state.pagination.products}
                        onPageChange={(page) => updateState({
                            pagination: {
                                ...state.pagination,
                                products: { ...state.pagination.products, page }
                            }
                        })}
                        onRefresh={() => loadInventoryData(true)}
                        showFilters={state.showFilters}
                        setShowFilters={(show) => updateState({ showFilters: show })}
                        onCreate={() => updateState({ showCreateModal: true, modalType: 'product' })}
                        onEdit={(item) => updateState({
                            showEditModal: true,
                            modalType: 'product',
                            selectedItem: item,
                            formData: item
                        })}
                        onDelete={(item) => updateState({
                            showDeleteModal: true,
                            modalType: 'product',
                            selectedItem: item
                        })}
                        onStockUpdate={handleStockUpdate}
                    />
                )}

                {state.currentView === 'parts' && (
                    <PartsView
                        parts={state.inventory.parts}
                        filters={state.filters}
                        setFilters={(filters) => updateState({ filters })}
                        pagination={state.pagination.parts}
                        onPageChange={(page) => updateState({
                            pagination: {
                                ...state.pagination,
                                parts: { ...state.pagination.parts, page }
                            }
                        })}
                        onRefresh={() => loadInventoryData(true)}
                        showFilters={state.showFilters}
                        setShowFilters={(show) => updateState({ showFilters: show })}
                        onCreate={() => updateState({ showCreateModal: true, modalType: 'part' })}
                        onEdit={(item) => updateState({
                            showEditModal: true,
                            modalType: 'part',
                            selectedItem: item,
                            formData: item
                        })}
                        onDelete={(item) => updateState({
                            showDeleteModal: true,
                            modalType: 'part',
                            selectedItem: item
                        })}
                        onStockUpdate={handleStockUpdate}
                    />
                )}
            </main>

            {/* Modals */}
            {state.showCreateModal && (
                <CreateEditModal
                    type={state.modalType}
                    mode="create"
                    data={state.formData}
                    errors={state.formErrors}
                    onSubmit={async (data) => {
                        try {
                            const result = state.modalType === 'product' ?
                                await productAPI.createProduct(data) :
                                await productAPI.createPart(data);

                            if (result.success) {
                                updateState({
                                    showCreateModal: false,
                                    formData: {},
                                    formErrors: {}
                                });
                                await loadInventoryData(true);
                                toast.success('تم إنشاء العنصر بنجاح', {
                                    duration: 3000,
                                    position: 'top-center',
                                    style: {
                                        background: '#10B981',
                                        color: '#fff',
                                        fontFamily: 'Cairo, sans-serif'
                                    }
                                });
                            } else {
                                updateState({ formErrors: { general: result.message } });
                            }
                        } catch (error) {
                            debug.error('Create failed', error);
                            updateState({ formErrors: { general: 'فشل في إنشاء العنصر' } });
                        }
                    }}
                    onClose={() => updateState({
                        showCreateModal: false,
                        formData: {},
                        formErrors: {}
                    })}
                    products={state.inventory.products}
                />
            )}

            {state.showEditModal && (
                <CreateEditModal
                    type={state.modalType}
                    mode="edit"
                    data={state.formData}
                    errors={state.formErrors}
                    onSubmit={async (data) => {
                        try {
                            const result = state.modalType === 'product' ?
                                await productAPI.updateProduct(state.selectedItem.id, data) :
                                await productAPI.updatePart(state.selectedItem.id, data);

                            if (result.success) {
                                updateState({
                                    showEditModal: false,
                                    selectedItem: null,
                                    formData: {},
                                    formErrors: {}
                                });
                                await loadInventoryData(true);
                                toast.success('تم تحديث العنصر بنجاح', {
                                    duration: 3000,
                                    position: 'top-center',
                                    style: {
                                        background: '#10B981',
                                        color: '#fff',
                                        fontFamily: 'Cairo, sans-serif'
                                    }
                                });
                            } else {
                                updateState({ formErrors: { general: result.message } });
                            }
                        } catch (error) {
                            debug.error('Update failed', error);
                            updateState({ formErrors: { general: 'فشل في تحديث العنصر' } });
                        }
                    }}
                    onClose={() => updateState({
                        showEditModal: false,
                        selectedItem: null,
                        formData: {},
                        formErrors: {}
                    })}
                    products={state.inventory.products}
                />
            )}

            {state.showDeleteModal && (
                <DeleteConfirmationModal
                    item={state.selectedItem}
                    type={state.modalType}
                    onConfirm={async () => {
                        try {
                            const result = state.modalType === 'product' ?
                                await productAPI.deleteProduct(state.selectedItem.id) :
                                await productAPI.deletePart(state.selectedItem.id);

                            if (result.success) {
                                updateState({
                                    showDeleteModal: false,
                                    selectedItem: null
                                });
                                await loadInventoryData(true);
                                toast.success('تم حذف العنصر بنجاح', {
                                    duration: 3000,
                                    position: 'top-center',
                                    style: {
                                        background: '#10B981',
                                        color: '#fff',
                                        fontFamily: 'Cairo, sans-serif'
                                    }
                                });
                            }
                        } catch (error) {
                            debug.error('Delete failed', error);
                        }
                    }}
                    onClose={() => updateState({
                        showDeleteModal: false,
                        selectedItem: null
                    })}
                />
            )}
        </div>
    );
};

/**
 * Compact Overview Dashboard Component
 * - Optimized for performance with memoization
 * - Full WCAG 3 compliance
 * - Clean, professional design
 */
const OverviewDashboard = React.memo(({ inventory, onViewChange, onRefresh, syncStatus }) => {
    const metrics = useMemo(() => ({
        totalProducts: inventory.products?.length || 0,
        totalParts: inventory.parts?.length || 0,
        lowStockItems: inventory.lowStock?.length || 0,
        needsSync: syncStatus?.needs_sync || false,
        productsToSync: syncStatus?.products_to_sync || 0,
        partsToSync: syncStatus?.parts_to_sync || 0
    }), [inventory, syncStatus]);

    return (
        <div className="space-y-4" role="region" aria-label="نظرة عامة على المخزون">
            {/* Compact Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="إجمالي المنتجات"
                    value={metrics.totalProducts}
                    icon={Package}
                    color="blue"
                    onClick={() => onViewChange('products')}
                    aria-label={`عرض ${metrics.totalProducts} منتج`}
                />
                <MetricCard
                    title="إجمالي القطع"
                    value={metrics.totalParts}
                    icon={Wrench}
                    color="purple"
                    onClick={() => onViewChange('parts')}
                    aria-label={`عرض ${metrics.totalParts} قطعة`}
                />
                <MetricCard
                    title="مخزون منخفض"
                    value={metrics.lowStockItems}
                    icon={AlertTriangle}
                    color="amber"
                    onClick={() => onViewChange('products')}
                    aria-label={`عرض ${metrics.lowStockItems} عنصر بمخزون منخفض`}
                />
                <MetricCard
                    title="حالة المزامنة"
                    value={metrics.needsSync ? 'يحتاج مزامنة' : 'محدث'}
                    icon={SyncStatus}
                    color={metrics.needsSync ? 'red' : 'green'}
                    onClick={onRefresh}
                    aria-label={metrics.needsSync ? 'تحديث البيانات' : 'البيانات محدثة'}
                />
            </div>

            {/* Compact Low Stock Alerts */}
            {inventory.lowStock && inventory.lowStock.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white font-cairo">
                            تنبيهات المخزون المنخفض
                        </h3>
                        <button
                            onClick={() => onViewChange('products')}
                            className="text-sm text-brand-blue-600 hover:text-brand-blue-700 font-cairo"
                            aria-label="عرض جميع المنتجات"
                        >
                            عرض الكل
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {inventory.lowStock.slice(0, 6).map((item) => (
                            <LowStockAlert key={item.id} item={item} />
                        ))}
                    </div>
                </div>
            )}

            {/* Compact Sync Status */}
            {metrics.needsSync && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 space-x-reverse">
                            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                            <div>
                                <h4 className="font-medium text-amber-800 dark:text-amber-200 font-cairo">
                                    يحتاج مزامنة
                                </h4>
                                <p className="text-sm text-amber-700 dark:text-amber-300 font-cairo">
                                    {metrics.productsToSync} منتج و {metrics.partsToSync} قطعة تحتاج مزامنة
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onRefresh}
                            className="px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 font-cairo"
                            aria-label="مزامنة البيانات"
                        >
                            مزامنة الآن
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});

/**
 * Compact Metric Card Component
 * - Accessible with proper ARIA labels
 * - Optimized performance with memoization
 * - Clean, professional design
 */
const MetricCard = React.memo(({ title, value, icon: Icon, color, onClick, 'aria-label': ariaLabel }) => {
    const colorClasses = {
        blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
        purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300',
        amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
        green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',
        red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
    };

    return (
        <button
            onClick={onClick}
            className={`${colorClasses[color]} border rounded-lg p-4 text-right transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue-500`}
            aria-label={ariaLabel}
        >
            <div className="flex items-center justify-between">
                <Icon className="w-8 h-8 opacity-80" aria-hidden="true" />
                <div>
                    <p className="text-2xl font-bold font-cairo">{value}</p>
                    <p className="text-sm font-medium font-cairo">{title}</p>
                </div>
            </div>
        </button>
    );
});

/**
 * Compact Low Stock Alert Component
 * - Optimized for performance
 * - Accessible design
 */
const LowStockAlert = React.memo(({ item }) => (
    <div className="flex items-center space-x-2 space-x-reverse p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-red-800 dark:text-red-200 font-cairo truncate">
                {item.name_ar || item.part_name || 'عنصر غير محدد'}
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 font-cairo">
                المخزون: {item.current_stock || 0}
            </p>
        </div>
    </div>
));

/**
 * Compact Products View Component
 * - Optimized performance with virtualization-ready design
 * - Full WCAG 3 compliance
 * - Clean, professional appearance
 */
const ProductsView = React.memo(({
    products,
    filters,
    setFilters,
    pagination,
    onPageChange,
    onRefresh,
    showFilters,
    setShowFilters,
    onCreate,
    onEdit,
    onDelete,
    onStockUpdate
}) => {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');

    const filteredProducts = useMemo(() => {
        if (!searchTerm) return products;

        const search = searchTerm.toLowerCase();
        return products.filter(product =>
            (product.name_ar || '').toLowerCase().includes(search) ||
            (product.sku || '').toLowerCase().includes(search) ||
            (product.category || '').toLowerCase().includes(search)
        );
    }, [products, searchTerm]);

    const handleSearch = useCallback((e) => {
        e.preventDefault();
        setFilters(prev => ({ ...prev, search: searchTerm }));
    }, [searchTerm, setFilters]);

    return (
        <div className="space-y-4" role="region" aria-label="عرض المنتجات">
            {/* Compact Header */}
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                <div className="flex items-center space-x-4 space-x-reverse">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white font-cairo">
                        المنتجات ({filteredProducts.length})
                    </h2>

                    {/* Compact Search */}
                    <form onSubmit={handleSearch} className="flex items-center space-x-2 space-x-reverse">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="البحث في المنتجات..."
                            className="arabic-input w-64 text-sm font-cairo"
                            aria-label="البحث في المنتجات"
                        />
                        <button
                            type="submit"
                            className="arabic-button-secondary p-2"
                            aria-label="بحث"
                        >
                            <Search className="w-4 h-4" aria-hidden="true" />
                        </button>
                    </form>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="arabic-button-secondary px-3 py-2 text-sm font-cairo"
                        aria-label="إظهار/إخفاء الفلاتر"
                        aria-expanded={showFilters}
                    >
                        <Filter className="w-4 h-4 mr-2" aria-hidden="true" />
                        فلاتر
                    </button>

                    <button
                        onClick={onCreate}
                        className="arabic-button-primary px-4 py-2 text-sm font-cairo"
                        aria-label="إضافة منتج جديد"
                    >
                        <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
                        منتج جديد
                    </button>
                </div>
            </div>

            {/* Compact Filters */}
            {showFilters && (
                <InventoryFilters
                    filters={filters}
                    setFilters={setFilters}
                    type="products"
                />
            )}

            {/* Compact Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map((product) => (
                    <ProductCard
                        key={product.id}
                        product={product}
                        onEdit={() => onEdit(product)}
                        onDelete={() => onDelete(product)}
                        onStockUpdate={onStockUpdate}
                    />
                ))}
            </div>

            {/* Empty State */}
            {filteredProducts.length === 0 && (
                <EmptyState
                    title="لا توجد منتجات"
                    description="لم يتم العثور على منتجات تطابق معايير البحث"
                    actionLabel="إضافة منتج جديد"
                    onAction={onCreate}
                />
            )}

            {/* Compact Pagination */}
            {pagination.total > pagination.limit && (
                <Pagination
                    currentPage={pagination.page}
                    totalPages={Math.ceil(pagination.total / pagination.limit)}
                    onPageChange={onPageChange}
                />
            )}
        </div>
    );
});

/**
 * Compact Parts View Component
 * - Similar to ProductsView but for parts
 * - Optimized performance and accessibility
 */
const PartsView = React.memo(({
    parts,
    filters,
    setFilters,
    pagination,
    onPageChange,
    onRefresh,
    showFilters,
    setShowFilters,
    onCreate,
    onEdit,
    onDelete,
    onStockUpdate
}) => {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');

    const filteredParts = useMemo(() => {
        if (!searchTerm) return parts;

        const search = searchTerm.toLowerCase();
        return parts.filter(part =>
            (part.part_name || '').toLowerCase().includes(search) ||
            (part.part_sku || '').toLowerCase().includes(search) ||
            (part.part_type || '').toLowerCase().includes(search)
        );
    }, [parts, searchTerm]);

    const handleSearch = useCallback((e) => {
        e.preventDefault();
        setFilters(prev => ({ ...prev, search: searchTerm }));
    }, [searchTerm, setFilters]);

    return (
        <div className="space-y-4" role="region" aria-label="عرض القطع">
            {/* Compact Header */}
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                <div className="flex items-center space-x-4 space-x-reverse">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white font-cairo">
                        القطع ({filteredParts.length})
                    </h2>

                    {/* Compact Search */}
                    <form onSubmit={handleSearch} className="flex items-center space-x-2 space-x-reverse">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="البحث في القطع..."
                            className="arabic-input w-64 text-sm font-cairo"
                            aria-label="البحث في القطع"
                        />
                        <button
                            type="submit"
                            className="arabic-button-secondary p-2"
                            aria-label="بحث"
                        >
                            <Search className="w-4 h-4" aria-hidden="true" />
                        </button>
                    </form>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="arabic-button-secondary px-3 py-2 text-sm font-cairo"
                        aria-label="إظهار/إخفاء الفلاتر"
                        aria-expanded={showFilters}
                    >
                        <Filter className="w-4 h-4 mr-2" aria-hidden="true" />
                        فلاتر
                    </button>

                    <button
                        onClick={onCreate}
                        className="arabic-button-primary px-4 py-2 text-sm font-cairo"
                        aria-label="إضافة قطعة جديدة"
                    >
                        <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
                        قطعة جديدة
                    </button>
                </div>
            </div>

            {/* Compact Filters */}
            {showFilters && (
                <InventoryFilters
                    filters={filters}
                    setFilters={setFilters}
                    type="parts"
                />
            )}

            {/* Compact Parts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredParts.map((part) => (
                    <PartCard
                        key={part.id}
                        part={part}
                        onEdit={() => onEdit(part)}
                        onDelete={() => onDelete(part)}
                        onStockUpdate={onStockUpdate}
                    />
                ))}
            </div>

            {/* Empty State */}
            {filteredParts.length === 0 && (
                <EmptyState
                    title="لا توجد قطع"
                    description="لم يتم العثور على قطع تطابق معايير البحث"
                    actionLabel="إضافة قطعة جديدة"
                    onAction={onCreate}
                />
            )}

            {/* Compact Pagination */}
            {pagination.total > pagination.limit && (
                <Pagination
                    currentPage={pagination.page}
                    totalPages={Math.ceil(pagination.total / pagination.limit)}
                    onPageChange={onPageChange}
                />
            )}
        </div>
    );
});

/**
 * Compact Product Card Component
 * - Optimized for performance
 * - Full WCAG 3 compliance
 * - Clean, professional design with stock management
 */
const ProductCard = React.memo(({ product, onEdit, onDelete, onStockUpdate }) => {
    const [showStockUpdate, setShowStockUpdate] = useState(false);
    const [newStock, setNewStock] = useState(product.current_stock || 0);
    const [updating, setUpdating] = useState(false);

    const handleStockUpdate = async () => {
        if (newStock === product.current_stock) {
            setShowStockUpdate(false);
            return;
        }

        setUpdating(true);
        try {
            await onStockUpdate(product.id, newStock, 'product');
            setShowStockUpdate(false);
        } catch (error) {
            console.error('Failed to update stock:', error);
        } finally {
            setUpdating(false);
        }
    };

    const status = getItemStatus(product);
    const statusColor = getStatusColor(status);
    const statusLabel = getStatusLabel(status);

    return (
        <div className="arabic-card p-4 hover:shadow-md transition-shadow" role="article" aria-label={`منتج: ${product.name_ar || product.name_en || 'غير محدد'}`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm font-cairo truncate">
                        {product.name_ar || product.name_en || 'اسم غير محدد'}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-cairo">
                        SKU: {product.sku || 'غير محدد'}
                    </p>
                </div>

                <div className="flex items-center space-x-1 space-x-reverse">
                    <button
                        onClick={() => setShowStockUpdate(!showStockUpdate)}
                        className="p-1 text-brand-blue-400 hover:text-brand-blue-600 dark:hover:text-brand-blue-300"
                        title="تحديث المخزون"
                        aria-label="تحديث المخزون"
                        disabled={updating}
                    >
                        <TrendingUp className="w-4 h-4" aria-hidden="true" />
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setShowStockUpdate(!showStockUpdate)}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            title="المزيد من الخيارات"
                            aria-label="المزيد من الخيارات"
                            aria-haspopup="true"
                            aria-expanded={false}
                        >
                            <MoreVertical className="w-4 h-4" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400 font-cairo">الفئة:</span>
                    <span className="font-medium text-gray-900 dark:text-white font-cairo">
                        {product.category || 'غير محدد'}
                    </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400 font-cairo">الحالة:</span>
                    <span className={`font-medium text-xs px-2 py-1 rounded-full ${statusColor} font-cairo`}>
                        {statusLabel}
                    </span>
                </div>
            </div>

            {/* Stock Management Section */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 font-cairo">إدارة المخزون:</span>
                    <button
                        onClick={() => setShowStockUpdate(!showStockUpdate)}
                        className="text-xs text-brand-blue-600 hover:text-brand-blue-700 font-cairo"
                        disabled={updating}
                        aria-label={showStockUpdate ? 'إلغاء تحديث المخزون' : 'تعديل المخزون'}
                    >
                        {showStockUpdate ? 'إلغاء' : 'تعديل'}
                    </button>
                </div>

                {showStockUpdate ? (
                    <div className="space-y-2">
                        <div className="flex items-center space-x-2 space-x-reverse">
                            <input
                                type="number"
                                value={newStock}
                                onChange={(e) => setNewStock(parseInt(e.target.value) || 0)}
                                className="arabic-input w-20 text-center text-sm font-cairo"
                                min="0"
                                disabled={updating}
                                aria-label="كمية المخزون الجديدة"
                            />
                            <button
                                onClick={handleStockUpdate}
                                disabled={updating}
                                className="px-2 py-1 bg-brand-blue-500 text-white text-xs rounded hover:bg-brand-blue-600 font-cairo disabled:opacity-50"
                                aria-label="حفظ المخزون الجديد"
                            >
                                {updating ? 'جاري...' : 'حفظ'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400 font-cairo">المخزون:</span>
                        <span className={`font-medium text-sm font-cairo ${statusColor}`}>
                            {product.current_stock || 0}
                        </span>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                <button
                    onClick={() => onEdit(product)}
                    className="text-xs text-brand-blue-600 hover:text-brand-blue-700 font-cairo"
                    aria-label="تعديل المنتج"
                >
                    تعديل
                </button>

                <button
                    onClick={() => onDelete(product)}
                    className="text-xs text-red-600 hover:text-red-700 font-cairo"
                    aria-label="حذف المنتج"
                >
                    حذف
                </button>
            </div>
        </div>
    );
});

/**
 * Compact Part Card Component
 * - Similar to ProductCard but for parts
 * - Optimized performance and accessibility
 */
const PartCard = React.memo(({ part, onEdit, onDelete, onStockUpdate }) => {
    const [showStockUpdate, setShowStockUpdate] = useState(false);
    const [newStock, setNewStock] = useState(part.current_stock || 0);
    const [updating, setUpdating] = useState(false);

    const handleStockUpdate = async () => {
        if (newStock === part.current_stock) {
            setShowStockUpdate(false);
            return;
        }

        setUpdating(true);
        try {
            await onStockUpdate(part.id, newStock, 'part');
            setShowStockUpdate(false);
        } catch (error) {
            console.error('Failed to update stock:', error);
        } finally {
            setUpdating(false);
        }
    };

    const status = getItemStatus(part);
    const statusColor = getStatusColor(status);
    const statusLabel = getStatusLabel(status);

    return (
        <div className="arabic-card p-4 hover:shadow-md transition-shadow" role="article" aria-label={`قطعة: ${part.part_name || 'غير محدد'}`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm font-cairo truncate">
                        {part.part_name || 'اسم غير محدد'}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-cairo">
                        SKU: {part.part_sku || 'غير محدد'}
                    </p>
                </div>

                <div className="flex items-center space-x-1 space-x-reverse">
                    <button
                        onClick={() => setShowStockUpdate(!showStockUpdate)}
                        className="p-1 text-brand-blue-400 hover:text-brand-blue-600 dark:hover:text-brand-blue-300"
                        title="تحديث المخزون"
                        aria-label="تحديث المخزون"
                        disabled={updating}
                    >
                        <TrendingUp className="w-4 h-4" aria-hidden="true" />
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setShowStockUpdate(!showStockUpdate)}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            title="المزيد من الخيارات"
                            aria-label="المزيد من الخيارات"
                            aria-haspopup="true"
                            aria-expanded={false}
                        >
                            <MoreVertical className="w-4 h-4" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400 font-cairo">النوع:</span>
                    <span className="font-medium text-gray-900 dark:text-white font-cairo">
                        {part.part_type || 'غير محدد'}
                    </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400 font-cairo">الحالة:</span>
                    <span className={`font-medium text-xs px-2 py-1 rounded-full ${statusColor} font-cairo`}>
                        {statusLabel}
                    </span>
                </div>
            </div>

            {/* Stock Management Section */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 font-cairo">إدارة المخزون:</span>
                    <button
                        onClick={() => setShowStockUpdate(!showStockUpdate)}
                        className="text-xs text-brand-blue-600 hover:text-brand-blue-700 font-cairo"
                        disabled={updating}
                        aria-label={showStockUpdate ? 'إلغاء تحديث المخزون' : 'تعديل المخزون'}
                    >
                        {showStockUpdate ? 'إلغاء' : 'تعديل'}
                    </button>
                </div>

                {showStockUpdate ? (
                    <div className="space-y-2">
                        <div className="flex items-center space-x-2 space-x-reverse">
                            <input
                                type="number"
                                value={newStock}
                                onChange={(e) => setNewStock(parseInt(e.target.value) || 0)}
                                className="arabic-input w-20 text-center text-sm font-cairo"
                                min="0"
                                disabled={updating}
                                aria-label="كمية المخزون الجديدة"
                            />
                            <button
                                onClick={handleStockUpdate}
                                disabled={updating}
                                className="px-2 py-1 bg-brand-blue-500 text-white text-xs rounded hover:bg-brand-blue-600 font-cairo disabled:opacity-50"
                                aria-label="حفظ المخزون الجديد"
                            >
                                {updating ? 'جاري...' : 'حفظ'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400 font-cairo">المخزون:</span>
                        <span className={`font-medium text-sm font-cairo ${statusColor}`}>
                            {part.current_stock || 0}
                        </span>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                <button
                    onClick={() => onEdit(part)}
                    className="text-xs text-brand-blue-600 hover:text-brand-blue-700 font-cairo"
                    aria-label="تعديل القطعة"
                >
                    تعديل
                </button>

                <button
                    onClick={() => onDelete(part)}
                    className="text-xs text-red-600 hover:text-red-700 font-cairo"
                    aria-label="حذف القطعة"
                >
                    حذف
                </button>
            </div>
        </div>
    );
});

/**
 * Compact Inventory Filters Component
 * - Optimized for performance
 * - Accessible design
 */
const InventoryFilters = React.memo(({ filters, setFilters, type }) => {
    const handleFilterChange = useCallback((key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    }, [setFilters]);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm" role="region" aria-label="فلاتر البحث">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {type === 'products' && (
                    <div>
                        <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-cairo">
                            فئة المنتج
                        </label>
                        <select
                            id="category-filter"
                            value={filters.category}
                            onChange={(e) => handleFilterChange('category', e.target.value)}
                            className="arabic-input w-full text-sm font-cairo"
                            aria-label="اختر فئة المنتج"
                        >
                            <option value="all">جميع الفئات</option>
                            <option value="electronics">إلكترونيات</option>
                            <option value="mechanical">ميكانيكية</option>
                            <option value="software">برمجيات</option>
                        </select>
                    </div>
                )}

                {type === 'parts' && (
                    <div>
                        <label htmlFor="part-type-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-cairo">
                            نوع القطعة
                        </label>
                        <select
                            id="part-type-filter"
                            value={filters.part_type}
                            onChange={(e) => handleFilterChange('part_type', e.target.value)}
                            className="arabic-input w-full text-sm font-cairo"
                            aria-label="اختر نوع القطعة"
                        >
                            <option value="all">جميع الأنواع</option>
                            <option value="hardware">أجهزة</option>
                            <option value="software">برمجيات</option>
                            <option value="consumable">مستهلكات</option>
                        </select>
                    </div>
                )}

                <div>
                    <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-cairo">
                        الحالة
                    </label>
                    <select
                        id="status-filter"
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="arabic-input w-full text-sm font-cairo"
                        aria-label="اختر حالة العنصر"
                    >
                        <option value="all">جميع الحالات</option>
                        <option value="active">نشط</option>
                        <option value="low_stock">مخزون منخفض</option>
                        <option value="out_of_stock">نفذ المخزون</option>
                        <option value="inactive">غير نشط</option>
                    </select>
                </div>

                <div>
                    <label htmlFor="search-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-cairo">
                        البحث
                    </label>
                    <input
                        type="text"
                        id="search-filter"
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        placeholder="البحث في الأسماء أو SKU..."
                        className="arabic-input w-full text-sm font-cairo"
                        aria-label="البحث في الأسماء أو SKU"
                    />
                </div>
            </div>
        </div>
    );
});

/**
 * Compact Empty State Component
 * - Accessible design
 * - Clean, professional appearance
 */
const EmptyState = React.memo(({ title, description, actionLabel, onAction }) => (
    <div className="text-center py-12" role="status" aria-live="polite">
        <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <Package className="w-12 h-12 text-gray-400 dark:text-gray-500" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2 font-cairo">
            {title}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6 font-cairo">
            {description}
        </p>
        {onAction && (
            <button
                onClick={onAction}
                className="arabic-button-primary px-6 py-3 font-cairo"
                aria-label={actionLabel}
            >
                {actionLabel}
            </button>
        )}
    </div>
));

/**
 * Compact Pagination Component
 * - Accessible design
 * - Optimized performance
 */
const Pagination = React.memo(({ currentPage, totalPages, onPageChange }) => {
    const pages = useMemo(() => {
        const pageNumbers = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pageNumbers.push(i);
            }
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) {
                    pageNumbers.push(i);
                }
                pageNumbers.push('...');
                pageNumbers.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pageNumbers.push(1);
                pageNumbers.push('...');
                for (let i = totalPages - 3; i <= totalPages; i++) {
                    pageNumbers.push(i);
                }
            } else {
                pageNumbers.push(1);
                pageNumbers.push('...');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                    pageNumbers.push(i);
                }
                pageNumbers.push('...');
                pageNumbers.push(totalPages);
            }
        }

        return pageNumbers;
    }, [currentPage, totalPages]);

    return (
        <nav className="flex items-center justify-center space-x-1 space-x-reverse" role="navigation" aria-label="التنقل بين الصفحات">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-cairo"
                aria-label="الصفحة السابقة"
            >
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>

            {pages.map((page, index) => (
                <button
                    key={index}
                    onClick={() => typeof page === 'number' && onPageChange(page)}
                    disabled={page === '...'}
                    className={`p-2 text-sm font-medium rounded-lg font-cairo ${page === currentPage
                        ? 'bg-brand-blue-500 text-white'
                        : page === '...'
                            ? 'text-gray-400 cursor-default'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                    aria-label={page === '...' ? 'صفحات إضافية' : `الصفحة ${page}`}
                    aria-current={page === currentPage ? 'page' : undefined}
                >
                    {page}
                </button>
            ))}

            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-cairo"
                aria-label="الصفحة التالية"
            >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
        </nav>
    );
});

/**
 * Compact Loading Skeleton Component
 * - Optimized for performance
 * - Accessible design
 */
const InventoryDashboardSkeleton = React.memo(() => (
    <div className="space-y-4" role="status" aria-live="polite" aria-label="جاري تحميل البيانات">
        {/* Header Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
                </div>
                <div className="flex space-x-2 space-x-reverse">
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                </div>
            </div>
        </div>

        {/* Metrics Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-8"></div>
                        <div className="space-y-2">
                            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="space-y-2">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                            </div>
                            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-6"></div>
                        </div>
                        <div className="space-y-2">
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                        </div>
                        <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="flex justify-between">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
));

/**
 * Utility Components
 */
const SyncStatus = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
);






/**
 * Utility Functions (moved from main component)
 */
const getItemStatus = (item) => {
    if (!item.is_active) return 'inactive';
    if (item.current_stock <= 0) return 'out_of_stock';
    if (item.current_stock <= (item.min_stock_level || item.alert_quantity || 5)) return 'low_stock';
    return 'active';
};

const getStatusColor = (status) => {
    const colors = {
        'active': 'text-green-600 dark:text-green-400',
        'low_stock': 'text-amber-600 dark:text-amber-400',
        'out_of_stock': 'text-red-600 dark:text-red-400',
        'inactive': 'text-gray-600 dark:text-gray-400'
    };
    return colors[status] || colors.active;
};

const getStatusLabel = (status) => {
    const labels = {
        'active': 'متوفر',
        'low_stock': 'مخزون منخفض',
        'out_of_stock': 'نفذ المخزون',
        'inactive': 'غير نشط'
    };
    return labels[status] || labels.active;
};

export default StockManagementDashboard;