import { useState, useCallback, useRef } from 'react';
import { orderAPI } from '../api/orderAPI';

/**
 * Custom hook for managing order API operations
 * Provides optimized data fetching with caching and error handling
 */
export const useOrderAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orders, setOrders] = useState({
    received: [],
    inMaintenance: [],
    completed: [],
    failed: [],
    returns: [],
    sending: []
  });
  const [summary, setSummary] = useState({
    received: 0,
    in_maintenance: 0,
    completed: 0,
    failed: 0,
    sending: 0,
    returned: 0,
    total: 0
  });
  const [recentScans, setRecentScans] = useState([]);
  
  // Ref for tracking active requests to prevent race conditions
  const activeRequests = useRef(new Set());
  
  // Clear error after timeout
  const clearError = useCallback(() => {
    setTimeout(() => setError(null), 5000);
  }, []);
  
  // Generic API call wrapper with error handling
  const apiCall = useCallback(async (apiFunction, requestId = null) => {
    if (requestId && activeRequests.current.has(requestId)) {
      return { success: false, message: 'Request already in progress' };
    }
    
    if (requestId) {
      activeRequests.current.add(requestId);
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiFunction();
      return result;
    } catch (err) {
      const errorMessage = err.message || 'خطأ في الاتصال بالخادم';
      setError(errorMessage);
      clearError();
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
      if (requestId) {
        activeRequests.current.delete(requestId);
      }
    }
  }, [clearError]);
  
  // Load orders by status with optimized caching
  const loadOrdersByStatus = useCallback(async (status) => {
    if (!status) return { success: false, message: 'Status is required' };
    
    const requestId = `load_orders_${status}`;
    const result = await apiCall(
      () => orderAPI.getOrdersByStatus(status),
      requestId
    );
    
    if (result.success) {
      const transformedOrders = result.data.orders.map(order => 
        orderAPI.transformBackendOrder(order)
      );
      
      // Map backend status to frontend state key
      const statusMap = {
        'in_maintenance': 'inMaintenance',
        'returned': 'returns'
      };
      const stateKey = statusMap[status] || status;
      
      setOrders(prev => ({
        ...prev,
        [stateKey]: transformedOrders
      }));
    }
    
    return result;
  }, [apiCall]);
  
  // Load orders summary
  const loadOrdersSummary = useCallback(async () => {
    const result = await apiCall(() => orderAPI.getOrdersSummary());
    
    if (result.success) {
      setSummary(result.data);
    }
    
    return result;
  }, [apiCall]);
  
  // Load recent scans
  const loadRecentScans = useCallback(async (limit = 10) => {
    const result = await apiCall(() => orderAPI.getRecentScans(limit));
    
    if (result.success) {
      setRecentScans(result.data);
    }
    
    return result;
  }, [apiCall]);
  
  // Scan order
  const scanOrder = useCallback(async (trackingNumber, userName = 'فني الصيانة') => {
    const requestId = `scan_order_${trackingNumber}`;
    return await apiCall(
      () => orderAPI.scanOrder(trackingNumber, userName),
      requestId
    );
  }, [apiCall]);
  
  // Perform order action
  const performOrderAction = useCallback(async (orderId, action, notes = '', userName = 'فني الصيانة', actionData = {}) => {
    const requestId = `action_${orderId}_${action}`;
    const result = await apiCall(
      () => orderAPI.performOrderAction(orderId, action, notes, userName, actionData),
      requestId
    );
    
    // Clear cache after action to ensure fresh data
    if (result.success) {
      orderAPI.clearCache();
    }
    
    return result;
  }, [apiCall]);
  
  // Search orders
  const searchOrders = useCallback(async (query, status = null) => {
    const requestId = `search_${query}_${status || 'all'}`;
    return await apiCall(
      () => orderAPI.searchOrders(query, status),
      requestId
    );
  }, [apiCall]);
  
  // Get order by tracking
  const getOrderByTracking = useCallback(async (trackingNumber) => {
    const requestId = `get_order_${trackingNumber}`;
    return await apiCall(
      () => orderAPI.getOrderByTracking(trackingNumber),
      requestId
    );
  }, [apiCall]);
  
  // Refresh all data for a specific tab
  const refreshTabData = useCallback(async (activeTab) => {
    const status = activeTab === 'inMaintenance' ? 'in_maintenance' : activeTab;
    
    try {
      // Load orders and summary in parallel
      const [ordersResult, summaryResult] = await Promise.allSettled([
        loadOrdersByStatus(status),
        loadOrdersSummary()
      ]);
      
      // Handle any errors
      if (ordersResult.status === 'rejected') {
        console.error('Failed to refresh orders:', ordersResult.reason);
      }
      if (summaryResult.status === 'rejected') {
        console.error('Failed to refresh summary:', summaryResult.reason);
      }
      
      return {
        ordersSuccess: ordersResult.status === 'fulfilled',
        summarySuccess: summaryResult.status === 'fulfilled'
      };
    } catch (error) {
      console.error('Error refreshing tab data:', error);
      return { ordersSuccess: false, summarySuccess: false };
    }
  }, [loadOrdersByStatus, loadOrdersSummary]);
  
  // Clear all data
  const clearData = useCallback(() => {
    setOrders({
      received: [],
      inMaintenance: [],
      completed: [],
      failed: [],
      returns: [],
      sending: []
    });
    setSummary({
      received: 0,
      in_maintenance: 0,
      completed: 0,
      failed: 0,
      sending: 0,
      returned: 0,
      total: 0
    });
    setRecentScans([]);
    setError(null);
  }, []);
  
  // Get cache statistics
  const getCacheStats = useCallback(() => {
    return orderAPI.getCacheStats();
  }, []);
  
  return {
    // State
    loading,
    error,
    orders,
    summary,
    recentScans,
    
    // Actions
    loadOrdersByStatus,
    loadOrdersSummary,
    loadRecentScans,
    scanOrder,
    performOrderAction,
    searchOrders,
    getOrderByTracking,
    refreshTabData,
    clearData,
    getCacheStats,
    
    // Utilities
    clearError: () => setError(null)
  };
}; 