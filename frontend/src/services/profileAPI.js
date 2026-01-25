/**
 * API service for profile operations
 */

import apiClient from './api';

export const profileAPI = {
  // Profile canvas items
  getItems: (userId) => apiClient.get(`/api/profile/${userId}/items`),
  addItem: (userId, data) => apiClient.post(`/api/profile/${userId}/items`, data),
  updateItem: (userId, itemId, data) => apiClient.put(`/api/profile/${userId}/items/${itemId}`, data),
  removeItem: (userId, itemId) => apiClient.delete(`/api/profile/${userId}/items/${itemId}`),

  // Profile updates
  updateProfile: (data) => apiClient.put('/api/auth/profile', data),
  uploadAvatar: (formData) => apiClient.post('/api/auth/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getAvatarUrl: (userId) => `${apiClient.defaults.baseURL}/api/auth/avatar/${userId}`,
};
