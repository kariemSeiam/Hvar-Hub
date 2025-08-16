import React, { useMemo } from 'react';

const ServiceActionTabNavigation = ({
    activeTab = 'all',
    onTabChange,
    statusCounts = {},
    className = '',
    showCounts = true,
    ...props
}) => {
    // Tab configuration following existing patterns - using actual backend enum values
    const tabs = useMemo(() => [
        {
            id: 'all',
            label: 'الكل',
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
            ),
            count: Object.values(statusCounts).reduce((sum, count) => sum + count, 0),
            color: 'blue'
        },
        {
            id: 'created',
            label: 'تم الإنشاء',
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
            ),
            count: statusCounts.created || 0,
            color: 'indigo'
        },
        {
            id: 'confirmed',
            label: 'مؤكد',
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            count: statusCounts.confirmed || 0,
            color: 'blue'
        },
        {
            id: 'pending_receive',
            label: 'في انتظار الاستلام',
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            count: statusCounts.pending_receive || 0,
            color: 'amber'
        },
        {
            id: 'completed',
            label: 'مكتمل',
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            count: statusCounts.completed || 0,
            color: 'green'
        },
        {
            id: 'failed',
            label: 'فاشل',
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            count: statusCounts.failed || 0,
            color: 'red'
        },
        {
            id: 'cancelled',
            label: 'ملغي',
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            ),
            count: statusCounts.cancelled || 0,
            color: 'gray'
        }
    ], [statusCounts]);

    // Get tab color classes
    const getTabColorClasses = (tab, isActive) => {
        const colorMap = {
            blue: {
                active: 'bg-brand-blue-500 border-brand-blue-500 text-white shadow-brand-blue-200',
                inactive: 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-brand-blue-300 hover:text-brand-blue-600'
            },
            indigo: {
                active: 'bg-indigo-500 border-indigo-500 text-white shadow-indigo-200',
                inactive: 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-indigo-300 hover:text-indigo-600'
            },
            amber: {
                active: 'bg-amber-500 border-amber-500 text-white shadow-amber-200',
                inactive: 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-amber-300 hover:text-amber-600'
            },
            green: {
                active: 'bg-green-500 border-green-500 text-white shadow-green-200',
                inactive: 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-green-300 hover:text-green-600'
            },
            red: {
                active: 'bg-red-500 border-red-500 text-white shadow-red-200',
                inactive: 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-red-300 hover:text-red-600'
            },
            gray: {
                active: 'bg-gray-500 border-gray-500 text-white shadow-gray-200',
                inactive: 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-300 hover:text-gray-600'
            }
        };

        return colorMap[tab.color]?.[isActive ? 'active' : 'inactive'] || colorMap.blue[isActive ? 'active' : 'inactive'];
    };

    // Get count badge classes
    const getCountBadgeClasses = (tab, isActive) => {
        if (isActive) {
            return 'bg-white/20 text-white';
        }

        const colorMap = {
            blue: 'bg-brand-blue-100 text-brand-blue-700',
            indigo: 'bg-indigo-100 text-indigo-700',
            amber: 'bg-amber-100 text-amber-700',
            green: 'bg-green-100 text-green-700',
            red: 'bg-red-100 text-red-700',
            gray: 'bg-gray-100 text-gray-700'
        };

        return colorMap[tab.color] || colorMap.blue;
    };

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-2 ${className}`} {...props}>
            <div className="flex flex-wrap items-center gap-2">
                {/* Tab Header */}
                <div className="flex items-center space-x-2 space-x-reverse px-3 py-2 text-sm font-cairo font-semibold text-gray-700 dark:text-gray-300">
                    <svg className="w-5 h-5 text-brand-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a1.994 1.994 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span>إجراءات الخدمة:</span>
                </div>

                {/* Tab Buttons */}
                <div className="flex flex-wrap items-center gap-1">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange?.(tab.id)}
                                className={`
                  flex items-center space-x-2 space-x-reverse px-4 py-2.5 rounded-lg font-cairo text-sm font-medium
                  border-2 transition-all duration-200 hover:scale-105 hover:shadow-lg
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue-500
                  min-w-max
                  ${getTabColorClasses(tab, isActive)}
                  ${isActive ? 'shadow-lg transform scale-105' : 'bg-white dark:bg-gray-800'}
                `}
                                aria-label={`عرض ${tab.label}${showCounts && tab.count > 0 ? ` (${tab.count})` : ''}`}
                                role="tab"
                                aria-selected={isActive}
                            >
                                {/* Icon */}
                                <span className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                                    {tab.icon}
                                </span>

                                {/* Label */}
                                <span className="font-cairo whitespace-nowrap">{tab.label}</span>

                                {/* Count Badge */}
                                {showCounts && tab.count > 0 && (
                                    <span className={`
                    px-2 py-1 rounded-full text-xs font-cairo font-bold min-w-[20px] h-5 flex items-center justify-center
                    transition-all duration-200
                    ${getCountBadgeClasses(tab, isActive)}
                  `}>
                                        {tab.count > 999 ? '999+' : tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Summary */}
                <div className="mr-auto flex items-center space-x-2 space-x-reverse px-3 py-2 text-xs font-cairo text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span>إجمالي: {Object.values(statusCounts).reduce((sum, count) => sum + count, 0)}</span>
                </div>
            </div>

            {/* Active Tab Indicator */}
            <div className="mt-3 px-3">
                <div className="text-xs font-cairo text-gray-600 dark:text-gray-400">
                    <span className="font-medium">التبويب النشط:</span> {tabs.find(t => t.id === activeTab)?.label || 'غير محدد'}
                    {showCounts && (
                        <span className="mr-2">
                            ({tabs.find(t => t.id === activeTab)?.count || 0} عنصر)
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default React.memo(ServiceActionTabNavigation);