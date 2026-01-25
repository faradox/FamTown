/**
 * API service for object operations (events, pictures, files, texts)
 */

import apiClient from './api';

// Events API
export const eventsAPI = {
  list: () => apiClient.get('/api/events'),
  get: (id) => apiClient.get(`/api/events/${id}`),
  create: (data) => apiClient.post('/api/events', data),
  update: (id, data) => apiClient.put(`/api/events/${id}`, data),
  delete: (id) => apiClient.delete(`/api/events/${id}`),
};

// Pictures API
export const picturesAPI = {
  list: (params = {}) => {
    const query = {};
    if (params.page !== undefined) {
      query.page = params.page;
    }
    if (params.pageSize !== undefined) {
      query.page_size = params.pageSize;
    }
    if (params.page_size !== undefined) {
      query.page_size = params.page_size;
    }
    if (params.sort) {
      query.sort = params.sort;
    }
    return apiClient.get('/api/pictures', { params: query });
  },
  get: (id) => apiClient.get(`/api/pictures/${id}`),
  upload: (file, caption) => {
    const formData = new FormData();
    formData.append('file', file);
    if (caption) {
      formData.append('caption', caption);
    }
    return apiClient.post('/api/pictures', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  updateCaption: (id, caption) => {
    const formData = new FormData();
    formData.append('caption', caption);
    return apiClient.put(`/api/pictures/${id}`, formData);
  },
  delete: (id) => apiClient.delete(`/api/pictures/${id}`),
  getUrl: (path) => `${apiClient.defaults.baseURL}/uploads/${path}`,
};

// Files API
export const filesAPI = {
  list: () => apiClient.get('/api/files'),
  get: (id) => apiClient.get(`/api/files/${id}`),
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/api/files', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  update: (id, filename) => {
    return apiClient.put(`/api/files/${id}`, { filename });
  },
  download: (id) => apiClient.get(`/api/files/${id}/download`, {
    responseType: 'blob',
  }),
  delete: (id) => apiClient.delete(`/api/files/${id}`),
  getUrl: (path) => `${apiClient.defaults.baseURL}/uploads/${path}`,
};

// Texts API
export const textsAPI = {
  // Backward compatible: accepts either a string textType or a params object
  list: (arg = null) => {
    const params = {};
    if (typeof arg === 'string' && arg) {
      params.text_type = arg;
    } else if (arg && typeof arg === 'object') {
      const { textType, page, pageSize, page_size, sort } = arg;
      if (textType) params.text_type = textType;
      if (page !== undefined) params.page = page;
      // accept either pageSize or page_size keys
      if (pageSize !== undefined) params.page_size = pageSize;
      if (page_size !== undefined) params.page_size = page_size;
      if (sort) params.sort = sort;
    }
    return apiClient.get('/api/texts', { params });
  },
  get: (id) => apiClient.get(`/api/texts/${id}`),
  create: (data) => apiClient.post('/api/texts', data),
  update: (id, data) => apiClient.put(`/api/texts/${id}`, data),
  delete: (id) => apiClient.delete(`/api/texts/${id}`),
};
