/**
 * Environment Configuration
 * Centralized configuration for different environments
 */

// Environment detection
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;
const isTest = import.meta.env.MODE === 'test';

// API Configuration
export const API_CONFIG = {
  // Development: local backend
  development: {
    baseURL: 'http://127.0.0.1:5001',
    timeout: 10000,
    retryAttempts: 2,
    cacheDuration: 30000, // 30 seconds
    enableLogging: true
  },
  
  // Production: same domain or configured backend
  production: {
    baseURL: window.location.origin,
    timeout: 15000,
    retryAttempts: 3,
    cacheDuration: 60000, // 1 minute
    enableLogging: false
  },
  
  // Test environment
  test: {
    baseURL: 'http://localhost:5001',
    timeout: 5000,
    retryAttempts: 1,
    cacheDuration: 0, // No cache in tests
    enableLogging: true
  }
};

// Get current environment config
export const getCurrentConfig = () => {
  if (isTest) return API_CONFIG.test;
  if (isProduction) return API_CONFIG.production;
  return API_CONFIG.development;
};

// Feature flags
export const FEATURES = {
  // Enable/disable features based on environment
  enableCaching: !isTest,
  enableLogging: getCurrentConfig().enableLogging,
  enablePerformanceMonitoring: isDevelopment,
  enableErrorReporting: isProduction,
  enableAnalytics: isProduction,
  
  // Scanner features
  enableQRScanner: true,
  enableManualInput: true,
  enableAutoScan: true,
  
  // Order management features
  enableBulkActions: true,
  enableSearch: true,
  enableTimeline: true,
  enableMaintenanceHistory: true
};

// Performance settings
export const PERFORMANCE = {
  // Debounce settings
  searchDebounce: 300,
  scanDebounce: 1000,
  
  // Cache settings
  maxCacheSize: 100,
  cacheCleanupInterval: 60000, // 1 minute
  
  // Request settings
  maxConcurrentRequests: 5,
  requestTimeout: getCurrentConfig().timeout,
  
  // UI settings
  animationDuration: 200,
  loadingTimeout: 10000
};

// Error messages in Arabic
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'خطأ في الاتصال بالشبكة - تحقق من اتصالك بالإنترنت',
  TIMEOUT_ERROR: 'انتهت مهلة الاتصال - يرجى المحاولة مرة أخرى',
  SERVER_ERROR: 'خطأ في الخادم - يرجى المحاولة مرة أخرى',
  NOT_FOUND: 'المورد غير موجود',
  UNAUTHORIZED: 'خطأ في المصادقة - تحقق من إعدادات API',
  VALIDATION_ERROR: 'بيانات الطلب غير صحيحة',
  UNKNOWN_ERROR: 'خطأ غير معروف - يرجى المحاولة مرة أخرى'
};

// Success messages in Arabic
export const SUCCESS_MESSAGES = {
  ORDER_SCANNED: 'تم مسح الطلب بنجاح',
  ORDER_UPDATED: 'تم تحديث الطلب بنجاح',
  ORDER_CREATED: 'تم إنشاء الطلب بنجاح',
  DATA_LOADED: 'تم جلب البيانات بنجاح',
  CACHE_CLEARED: 'تم مسح الذاكرة المؤقتة'
};

// Validation rules
export const VALIDATION = {
  // Tracking number validation
  trackingNumber: {
    minLength: 3,
    maxLength: 50,
    pattern: /^[A-Za-z0-9\-_]+$/,
    invalidPatterns: [
      /^[0-9]{1,2}$/, // Single or double digits
      /^[a-zA-Z]{1,2}$/, // Single or double letters
      /^[\\\/\-_]{1,}$/, // Only special characters
      /^[0-9]{1,2}[a-zA-Z]{1,2}$/ // Short alphanumeric
    ]
  },
  
  // Phone number validation
  phoneNumber: {
    pattern: /^[0-9+\-\s()]+$/,
    minLength: 8,
    maxLength: 15
  },
  
  // Notes validation
  notes: {
    maxLength: 500
  }
};

// Status mappings
export const STATUS_MAPPING = {
  // Backend to frontend status mapping
  backendToFrontend: {
    'in_maintenance': 'inMaintenance',
    'returned': 'returns'
  },
  
  // Frontend to backend status mapping
  frontendToBackend: {
    'inMaintenance': 'in_maintenance',
    'returns': 'returned'
  },
  
  // Status colors
  colors: {
    'received': 'blue',
    'inMaintenance': 'amber',
    'completed': 'green',
    'failed': 'red',
    'sending': 'purple',
    'returns': 'gray'
  }
};

// Export current environment info
export const ENV_INFO = {
  isDevelopment,
  isProduction,
  isTest,
  mode: import.meta.env.MODE,
  config: getCurrentConfig()
};

// Debug utilities
export const debug = {
  log: (message, data) => {
    if (FEATURES.enableLogging) {
      console.log(`[DEBUG] ${message}`, data);
    }
  },
  
  error: (message, error) => {
    if (FEATURES.enableLogging) {
      console.error(`[ERROR] ${message}`, error);
    }
  },
  
  warn: (message, data) => {
    if (FEATURES.enableLogging) {
      console.warn(`[WARN] ${message}`, data);
    }
  },
  
  info: (message, data) => {
    if (FEATURES.enableLogging) {
      console.info(`[INFO] ${message}`, data);
    }
  }
}; 