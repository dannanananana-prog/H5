import axios from 'axios';
import { showToast } from 'vant';

// Create axios instance
const service = axios.create({
  baseURL: '/api', // Proxy in vite.config.js will handle this
  timeout: 15000, // Request timeout
});

// Request interceptor
service.interceptors.request.use(
  config => {
    // Add auth token if available
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    // Some backend endpoints might expect user_id in headers for legacy reasons
    if (userId) {
      config.headers['x-user-id'] = userId;
    }
    return config;
  },
  error => {
    console.log(error);
    return Promise.reject(error);
  }
);

// Response interceptor
service.interceptors.response.use(
  response => {
    const res = response.data;
    
    // You might need to adjust this logic based on your actual backend response structure
    // If backend returns { code: 200, data: ... }
    return res;
  },
  error => {
    console.log('err' + error);
    showToast({
      message: error.message || 'Error',
      type: 'fail',
      duration: 3000
    });
    return Promise.reject(error);
  }
);

export default service;
