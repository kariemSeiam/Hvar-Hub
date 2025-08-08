import axios from './axios';
import { getCurrentConfig, FEATURES, ERROR_MESSAGES, debug } from '../config/environment';

// Backend API Configuration with caching
const API_BASE_URL = '/api';
const CACHE_DURATION = getCurrentConfig().cacheDuration;

// Simple cache implementation
const cache = new Map();

const getCacheKey = (endpoint, params = {}) => {
  const paramString = Object.keys(params).length > 0
    ? `?${new URLSearchParams(params).toString()}`
    : '';
  return `${endpoint}${paramString}`;
};

const getCachedData = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

const setCachedData = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

// Create optimized backend API instance
const backendApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 10000
});

// Enhanced error message mapping using environment config
const getErrorMessage = (error) => {
  if (error.userMessage) return error.userMessage;

  if (error.response) {
    const status = error.response.status;
    const serverMessage = error.response.data?.message;

    const statusMessages = {
      400: serverMessage || ERROR_MESSAGES.VALIDATION_ERROR,
      401: ERROR_MESSAGES.UNAUTHORIZED,
      404: serverMessage || ERROR_MESSAGES.NOT_FOUND,
      500: serverMessage || ERROR_MESSAGES.SERVER_ERROR,
      503: 'الخدمة غير متاحة مؤقتاً - يرجى المحاولة لاحقاً'
    };

    return statusMessages[status] || serverMessage || ERROR_MESSAGES.UNKNOWN_ERROR;
  }

  return ERROR_MESSAGES.NETWORK_ERROR;
};

// Optimized data transformation with memoization
const transformCache = new Map();

const transformBackendOrder = (backendOrder) => {
  if (!backendOrder) return null;

  // Check cache first
  const cacheKey = `order_${backendOrder.id}`;
  if (transformCache.has(cacheKey)) {
    return transformCache.get(cacheKey);
  }

  const transformed = {
    _id: backendOrder.id || backendOrder._id,
    trackingNumber: backendOrder.tracking_number,
    pickupAddress: {
      city: { nameAr: backendOrder.city || '' },
      zone: { nameAr: backendOrder.zone || '' },
      firstLine: backendOrder.pickup_address || ''
    },
    dropOffAddress: {
      city: { nameAr: backendOrder.city || '' },
      zone: { nameAr: backendOrder.zone || '' },
      firstLine: backendOrder.dropoff_address || '',
      buildingNumber: backendOrder.building_number || '',
      floor: backendOrder.floor || '',
      apartment: backendOrder.apartment || ''
    },
    cod: backendOrder.cod_amount || 0,
    state: {
      value: mapBackendStatusToBostaState(backendOrder.status),
      code: getStatusCode(backendOrder.status),
      deliveryTime: backendOrder.updated_at
    },
    // uiStatus is provided by backend for direct mapping to tabs when available
    uiStatus: backendOrder.ui_status || (backendOrder.status === 'in_maintenance' ? 'inMaintenance' : (backendOrder.status === 'returned' ? 'returns' : backendOrder.status)),
    returnCondition: backendOrder.return_condition || null,
    receiver: {
      fullName: backendOrder.customer_name || '',
      phone: backendOrder.customer_phone || '',
      secondPhone: backendOrder.customer_second_phone || ''
    },
    type: {
      code: 10,
      value: backendOrder.order_type || 'Send'
    },
    timeline: backendOrder.timeline_data || [],
    specs: {
      packageDetails: {
        itemsCount: backendOrder.items_count || 1,
        description: backendOrder.package_description || ''
      },
      weight: backendOrder.package_weight || 0
    },
    returnSpecs: backendOrder.return_specs_data || {
      packageDetails: {
        itemsCount: backendOrder.items_count || 1,
        description: backendOrder.package_description || ''
      }
    },
    createdAt: backendOrder.created_at,
    scannedAt: backendOrder.scanned_at,
    status: backendOrder.status,
    isReturnOrder: backendOrder.is_return_order || false,
    isRefundOrReplace: backendOrder.is_refund_or_replace || false,
    maintenanceHistory: backendOrder.maintenance_history || [],
    newTrackingNumber: backendOrder.new_tracking_number,
    newCodAmount: backendOrder.new_cod_amount,
    starProofOfReturnedPackages: backendOrder.bosta_proof_images || [],
    star: backendOrder.bosta_data?.star || {},
    bostaData: backendOrder.bosta_data || {}
  };

  // Cache the transformation
  transformCache.set(cacheKey, transformed);
  return transformed;
};

