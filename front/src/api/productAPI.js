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

export const productAPI = {
  // Products
  async createProduct(payload) {
    try {
      const res = await backend.post(API_ENDPOINTS.products, payload);
      return { success: true, data: res.data.data, message: res.data.message };
    } catch (e) {
      return { success: false, data: null, message: getMessage(e) };
    }
  },
  async listProducts(params = {}) {
    try {
      const res = await backend.get(API_ENDPOINTS.products, { params });
      return { success: true, data: res.data.data };
    } catch (e) {
      return { success: false, data: { products: [], pagination: {} }, message: getMessage(e) };
    }
  },
  async updateProduct(id, payload) {
    try {
      const res = await backend.put(API_ENDPOINTS.productById(id), payload);
      return { success: true, data: res.data.data, message: res.data.message };
    } catch (e) {
      return { success: false, data: null, message: getMessage(e) };
    }
  },
  async deleteProduct(id) {
    try {
      const res = await backend.delete(API_ENDPOINTS.productById(id));
      return { success: true, message: res.data.message };
    } catch (e) {
      return { success: false, message: getMessage(e) };
    }
  },

  // Parts
  async createPart(payload) {
    try {
      const res = await backend.post(API_ENDPOINTS.parts, payload);
      return { success: true, data: res.data.data, message: res.data.message };
    } catch (e) {
      return { success: false, data: null, message: getMessage(e) };
    }
  },
  async listParts(params = {}) {
    try {
      const res = await backend.get(API_ENDPOINTS.parts, { params });
      return { success: true, data: res.data.data };
    } catch (e) {
      return { success: false, data: { parts: [], pagination: {} }, message: getMessage(e) };
    }
  },
  async updatePart(id, payload) {
    try {
      const res = await backend.put(API_ENDPOINTS.partById(id), payload);
      return { success: true, data: res.data.data, message: res.data.message };
    } catch (e) {
      return { success: false, data: null, message: getMessage(e) };
    }
  },
  async deletePart(id) {
    try {
      const res = await backend.delete(API_ENDPOINTS.partById(id));
      return { success: true, message: res.data.message };
    } catch (e) {
      return { success: false, message: getMessage(e) };
    }
  },

  // Inventory
  async getInventoryAnalytics() {
    try {
      const res = await backend.get(API_ENDPOINTS.inventory.analytics);
      return { success: true, data: res.data.data };
    } catch (e) {
      return { success: false, data: {}, message: getMessage(e) };
    }
  },
  async getLowStock(limit = 50) {
    try {
      const res = await backend.get(`${API_ENDPOINTS.inventory.lowStock}?limit=${limit}`);
      return { success: true, data: res.data.data };
    } catch (e) {
      return { success: false, data: [], message: getMessage(e) };
    }
  },
  async getPartsByProduct(productId) {
    try {
      const res = await backend.get(API_ENDPOINTS.inventory.productParts(productId));
      return { success: true, data: res.data.data };
    } catch (e) {
      return { success: false, data: [], message: getMessage(e) };
    }
  },

  // Product Synchronization
  async syncProductsFromJSON(jsonFilePath = null) {
    try {
      const payload = jsonFilePath ? { json_file_path: jsonFilePath } : {};
      const res = await backend.post('/v1/sync/products', payload);
      return { success: true, data: res.data.data, message: res.data.message };
    } catch (e) {
      return { success: false, data: null, message: getMessage(e) };
    }
  },

  async getSyncStatus() {
    try {
      const res = await backend.get('/v1/sync/status');
      return { success: true, data: res.data.data, message: res.data.message };
    } catch (e) {
      return { success: false, data: null, message: getMessage(e) };
    }
  },

  async forceSyncProducts(jsonFilePath = null) {
    try {
      const payload = jsonFilePath ? { json_file_path: jsonFilePath } : {};
      const res = await backend.post('/v1/sync/force', payload);
      return { success: true, data: res.data.data, message: res.data.message };
    } catch (e) {
      return { success: false, data: null, message: getMessage(e) };
    }
  },
};

export default productAPI;


