import React, { useMemo } from 'react';

const TabNavigation = ({ 
  activeTab, 
  onTabChange, 
  ordersSummary = {}, 
  isLoadingOrders = false 
}) => {
  // Memoize tabs configuration
  const tabs = useMemo(() => [
    {
      id: 'received',
      label: 'المستلمة',
      badge: ordersSummary.received?.toString() || '0',
      color: 'blue'
    },
    {
      id: 'inMaintenance',
      label: 'تحت الصيانة',
      badge: ordersSummary.in_maintenance?.toString() || '0',
      color: 'amber'
    },
    {
      id: 'failed',
      label: 'فاشلة/معلقة',
      badge: ordersSummary.failed?.toString() || '0',
      color: 'red'
    },
    {
      id: 'completed',
      label: 'مكتملة',
      badge: ordersSummary.completed?.toString() || '0',
      color: 'green'
    },
    {
      id: 'sending',
      label: 'جاري الإرسال',
      badge: ordersSummary.sending?.toString() || '0',
      color: 'purple'
    },
    {
      id: 'returns',
      label: 'المرتجعة',
      badge: ordersSummary.returned?.toString() || '0',
      color: 'gray'
    }
  ], [ordersSummary]);

  // Memoize color classes to prevent recalculation
  const getTabColorClasses = useMemo(() => {
    return (color, isActive) => {
      const colors = {
        blue: {
          active: 'bg-blue-100 text-blue-800 border-2 border-blue-300 shadow-sm',
          inactive: 'text-blue-600 hover:bg-blue-50 hover:border-blue-200 border-2 border-transparent hover:text-blue-700',
          badge: 'bg-blue-200 text-blue-900',
          badgeActive: 'bg-blue-300 text-blue-900'
        },
        amber: {
          active: 'bg-amber-100 text-amber-800 border-2 border-amber-300 shadow-sm',
          inactive: 'text-amber-600 hover:bg-amber-50 hover:border-amber-200 border-2 border-transparent hover:text-amber-700',
          badge: 'bg-amber-200 text-amber-900',
          badgeActive: 'bg-amber-300 text-amber-900'
        },
        green: {
          active: 'bg-green-100 text-green-800 border-2 border-green-300 shadow-sm',
          inactive: 'text-green-600 hover:bg-green-50 hover:border-green-200 border-2 border-transparent hover:text-green-700',
          badge: 'bg-green-200 text-green-900',
          badgeActive: 'bg-green-300 text-green-900'
        },
        red: {
          active: 'bg-red-100 text-red-800 border-2 border-red-300 shadow-sm',
          inactive: 'text-red-600 hover:bg-red-50 hover:border-red-200 border-2 border-transparent hover:text-red-700',
          badge: 'bg-red-200 text-red-900',
          badgeActive: 'bg-red-300 text-red-900'
        },
        purple: {
          active: 'bg-purple-100 text-purple-800 border-2 border-purple-300 shadow-sm',
          inactive: 'text-purple-600 hover:bg-purple-50 hover:border-purple-200 border-2 border-transparent hover:text-purple-700',
          badge: 'bg-purple-200 text-purple-900',
          badgeActive: 'bg-purple-300 text-purple-900'
        },
        gray: {
          active: 'bg-gray-100 text-gray-800 border-2 border-gray-300 shadow-sm',
          inactive: 'text-gray-600 hover:bg-gray-50 hover:border-gray-200 border-2 border-transparent hover:text-gray-700',
          badge: 'bg-gray-200 text-gray-900',
          badgeActive: 'bg-gray-300 text-gray-900'
        }
      };
      return colors[color] || colors.blue;
    };
  }, []);

  return (
    <div className="flex space-x-2 space-x-reverse">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const hasBadge = tab.badge && tab.badge !== '0';
        const colorClasses = getTabColorClasses(tab.color, isActive);

        return (
          <button
            key={tab.id}
            onClick={() => {
              if (activeTab !== tab.id) {
                onTabChange?.(tab.id);
              }
            }}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
              flex items-center space-x-2 space-x-reverse font-cairo
              ${isActive ? colorClasses.active : colorClasses.inactive}
              ${isLoadingOrders && activeTab === tab.id ? 'opacity-70' : ''}
            `}
            disabled={isLoadingOrders && activeTab === tab.id}
          >
            <span>{tab.label}</span>
            {hasBadge && (
              <span className={`
                px-2 py-0.5 rounded-full text-xs font-bold transition-colors font-cairo
                ${isActive ? colorClasses.badgeActive : colorClasses.badge}
              `}>
                {tab.badge}
              </span>
            )}
            {isLoadingOrders && activeTab === tab.id && (
              <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            )}
          </button>
        );
      })}
    </div>
  );
};

// Use React.memo for performance optimization
export default React.memo(TabNavigation);