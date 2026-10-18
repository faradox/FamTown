/**
 * API service for making HTTP requests to the backend
 */

import axios from 'axios';
import { authStorage } from './authStorage';

const API_BASE_URL = import.meta.env.VITE_API_URL !== undefined
  ? import.meta.env.VITE_API_URL
  : 'http://localhost:8000';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await authStorage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // A 401 from the login call is a wrong password, not an expired session
    const isLoginRequest = error.config?.url?.endsWith('/api/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      await authStorage.removeToken();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => apiClient.post('/api/auth/login', credentials),
  logout: () => apiClient.post('/api/auth/logout'),
  getProfile: () => apiClient.get('/api/auth/profile'),
  updateProfile: (data) => apiClient.put('/api/auth/profile', data),
  uploadAvatar: (formData) => apiClient.post('/api/auth/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

export default apiClient;

