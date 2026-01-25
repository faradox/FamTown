/**
 * API service for view configurations
 */

import apiClient from './api';

export const viewConfigAPI = {
  list: () => apiClient.get('/api/view-configs'),
  upsert: (viewName, config) => apiClient.post('/api/view-configs', { viewName, config }),
  uploadBackground: (viewName, file) => {
    const form = new FormData();
    form.append('viewName', viewName);
    form.append('file', file);
    return apiClient.post('/api/view-configs/background', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  remove: (viewName) => apiClient.delete(`/api/view-configs/${viewName}`),
  getUploadUrl: (path) => `${apiClient.defaults.baseURL}/uploads/${path}`,
};

export default viewConfigAPI;

