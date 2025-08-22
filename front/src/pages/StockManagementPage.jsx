import React, { useState, useMemo } from 'react';
import StockManagementDashboard from '../components/stock/StockManagementDashboard';

function StockManagementPage() {
  const [activeTab, setActiveTab] = useState('products');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Enhanced Stock Management Dashboard */}
        <StockManagementDashboard />
      </div>
    </div>
  );
}

export default StockManagementPage;


