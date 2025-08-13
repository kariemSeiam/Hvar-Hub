import React, { useState } from 'react';

const DateFilter = ({ 
  onFilterChange, 
  className = '',
  ...props 
}) => {
  const [selectedFilter, setSelectedFilter] = useState('today');
  const [customDate, setCustomDate] = useState('');

  const quickFilters = [
    { id: 'today', label: 'اليوم', value: 'today' },
    { id: 'yesterday', label: 'أمس', value: 'yesterday' },
    { id: 'week', label: 'هذا الأسبوع', value: 'week' },
    { id: 'month', label: 'هذا الشهر', value: 'month' },
    { id: 'custom', label: 'تاريخ مخصص', value: 'custom' }
  ];

  const handleFilterChange = (filterId) => {
    setSelectedFilter(filterId);
    onFilterChange?.(filterId);
  };

  const handleCustomDateChange = (date) => {
    setCustomDate(date);
    if (date) {
      onFilterChange?.('custom', date);
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`} {...props}>
      <h3 className="text-lg font-cairo font-semibold text-gray-900 mb-4 text-right">
        تصفية حسب التاريخ
      </h3>

      {/* Quick Filters */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
          فلاتر سريعة
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {quickFilters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => handleFilterChange(filter.id)}
              className={`px-3 py-2 text-sm font-cairo rounded-md transition-colors ${
                selectedFilter === filter.id
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date */}
      {selectedFilter === 'custom' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
            اختر تاريخ مخصص
          </label>
          <input
            type="date"
            value={customDate}
            onChange={(e) => handleCustomDateChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-cairo text-right"
            dir="rtl"
          />
        </div>
      )}

      {/* Date Range (Optional) */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
          نطاق التاريخ (اختياري)
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1 text-right">من تاريخ</label>
            <input
              type="date"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-cairo text-right"
              dir="rtl"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1 text-right">إلى تاريخ</label>
            <input
              type="date"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-cairo text-right"
              dir="rtl"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3 space-x-reverse">
        <button
          onClick={() => onFilterChange?.('clear')}
          className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-cairo"
        >
          مسح الفلتر
        </button>
        <button
          onClick={() => onFilterChange?.(selectedFilter)}
          className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-cairo"
        >
          تطبيق الفلتر
        </button>
      </div>
    </div>
  );
};

export default DateFilter; 