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
  }
};

export default serviceActionAPI;