// Status mapping functions
const mapBackendStatusToBostaState = (status) => {
  const statusMap = {
    'received': 'Picked Up',
    'in_maintenance': 'In Transit',
    'completed': 'Ready for Delivery',
    'failed': 'Failed',
    'sending': 'Out for Delivery',
    'returned': 'Returned'
  };
  return statusMap[status] || status;
};

const getStatusCode = (status) => {
  const codeMap = {
    'received': 23,
    'in_maintenance': 30,
    'completed': 40,
    'failed': 60,
    'sending': 43,
    'returned': 50
  };
  return codeMap[status] || 10;
};

// API Functions for Order Management
export const orderAPI = {
  /**
   * Scan order by tracking number
   * Backend: POST /api/orders/scan
   * Response: { success, data: { order, is_existing, bosta_data }, message }
   */
  async scanOrder(trackingNumber, userName = 'فني الصيانة') {
    try {
      const response = await backendApi.post('/orders/scan', {
        tracking_number: trackingNumber,
        user_name: userName,
        force_create: false
      });

      // Backend returns: { success, data: { order, is_existing, bosta_data }, message }
      return {
        success: response.data.success,
        data: response.data.data, // Contains { order, is_existing, bosta_data }
        message: response.data.message
      };
    } catch (error) {
      console.error('Error scanning order:', error);

      return {
        success: false,
        data: null,
        message: getErrorMessage(error),
        error: error.response?.status || 'NETWORK_ERROR'
      };
    }
  },

  /**
   * Get orders by status with pagination and caching
   * Backend: GET /api/orders?status=X&page=Y&limit=Z
   * Response: { success, data: { orders, total, page, per_page } }
   */
  async getOrdersByStatus(status, page = 1, limit = 20, options = {}) {
    const params = { page, limit };
    if (status) params.status = status;
    if (status === 'returned' && options.returnCondition) {
      params.return_condition = options.returnCondition; // 'valid' | 'damaged'
    }

    const cacheKey = getCacheKey('/orders', params);
    const cached = getCachedData(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const response = await backendApi.get('/orders', { params });

      // Backend returns: { success, data: { orders, pagination } }
      const result = {
        success: response.data.success,
        data: response.data.data,
        message: 'تم جلب البيانات بنجاح'
      };

      setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching orders:', error);
      return {
        success: false,
        data: { orders: [], total: 0, page: 1, per_page: limit },
        message: getErrorMessage(error)
      };
    }
  },

  /**
   * Perform action on order
   * Backend: POST /api/orders/{orderId}/action
   * Response: { success, data: { order, history_entry }, message }
   */
  async performOrderAction(orderId, action, notes = '', userName = 'فني الصيانة', actionData = {}) {
    try {
      const response = await backendApi.post(`/orders/${orderId}/action`, {
        action,
        notes,
        user_name: userName,
        action_data: actionData
      });

      // Clear cache after action
      cache.clear();
      transformCache.clear();

      // Backend returns: { success, data: { order, history_entry }, message }
      return {
        success: response.data.success,
        data: response.data.data, // Contains { order, history_entry }
        message: response.data.message
      };
    } catch (error) {
      console.error('Error performing action:', error);
      return {
        success: false,
        data: null,
        message: getErrorMessage(error)
      };
    }
  },

  /**
   * Get orders summary (dashboard counts) with caching
   * Backend: GET /api/orders/summary
   * Response: { success, data: { received, in_maintenance, completed, failed, sending, returned, total } }
   */
  async getOrdersSummary() {
    const cacheKey = getCacheKey('/orders/summary');
    const cached = getCachedData(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const response = await backendApi.get('/orders/summary');

      // Backend returns: { success, data: { received, in_maintenance, ... } }
      const result = {
        success: response.data.success,
        data: response.data.data, // Contains summary object
        message: 'تم جلب الملخص بنجاح'
      };

      setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching summary:', error);
      return {
        success: false,
        data: {
          received: 0,
          in_maintenance: 0,
          completed: 0,
          failed: 0,
          sending: 0,
          returned: 0,
          total: 0
        },
        message: getErrorMessage(error)
      };
    }
  },

  /**
   * Get recent scans with caching
   * Backend: GET /api/orders/recent-scans?limit=X
   * Response: { success, data: [ { _id, trackingNumber, scannedAt, status, receiver, specs } ] }
   */
  async getRecentScans(limit = 10) {
    const cacheKey = getCacheKey('/orders/recent-scans', { limit });
    const cached = getCachedData(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const response = await backendApi.get(`/orders/recent-scans?limit=${limit}`);

      // Backend returns: { success, data: [ scan objects ] }
      const result = {
        success: response.data.success,
        data: response.data.data, // Array of scan objects
        message: 'تم جلب البيانات بنجاح'
      };

      setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching recent scans:', error);
      return {
        success: false,
        data: [],
        message: getErrorMessage(error)
      };
    }
  },

  /**
   * Refresh order data from Bosta via backend (updates proof image URLs, timeline, etc.)
   * Backend: POST /api/orders/refresh/{trackingNumber}
   * Response: { success, data: { order }, message }
   */
  async refreshOrderFromBosta(trackingNumber) {
    try {
      const response = await backendApi.post(`/orders/refresh/${trackingNumber}`);
      // Bust any caches for this order
      cache.clear();
      transformCache.clear();
      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message,
      };
    } catch (error) {
      console.error('Error refreshing order from Bosta:', error);
      return {
        success: false,
        data: null,
        message: getErrorMessage(error),
      };
    }
  },

  /**
   * Search orders
   * Backend: GET /api/orders?search=X&status=Y
   * Response: { success, data: { orders, total } }
   */
  async searchOrders(query, status = null) {
    const params = { search: query };
    if (status) params.status = status;

    try {
      const response = await backendApi.get('/orders', { params });

      // Backend returns: { success, data: { orders, total } }
      return {
        success: response.data.success,
        data: response.data.data, // Contains { orders, total }
        message: 'تم البحث بنجاح'
      };
    } catch (error) {
      console.error('Error searching orders:', error);
      return {
        success: false,
        data: { orders: [], total: 0 },
        message: getErrorMessage(error)
      };
    }
  },

  /**
   * Get order by tracking number
   * Backend: GET /api/orders/tracking/{trackingNumber}
   * Response: { success, data: { order, is_existing, bosta_data }, message }
   */
  async getOrderByTracking(trackingNumber) {
    try {
      const response = await backendApi.get(`/orders/tracking/${trackingNumber}`);

      // Backend returns: { success, data: { order, is_existing, bosta_data }, message }
      return {
        success: response.data.success,
        data: response.data.data, // Contains { order, is_existing, bosta_data }
        message: response.data.message
      };
    } catch (error) {
      console.error('Error fetching order by tracking:', error);

      if (error.response?.status === 404) {
        return {
          success: false,
          data: null,
          message: 'لم يتم العثور على الطلب'
        };
      }
      return {
        success: false,
        data: null,
        message: getErrorMessage(error)
      };
    }
  },

  /**
   * Transform backend order to frontend format
   * @param {Object} backendOrder - Order from backend
   * @returns {Object} Transformed order for frontend
   */
  transformBackendOrder,

  /**
   * Map backend status to Bosta state
   * @param {string} status - Backend status
   * @returns {string} Bosta state
   */
  mapBackendStatusToBostaState,

  /**
   * Get status code for backend status
   * @param {string} status - Backend status
   * @returns {number} Status code
   */
  getStatusCode,

  /**
   * Clear all caches
   */
  clearCache() {
    cache.clear();
    transformCache.clear();
  },

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      apiCacheSize: cache.size,
      transformCacheSize: transformCache.size
    };
  }
};

export default orderAPI;