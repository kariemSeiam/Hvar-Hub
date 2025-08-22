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
  // =====================
  // PRODUCTS API
  // =====================

  async listProducts(params = {}) {
    try {
      const res = await backend.get(API_ENDPOINTS.products, { params });
      return { success: true, data: res.data.data || res.data };
    } catch (e) {
      return { success: false, data: { products: [], pagination: {} }, message: getMessage(e) };
    }
  },

  async getProduct(productId) {
    try {
      const res = await backend.get(API_ENDPOINTS.productById(productId));
      return { success: true, data: res.data.data || res.data };
    } catch (e) {
      return { success: false, data: null, message: getMessage(e) };
    }
  },

  async createProduct(productData) {
    try {
      const res = await backend.post(API_ENDPOINTS.products, productData);
      return { success: true, data: res.data.data, message: res.data.message };
    } catch (e) {
      return { success: false, data: null, message: getMessage(e) };
    }
  },

  async updateProduct(productId, productData) {
    try {
      const res = await backend.put(API_ENDPOINTS.productById(productId), productData);
      return { success: true, data: res.data.data, message: res.data.message };
    } catch (e) {
      return { success: false, data: null, message: getMessage(e) };
    }
  },

  async deleteProduct(productId) {
    try {
      const res = await backend.delete(API_ENDPOINTS.productById(productId));
      return { success: true, data: res.data.data, message: res.data.message };
    } catch (e) {
      return { success: false, data: null, message: getMessage(e) };
    }
  },

  // =====================
  // PARTS API
  // =====================

  async listParts(params = {}) {
    try {
      const res = await backend.get(API_ENDPOINTS.parts, { params });
      return { success: true, data: res.data.data || res.data };
    } catch (e) {
      return { success: false, data: { parts: [], pagination: {} }, message: getMessage(e) };
    }
  },

  async getPart(partId) {
    try {
      const res = await backend.get(API_ENDPOINTS.partById(partId));
      return { success: true, data: res.data.data || res.data };
    } catch (e) {
      return { success: false, data: null, message: getMessage(e) };
    }
  },

  async createPart(partData) {
    try {
      const res = await backend.post(API_ENDPOINTS.parts, partData);
      return { success: true, data: res.data.data, message: res.data.message };
    } catch (e) {
      return { success: false, data: null, message: getMessage(e) };
    }
  },

  async updatePart(partId, partData) {
    try {
      const res = await backend.put(API_ENDPOINTS.partById(partId), partData);
      return { success: true, data: res.data.data, message: res.data.message };
    } catch (e) {
      return { success: false, data: null, message: getMessage(e) };
    }
  },

  async deletePart(partId) {
    try {
      const res = await backend.delete(API_ENDPOINTS.partById(partId));
      return { success: true, data: res.data.data, message: res.data.message };
    } catch (e) {
      return { success: false, data: null, message: getMessage(e) };
    }
  },

  // =====================
  // INVENTORY API
  // =====================

  async getInventoryAnalytics() {
    try {
      const res = await backend.get(API_ENDPOINTS.inventory.analytics);
      return { success: true, data: res.data.data || res.data };
    } catch (e) {
      return { 
        success: false, 
        data: { 
          total_products: 0, 
          total_parts: 0, 
          low_stock_parts: 0 
        }, 
        message: getMessage(e) 
      };
    }
  },

  async getLowStockItems() {
    try {
      const res = await backend.get(API_ENDPOINTS.inventory.lowStock);
      return { success: true, data: res.data.data || res.data };
    } catch (e) {
      return { success: false, data: [], message: getMessage(e) };
    }
  },

  async getProductParts(productId) {
    try {
      const res = await backend.get(API_ENDPOINTS.inventory.productParts(productId));
      return { success: true, data: res.data.data || res.data };
    } catch (e) {
      return { success: false, data: [], message: getMessage(e) };
    }
  },

  // =====================
  // SYNCHRONIZATION API
  // =====================

  async getSyncStatus() {
    try {
      const res = await backend.get(API_ENDPOINTS.sync.status);
      return { success: true, data: res.data.data || res.data };
    } catch (e) {
      return { 
        success: false, 
        data: { 
          needs_sync: false, 
          products_to_sync: 0, 
          parts_to_sync: 0 
        }, 
        message: getMessage(e) 
      };
    }
  },

  async syncProducts() {
    try {
      const res = await backend.post(API_ENDPOINTS.sync.products);
      return { success: true, data: res.data.data, message: res.data.message };
    } catch (e) {
      return { success: false, data: null, message: getMessage(e) };
    }
  },

  async forceSyncProducts() {
    try {
      const res = await backend.post(API_ENDPOINTS.sync.force);
      return { success: true, data: res.data.data, message: res.data.message };
    } catch (e) {
      return { success: false, data: null, message: getMessage(e) };
    }
  },

  // =====================
  // UTILITY METHODS
  // =====================

  // Format product data for display
  formatProduct(product) {
    if (!product) return null;

    return {
      ...product,
      display_name: product.name_ar || product.name_en || product.sku,
      formatted_sku: product.sku || 'غير محدد',
      has_parts: product.parts_count > 0,
      parts_count: product.parts_count || 0
    };
  },

  // Format part data for display
  formatPart(part) {
    if (!part) return null;

    return {
      ...part,
      display_name: part.part_name || part.part_sku,
      formatted_sku: part.part_sku || 'غير محدد',
      product_name: part.product_name || 'غير محدد'
    };
  },

  // Get product status for display
  getProductStatus(product) {
    if (!product) return 'غير محدد';
    
    if (product.is_active === false) return 'غير نشط';
    if (product.stock_quantity <= 0) return 'نفذ المخزون';
    if (product.stock_quantity <= product.low_stock_threshold) return 'مخزون منخفض';
    return 'متوفر';
  },

  // Get part status for display
  getPartStatus(part) {
    if (!part) return 'غير محدد';
    
    if (part.is_active === false) return 'غير نشط';
    if (part.stock_quantity <= 0) return 'نفذ المخزون';
    if (part.stock_quantity <= part.low_stock_threshold) return 'مخزون منخفض';
    return 'متوفر';
  },

  // Search products by name or SKU
  async searchProducts(query, limit = 20) {
    try {
      const params = {
        search: query,
        limit: limit,
        page: 1
      };
      
      const result = await this.listProducts(params);
      return result;
    } catch (e) {
      return { success: false, data: { products: [] }, message: getMessage(e) };
    }
  },

  // Search parts by name or SKU
  async searchParts(query, productId = null, limit = 20) {
    try {
      const params = {
        search: query,
        limit: limit,
        page: 1
      };
      
      if (productId) {
        params.product_id = productId;
      }
      
      const result = await this.listParts(params);
      return result;
    } catch (e) {
      return { success: false, data: { parts: [] }, message: getMessage(e) };
    }
  },

  // Get products with low stock
  async getProductsWithLowStock() {
    try {
      const params = {
        low_stock: true,
        page: 1,
        limit: 100
      };
      
      const result = await this.listProducts(params);
      return result;
    } catch (e) {
      return { success: false, data: { products: [] }, message: getMessage(e) };
    }
  },

  // Get parts with low stock
  async getPartsWithLowStock() {
    try {
      const params = {
        low_stock: true,
        page: 1,
        limit: 100
      };
      
      const result = await this.listParts(params);
      return result;
    } catch (e) {
      return { success: false, data: { parts: [] }, message: getMessage(e) };
    }
  }
};

export default productAPI;