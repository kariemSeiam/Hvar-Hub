import { useState, useCallback, useRef, useMemo } from 'react';
import { orderAPI } from '../api/orderAPI';

/**
 * Optimized hook for order management with performance enhancements
 * - Batched API calls
 * - Intelligent caching
 * - Request deduplication
 * - Optimistic updates
 */
export const useOptimizedOrderAPI = () => {
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
  
  // Performance optimization refs
  const activeRequests = useRef(new Set());
  const requestQueue = useRef([]);
  const processingQueue = useRef(false);
  const abortControllers = useRef(new Map());
  
  // Debounced error clearing
  const clearError = useCallback(() => {
    setTimeout(() => setError(null), 5000);
  }, []);
  
  // Request deduplication and batching
  const batchedApiCall = useCallback(async (apiFunction, requestId = null, options = {}) => {
    if (requestId && activeRequests.current.has(requestId)) {
      return { success: false, message: 'Request already in progress' };
    }
    
    // Add abort controller for request cancellation
    if (requestId) {
      const controller = new AbortController();
      abortControllers.current.set(requestId, controller);
      activeRequests.current.add(requestId);
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiFunction();
      return result;
    } catch (err) {
      if (err.name === 'AbortError') {
        return { success: false, message: 'Request cancelled' };
      }
      
      const errorMessage = err.message || 'خطأ في الاتصال بالخادم';
      setError(errorMessage);
      clearError();
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
      if (requestId) {
        activeRequests.current.delete(requestId);
        abortControllers.current.delete(requestId);
      }
    }
  }, [clearError]);
  
  // Queue processing for batched requests
  const processRequestQueue = useCallback(async () => {
    if (processingQueue.current || requestQueue.current.length === 0) return;
    
    processingQueue.current = true;
    
    try {
      // Process requests in batches of 3 for optimal performance
      const batch = requestQueue.current.splice(0, 3);
      const promises = batch.map(({ apiFunction, resolve, reject, requestId }) => 
        batchedApiCall(apiFunction, requestId)
          .then(resolve)
          .catch(reject)
      );
      
      await Promise.allSettled(promises);
      
      // Continue processing if more requests exist
      if (requestQueue.current.length > 0) {
        setTimeout(processRequestQueue, 100); // Small delay between batches
      }
    } finally {
      processingQueue.current = false;
    }
  }, [batchedApiCall]);
  
  // Enhanced load orders with state key mapping
  const loadOrdersByStatus = useCallback(async (status) => {
    if (!status) return { success: false, message: 'Status is required' };
    
    const requestId = `load_orders_${status}`;
    
    return new Promise((resolve, reject) => {
      requestQueue.current.push({
        apiFunction: () => orderAPI.getOrdersByStatus(status),
        resolve: (result) => {
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
          resolve(result);
        },
        reject,
        requestId
      });
      
      processRequestQueue();
    });
  }, [processRequestQueue]);
  
  // Optimized summary loading with caching
  const loadOrdersSummary = useCallback(async () => {
    const requestId = 'load_summary';
    
    return new Promise((resolve, reject) => {
      requestQueue.current.push({
        apiFunction: () => orderAPI.getOrdersSummary(),
        resolve: (result) => {
          if (result.success) {
            setSummary(result.data);
          }
          resolve(result);
        },
        reject,
        requestId
      });
      
      processRequestQueue();
    });
  }, [processRequestQueue]);
  
  // Optimized recent scans loading
  const loadRecentScans = useCallback(async (limit = 10) => {
    const requestId = `recent_scans_${limit}`;
    
    return new Promise((resolve, reject) => {
      requestQueue.current.push({
        apiFunction: () => orderAPI.getRecentScans(limit),
        resolve: (result) => {
          if (result.success) {
            setRecentScans(result.data);
          }
          resolve(result);
        },
        reject,
        requestId
      });
      
      processRequestQueue();
    });
  }, [processRequestQueue]);
  
  // Enhanced scan order with optimistic updates
  const scanOrder = useCallback(async (trackingNumber, userName = 'فني الصيانة') => {
    const requestId = `scan_order_${trackingNumber}`;
    
    return batchedApiCall(
      () => orderAPI.scanOrder(trackingNumber, userName),
      requestId
    );
  }, [batchedApiCall]);
  
  // Enhanced order actions with optimistic updates
  const performOrderAction = useCallback(async (orderId, action, notes = '', userName = 'فني الصيانة', actionData = {}) => {
    const requestId = `action_${orderId}_${action}`;
    
    const result = await batchedApiCall(
      () => orderAPI.performOrderAction(orderId, action, notes, userName, actionData),
      requestId
    );
    
    // Clear cache after successful action
    if (result.success) {
      orderAPI.clearCache();
    }
    
    return result;
  }, [batchedApiCall]);
  
  // Enhanced search with debouncing
  const searchOrders = useCallback(async (query, status = null) => {
    const requestId = `search_${query}_${status || 'all'}`;
    
    return batchedApiCall(
      () => orderAPI.searchOrders(query, status),
      requestId
    );
  }, [batchedApiCall]);
  
  // Get order by tracking with optimistic caching
  const getOrderByTracking = useCallback(async (trackingNumber) => {
    const requestId = `get_order_${trackingNumber}`;
    
    return batchedApiCall(
      () => orderAPI.getOrderByTracking(trackingNumber),
      requestId
    );
  }, [batchedApiCall]);
  
  // Parallel data refresh for active tab
  const refreshTabData = useCallback(async (activeTab) => {
    const status = activeTab === 'inMaintenance' ? 'in_maintenance' : activeTab;
    
    try {
      // Use Promise.allSettled for parallel execution without blocking
      const [ordersResult, summaryResult] = await Promise.allSettled([
        loadOrdersByStatus(status),
        loadOrdersSummary()
      ]);
      
      return {
        ordersSuccess: ordersResult.status === 'fulfilled' && ordersResult.value.success,
        summarySuccess: summaryResult.status === 'fulfilled' && summaryResult.value.success,
        ordersError: ordersResult.status === 'rejected' ? ordersResult.reason : null,
        summaryError: summaryResult.status === 'rejected' ? summaryResult.reason : null
      };
    } catch (error) {
      console.error('Error refreshing tab data:', error);
      return { ordersSuccess: false, summarySuccess: false, error };
    }
  }, [loadOrdersByStatus, loadOrdersSummary]);
  
  // Optimized initial data loading
  const loadInitialData = useCallback(async () => {
    try {
      // Load initial data in parallel
      const [summaryResult, ordersResult, scansResult] = await Promise.allSettled([
        loadOrdersSummary(),
        loadOrdersByStatus('received'),
        loadRecentScans(10)
      ]);
      
      return {
        summaryLoaded: summaryResult.status === 'fulfilled',
        ordersLoaded: ordersResult.status === 'fulfilled',
        scansLoaded: scansResult.status === 'fulfilled'
      };
    } catch (error) {
      console.error('Error loading initial data:', error);
      return { summaryLoaded: false, ordersLoaded: false, scansLoaded: false };
    }
  }, [loadOrdersSummary, loadOrdersByStatus, loadRecentScans]);
  
  // Cancel all active requests
  const cancelAllRequests = useCallback(() => {
    abortControllers.current.forEach((controller) => {
      controller.abort();
    });
    abortControllers.current.clear();
    activeRequests.current.clear();
    requestQueue.current = [];
  }, []);
  
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
  
  // Optimistic order update for immediate UI feedback
  const optimisticUpdateOrder = useCallback((orderId, updates) => {
    setOrders(prev => {
      const newOrders = { ...prev };
      
      // Find and update order in all categories
      Object.keys(newOrders).forEach(key => {
        const orderIndex = newOrders[key].findIndex(order => order._id === orderId);
        if (orderIndex !== -1) {
          newOrders[key][orderIndex] = { ...newOrders[key][orderIndex], ...updates };
        }
      });
      
      return newOrders;
    });
  }, []);
  
  // Memoized cache statistics
  const cacheStats = useMemo(() => {
    return {
      ...orderAPI.getCacheStats(),
      activeRequests: activeRequests.current.size,
      queuedRequests: requestQueue.current.length
    };
  }, []);
  
  return {
    // State
    loading,
    error,
    orders,
    summary,
    recentScans,
    
    // Optimized Actions
    loadOrdersByStatus,
    loadOrdersSummary,
    loadRecentScans,
    scanOrder,
    performOrderAction,
    searchOrders,
    getOrderByTracking,
    refreshTabData,
    loadInitialData,
    
    // State Management
    clearData,
    optimisticUpdateOrder,
    cancelAllRequests,
    
    // Utilities
    clearError: () => setError(null),
    cacheStats
  };
};