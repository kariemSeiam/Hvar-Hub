import React, { useState, useMemo } from 'react';

function StockManagementPage() {
  const [activeTab, setActiveTab] = useState('products');

  // Tab configuration with consistent styling
  const tabs = [
    {
      id: 'products',
      label: 'المنتجات',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      color: 'blue'
    },
    {
      id: 'parts',
      label: 'القطع',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: 'green'
    }
  ];

  const getTabColorClasses = (color, isActive) => {
    const colors = {
      blue: {
        active: 'bg-blue-100 text-blue-800 border-2 border-blue-300 shadow-sm dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700/60 dark:shadow-blue-900/20',
        inactive: 'text-blue-600 hover:bg-blue-50 hover:border-blue-200 border-2 border-transparent hover:text-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/20 dark:hover:border-blue-700/40'
      },
      green: {
        active: 'bg-green-100 text-green-800 border-2 border-green-300 shadow-sm dark:bg-green-900/30 dark:text-green-200 dark:border-green-700/60 dark:shadow-green-900/20',
        inactive: 'text-green-600 hover:bg-green-50 hover:border-green-200 border-2 border-transparent hover:text-green-700 dark:text-green-300 dark:hover:bg-green-900/20 dark:hover:border-green-700/40'
      }
    };
    return colors[color] || colors.blue;
  };

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
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 font-cairo-play">
                إدارة المخزون
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-cairo">
                تتبع المنتجات والقطع
              </p>
            </div>
          </div>

          {/* Center - Clean Tabs */}
          <div className="flex-1 flex justify-center space-x-2 space-x-reverse overflow-x-auto scrollbar-hide px-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const colorClasses = getTabColorClasses(tab.color, isActive);

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    flex items-center space-x-2 space-x-reverse font-cairo
                    ${isActive ? colorClasses.active : colorClasses.inactive}
                  `}
                  aria-label={`تبديل إلى ${tab.label}`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right - Status Indicator */}
          <div className="flex items-center space-x-3 space-x-reverse shrink-0">
            <div className="flex items-center space-x-2 space-x-reverse">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-xs text-gray-600 dark:text-gray-300 font-cairo">
                متصل
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {/* Analytics Cards */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Total Items Card */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-700 rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400 font-cairo mb-1">
                    إجمالي العناصر
                  </p>
                  <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 font-cairo">
                    -
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Available Items Card */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border border-green-200 dark:border-green-700 rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400 font-cairo mb-1">
                    المتوفر
                  </p>
                  <p className="text-3xl font-bold text-green-900 dark:text-green-100 font-cairo">
                    -
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* In Motion Card */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 border border-amber-200 dark:border-amber-700 rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-600 dark:text-amber-400 font-cairo mb-1">
                    قيد الحركة
                  </p>
                  <p className="text-3xl font-bold text-amber-900 dark:text-amber-100 font-cairo">
                    -
                  </p>
                </div>
                <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Content Placeholder */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 shadow-lg">
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-gray-400 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 font-cairo">
                {activeTab === 'products' ? 'إدارة المنتجات' : 'إدارة القطع'}
              </h3>
              
              <p className="text-gray-600 dark:text-gray-300 font-cairo mb-6 max-w-md mx-auto">
                {activeTab === 'products' 
                  ? 'سيتم ربط نظام إدارة المنتجات قريباً لتتبع المخزون والمبيعات'
                  : 'سيتم ربط نظام إدارة القطع قريباً لتتبع المخزون والصيانة'
                }
              </p>

              {/* Feature Preview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center space-x-3 space-x-reverse mb-2">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 font-cairo">
                      تحليلات المخزون
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-cairo">
                    تتبع مستويات المخزون والتنبيهات
                  </p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center space-x-3 space-x-reverse mb-2">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 font-cairo">
                      إدارة الطلبات
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-cairo">
                    طلبات الشراء والمبيعات
                  </p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center space-x-3 space-x-reverse mb-2">
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/40 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-600 dark:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 font-cairo">
                      تقارير مفصلة
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-cairo">
                    تقارير المخزون والأداء
                  </p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center space-x-3 space-x-reverse mb-2">
                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/40 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-orange-600 dark:text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 font-cairo">
                      تنبيهات ذكية
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-cairo">
                    تنبيهات المخزون المنخفض
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StockManagementPage;


