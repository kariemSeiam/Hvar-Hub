import axios from './axios';

// Backend API Configuration
const API_BASE_URL = 'http://127.0.0.1:5000/api';

// Create backend API instance
const backendApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 10000
});

// API Functions for Order Management
export const orderAPI = {
  /**
   * Scan order by tracking number
   * @param {string} trackingNumber - The tracking number to scan
   * @param {string} userName - User performing the scan
   * @returns {Promise} Promise with order data
   */
  async scanOrder(trackingNumber, userName = 'فني الصيانة') {
    try {
      const response = await backendApi.post('/orders/scan', {
        tracking_number: trackingNumber,
        user_name: userName,
        force_create: false
      });
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error scanning order:', error);
      
      // Provide specific error messages based on status code
      let errorMessage = 'فشل في جلب البيانات من الخادم';
      
      if (error.response) {
        const status = error.response.status;
        const serverMessage = error.response.data?.message;
        
        switch (status) {
          case 400:
            errorMessage = serverMessage || 'بيانات الطلب غير صحيحة';
            break;
          case 404:
            errorMessage = serverMessage || 'لم يتم العثور على الطلب في بوسطة';
            break;
          case 401:
            errorMessage = 'خطأ في المصادقة - تحقق من إعدادات API';
            break;
          case 500:
            errorMessage = serverMessage || 'خطأ في الخادم - يرجى المحاولة مرة أخرى';
            break;
          default:
            errorMessage = serverMessage || `خطأ في الخادم: ${status}`;
        }
      } else if (error.code === 'NETWORK_ERROR' || error.code === 'ERR_NETWORK') {
        errorMessage = 'خطأ في الاتصال بالشبكة - تحقق من اتصالك بالإنترنت';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'انتهت مهلة الاتصال - يرجى المحاولة مرة أخرى';
      }
      
      return {
        success: false,
        data: null,
        message: errorMessage,
        error: error.response?.status || 'NETWORK_ERROR'
      };
    }
  },

  /**
   * Get orders by status with pagination
   * @param {string} status - Order status filter
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise} Promise with orders data
   */
  async getOrdersByStatus(status, page = 1, limit = 20) {
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const response = await backendApi.get(`/orders?${params}`);
      return {
        success: true,
        data: response.data.data,
        message: 'تم جلب البيانات بنجاح'
      };
    } catch (error) {
      console.error('Error fetching orders:', error);
      return {
        success: false,
        data: { orders: [], pagination: {} },
        message: error.response?.data?.message || 'فشل في جلب البيانات'
      };
    }
  },

  /**
   * Perform action on order
   * @param {number} orderId - Order ID
   * @param {string} action - Action type
   * @param {string} notes - Action notes
   * @param {string} userName - User performing action
   * @param {Object} actionData - Additional action data
   * @returns {Promise} Promise with updated order
   */
  async performOrderAction(orderId, action, notes = '', userName = 'فني الصيانة', actionData = {}) {
    try {
      const response = await backendApi.post(`/orders/${orderId}/action`, {
        action,
        notes,
        user_name: userName,
        action_data: actionData
      });
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error performing action:', error);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || 'فشل في تحديث الطلب'
      };
    }
  },

  /**
   * Get orders summary (dashboard counts)
   * @returns {Promise} Promise with summary data
   */
  async getOrdersSummary() {
    try {
      const response = await backendApi.get('/orders/summary');
      return {
        success: true,
        data: response.data.data,
        message: 'تم جلب الملخص بنجاح'
      };
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
        message: 'فشل في جلب الملخص'
      };
    }
  },

  /**
   * Get recent scans
   * @param {number} limit - Number of recent scans to fetch
   * @returns {Promise} Promise with recent scans
   */
  async getRecentScans(limit = 10) {
    try {
      const response = await backendApi.get(`/orders/recent-scans?limit=${limit}`);
      return {
        success: true,
        data: response.data.data,
        message: 'تم جلب البيانات بنجاح'
      };
    } catch (error) {
      console.error('Error fetching recent scans:', error);
      return {
        success: false,
        data: [],
        message: 'فشل في جلب البيانات'
      };
    }
  },

  /**
   * Search orders
   * @param {string} query - Search query
   * @param {string} status - Optional status filter
   * @returns {Promise} Promise with search results
   */
  async searchOrders(query, status = null) {
    try {
      const params = new URLSearchParams();
      params.append('search', query);
      if (status) params.append('status', status);

      const response = await backendApi.get(`/orders?${params}`);
      return {
        success: true,
        data: response.data.data,
        message: 'تم البحث بنجاح'
      };
    } catch (error) {
      console.error('Error searching orders:', error);
      return {
        success: false,
        data: { orders: [] },
        message: 'فشل في البحث'
      };
    }
  },

  /**
   * Get order by tracking number
   * @param {string} trackingNumber - Tracking number
   * @returns {Promise} Promise with order data
   */
  async getOrderByTracking(trackingNumber) {
    try {
      const response = await backendApi.get(`/orders/tracking/${trackingNumber}`);
      return {
        success: true,
        data: response.data.data,
        message: 'تم العثور على الطلب'
      };
    } catch (error) {
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
        message: 'خطأ في البحث عن الطلب'
      };
    }
  },

  /**
   * Transform backend order to frontend format
   * @param {Object} backendOrder - Order from backend
   * @returns {Object} Transformed order for frontend
   */
  transformBackendOrder(backendOrder) {
    if (!backendOrder) return null;

    return {
      _id: backendOrder.id,
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
        value: this.mapBackendStatusToBostaState(backendOrder.status),
        code: this.getStatusCode(backendOrder.status),
        deliveryTime: backendOrder.updated_at
      },
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
      createdAt: backendOrder.created_at,
      scannedAt: backendOrder.scanned_at,
      status: backendOrder.status,
      isReturnOrder: backendOrder.is_return_order,
      isRefundOrReplace: backendOrder.is_refund_or_replace,
      maintenanceHistory: backendOrder.maintenance_history || [],
      newTrackingNumber: backendOrder.new_tracking_number,
      newCodAmount: backendOrder.new_cod_amount,
      bostaData: backendOrder.bosta_data || {}
    };
  },

  /**
   * Map backend status to Bosta state
   * @param {string} status - Backend status
   * @returns {string} Bosta state
   */
  mapBackendStatusToBostaState(status) {
    const statusMap = {
      'received': 'Picked Up',
      'in_maintenance': 'In Transit',
      'completed': 'Ready for Delivery',
      'failed': 'Failed',
      'sending': 'Out for Delivery',
      'returned': 'Returned'
    };
    return statusMap[status] || status;
  },

  /**
   * Get status code for backend status
   * @param {string} status - Backend status
   * @returns {number} Status code
   */
  getStatusCode(status) {
    const codeMap = {
      'received': 23,
      'in_maintenance': 30,
      'completed': 40,
      'failed': 60,
      'sending': 43,
      'returned': 50
    };
    return codeMap[status] || 10;
  }
};

export default orderAPI;