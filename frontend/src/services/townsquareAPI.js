/**
 * API service for townsquare operations
 */

import apiClient from './api';

export const townsquareAPI = {
  getItems: () => apiClient.get('/api/townsquare'),
  getCombined: () => apiClient.get('/api/townsquare/combined'),
  addItem: (data) => apiClient.post('/api/townsquare', data),
  updateItem: (id, data) => apiClient.put(`/api/townsquare/${id}`, data),
  removeItem: (id) => apiClient.delete(`/api/townsquare/${id}`),
};

