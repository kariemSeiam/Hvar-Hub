// src/api/axios.js
import axios from 'axios';
import { getCurrentConfig, FEATURES, ERROR_MESSAGES, debug } from '../config/environment';

// Get environment-specific configuration
const apiConfig = getCurrentConfig();

// Create optimized axios instance
const axiosInstance = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// Request interceptor for logging and error handling
axiosInstance.interceptors.request.use(
  config => {
    // Add request timestamp for debugging
    config.metadata = { startTime: new Date() };
    
    // Log requests based on environment config
    if (FEATURES.enableLogging) {
      debug.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    return config;
  },
  error => {
    debug.error('Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for unified error handling
axiosInstance.interceptors.response.use(
  response => {
    // Log response time based on environment config
    if (FEATURES.enableLogging && response.config.metadata) {
      const duration = new Date() - response.config.metadata.startTime;
      debug.log(`API Response: ${response.config.url} (${duration}ms)`);
    }
    
    return response;
  },
  error => {
    // Enhanced error logging
    if (FEATURES.enableLogging) {
      debug.error('API Error:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        message: error.message,
        data: error.response?.data
      });
    }
    
    // Transform common errors to user-friendly messages
    if (error.code === 'ECONNABORTED') {
      error.userMessage = ERROR_MESSAGES.TIMEOUT_ERROR;
    } else if (error.code === 'ERR_NETWORK') {
      error.userMessage = ERROR_MESSAGES.NETWORK_ERROR;
    } else if (error.response?.status === 404) {
      error.userMessage = ERROR_MESSAGES.NOT_FOUND;
    } else if (error.response?.status === 500) {
      error.userMessage = ERROR_MESSAGES.SERVER_ERROR;
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;