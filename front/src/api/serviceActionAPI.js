import axios from './axios';
import { API_ENDPOINTS, ERROR_MESSAGES } from '../config/environment';

const backend = axios.create({ baseURL: '', headers: { 'Content-Type': 'application/json' }, timeout: 10000 });

const getMessage = (error) => {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.response?.status === 401) return ERROR_MESSAGES.UNAUTHORIZED;
  if (error?.response?.status === 404) return ERROR_MESSAGES.NOT_FOUND;
  if (error?.response?.status === 500) return ERROR_MESSAGES.SERVER_ERROR;
  return ERROR_MESSAGES.NETWORK_ERROR;
};

export const serviceActionAPI = {
  async createServiceAction(payload) {
    try {
      const res = await backend.post(API_ENDPOINTS.services.create, payload);
      return { success: true, data: res.data.data, message: res.data.message };
    } catch (e) {
      return { success: false, data: null, message: getMessage(e) };
    }
  },

  async confirmServiceAction(actionId, newTrackingNumber, notes = '') {
    try {
      const res = await backend.post(API_ENDPOINTS.services.confirm(actionId), { new_tracking_number: newTrackingNumber, notes });
      return { success: true, data: res.data.data, message: res.data.message };
    } catch (e) {
      return { success: false, data: null, message: getMessage(e) };
    }
  },

  async moveToPendingReceive(actionId, notes = '') {
    try {
      const res = await backend.post(API_ENDPOINTS.services.moveToPending(actionId), { notes });
      return { success: true, data: res.data.data, message: res.data.message };
    } catch (e) {
      return { success: false, data: null, message: getMessage(e) };
    }
  },

  async completeServiceAction(actionId, notes = '') {
    try {
      const res = await backend.post(API_ENDPOINTS.services.complete(actionId), { notes });
      return { success: true, data: res.data.data, message: res.data.message };
    } catch (e) {
      return { success: false, data: null, message: getMessage(e) };
    }
  },

  async failServiceAction(actionId, notes = '') {
    try {
      const res = await backend.post(API_ENDPOINTS.services.fail(actionId), { notes });
      return { success: true, data: res.data.data, message: res.data.message };
    } catch (e) {
      return { success: false, data: null, message: getMessage(e) };
    }
  },

  async updateServiceAction(actionId, payload) {
    try {
      const res = await backend.put(API_ENDPOINTS.services.update(actionId), payload);
      return { success: true, data: res.data.data, message: res.data.message };
    } catch (e) {
      return { success: false, data: null, message: getMessage(e) };
    }
  },

  async listServiceActions(params = {}) {
    try {
      const res = await backend.get(API_ENDPOINTS.services.list, { params });
      return { success: true, data: res.data.data };
    } catch (e) {
      return { success: false, data: { actions: [], pagination: {} }, message: getMessage(e) };
    }
  },

  async listPendingServiceActions(limit = 50) {
    try {
      const res = await backend.get(`${API_ENDPOINTS.services.listPending}?limit=${limit}`);
      return { success: true, data: res.data.data };
    } catch (e) {
      return { success: false, data: [], message: getMessage(e) };
    }
  },

  async searchOrders(params = {}) {
    try {
      const res = await backend.get(API_ENDPOINTS.bostaSearch, { params });
      return { success: true, data: res.data.data };
    } catch (e) {
      return { success: false, data: { orders: [] }, message: getMessage(e) };
    }
  },

  async getOrder(orderId) {
    try {
      const res = await backend.get(API_ENDPOINTS.orderById(orderId));
      return { success: true, data: res.data.data };
    } catch (e) {
      return { success: false, data: null, message: getMessage(e) };
    }
  },

  // Cache for transformed service actions
  _actionCache: new Map(),
  _cacheExpiry: 30000, // 30 seconds

  // Transform service action data for consistency
  transformServiceAction(action) {
    if (!action) return null;
    
    const cacheKey = `${action.id || action._id}_${action.updated_at}`;
    if (this._actionCache.has(cacheKey)) {
      return this._actionCache.get(cacheKey);
    }

    const transformed = {
      ...action,
      id: action.id || action._id,
      created_at: action.created_at || action.createdAt,
      updated_at: action.updated_at || action.updatedAt,
      customer_phone: this._formatPhone(action.customer_phone),
      priority: action.priority || 'normal',
      status: action.status || 'created'
    };

    // Cache with expiry
    this._actionCache.set(cacheKey, transformed);
    setTimeout(() => this._actionCache.delete(cacheKey), this._cacheExpiry);

    return transformed;
  },

  // Helper to format phone numbers
  _formatPhone(phone) {
    if (!phone) return '';
    let cleaned = phone.toString().replace(/\D/g, '');
    if (cleaned.startsWith('20')) cleaned = cleaned.slice(2);
    if (cleaned.startsWith('1')) cleaned = '0' + cleaned;
    if (!cleaned.startsWith('01')) cleaned = '01' + cleaned.slice(cleaned.startsWith('0') ? 1 : 0);
    return cleaned.slice(0, 11);
  },

  // Clear cache
  clearCache() {
    this._actionCache.clear();
  },

  // =====================
  // ENHANCED WORKFLOW ENDPOINTS
  // =====================

  async getServiceActionsByCustomerPhone(phone, limit = 50) {
    try {
      const res = await backend.get(API_ENDPOINTS.services.byCustomerPhone, { 
        params: { phone, limit } 
      });
      return { success: true, data: res.data.data };
    } catch (e) {
      return { success: false, data: [], message: getMessage(e) };
    }
  },

  async getServiceActionWithHistory(actionId) {
    try {
      const res = await backend.get(API_ENDPOINTS.services.withHistory(actionId));
      return { success: true, data: res.data.data };
    } catch (e) {
      return { success: false, data: null, message: getMessage(e) };
    }
  },

  async getWorkflowStatistics() {
    try {
      const res = await backend.get(API_ENDPOINTS.services.workflowStats);
      return { success: true, data: res.data.data };
    } catch (e) {
      return { success: false, data: {}, message: getMessage(e) };
    }
  },

  async validateServiceActionWorkflow(actionId) {
    try {
      const res = await backend.get(API_ENDPOINTS.services.validate(actionId));
      return { success: true, data: res.data.data };
    } catch (e) {
      return { success: false, data: { is_valid: false, issues: [] }, message: getMessage(e) };
    }
  },

  async getServiceActionsByStatus(status, limit = 100) {
    try {
      const res = await backend.get(API_ENDPOINTS.services.byStatus(status), { 
        params: { limit } 
      });
      return { success: true, data: res.data.data };
    } catch (e) {
      return { success: false, data: [], message: getMessage(e) };
    }
  },

  async getIntegrationStatus(customerPhone = null, limit = 20) {
    try {
      const params = { limit };
      if (customerPhone) params.customer_phone = customerPhone;
      
      const res = await backend.get(API_ENDPOINTS.services.integrationStatus, { params });
      return { success: true, data: res.data.data };
    } catch (e) {
      return { success: false, data: { pending_integration_count: 0, ready_for_maintenance_hub: [] }, message: getMessage(e) };
    }
  },

  // =====================
  // ENHANCED CUSTOMER SEARCH
  // =====================

  async searchCustomers(searchType, searchValue, options = {}) {
    try {
      const payload = {
        [searchType]: searchValue,
        group: true, // Enable customer grouping
        page: options.page || 1,
        limit: options.limit || 50
      };

      const res = await backend.post(API_ENDPOINTS.bosta.search, payload);
      return { success: true, data: res.data.data };
    } catch (e) {
      return { success: false, data: { customers: [] }, message: getMessage(e) };
    }
  },

  async getServicePayloadByTracking(tracking) {
    try {
      const res = await backend.get(API_ENDPOINTS.bosta.servicePayload, { 
        params: { tracking } 
      });
      return { success: true, data: res.data.data };
    } catch (e) {
      return { success: false, data: null, message: getMessage(e) };
    }
  },

  // =====================
  // UTILITY METHODS
  // =====================

  getStatusArabic(status) {
    const statusMap = {
      'created': 'تم الإنشاء',
      'confirmed': 'تم التأكيد',
      'pending_receive': 'في انتظار الاستلام',
      'completed': 'مكتمل',
      'failed': 'فاشل',
      'cancelled': 'ملغي'
    };
    return statusMap[status] || status;
  },

  getActionTypeArabic(actionType) {
    const typeMap = {
      'part_replace': 'استبدال قطعة',
      'full_replace': 'استبدال كامل',
      'return_from_customer': 'استرجاع من العميل'
    };
    return typeMap[actionType] || actionType;
  },

  // Enhanced transformation with complete workflow context
  transformServiceActionEnhanced(action) {
    if (!action) return null;
    
    const transformed = this.transformServiceAction(action);
    
    return {
      ...transformed,
      status_arabic: this.getStatusArabic(transformed.status),
      action_type_arabic: this.getActionTypeArabic(transformed.action_type),
      is_ready_for_integration: transformed.status === 'pending_receive',
      is_integrated: transformed.is_integrated_with_maintenance || false,
      workflow_stage: this._getWorkflowStage(transformed.status),
      customer_display_name: transformed.customer_full_name || transformed.customer_first_name || 'غير محدد'
    };
  },

  _getWorkflowStage(status) {
    const stageMap = {
      'created': 'إنشاء الإجراء',
      'confirmed': 'تأكيد الإجراء',
      'pending_receive': 'جاهز للاستلام',
      'completed': 'مكتمل',
      'failed': 'فاشل',
      'cancelled': 'ملغي'
    };
    return stageMap[status] || 'مرحلة غير معروفة';
  }
};

export default serviceActionAPI;


