// src/api/axios.js
import axios from 'axios';

const API_URL = 'http://127.0.0.1:5000';

const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',

  },
  // Make sure credentials are included in all requests
  credentials: 'include'
});

// Add request interceptor to ensure credentials are included
axiosInstance.interceptors.request.use(
  config => {
    config.withCredentials = true;
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
axiosInstance.interceptors.response.use(
  response => {
    // You can check for cookies in dev tools
    return response;
  },
  error => {
    console.error('API Error:', error.response || error);
    return Promise.reject(error);
  }
);

export default axiosInstance;