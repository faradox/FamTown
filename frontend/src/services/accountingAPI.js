/**
 * API service for accounting operations (categories, entries, templates)
 */

import apiClient from './api';

// Categories API
export const categoriesAPI = {
  list: (type = null) => {
    const params = {};
    if (type) params.type = type;
    return apiClient.get('/api/accounting/categories', { params });
  },
  create: (data) => apiClient.post('/api/accounting/categories', data),
  update: (id, data) => apiClient.put(`/api/accounting/categories/${id}`, data),
  delete: (id) => apiClient.delete(`/api/accounting/categories/${id}`),
  reorder: (items) => apiClient.post('/api/accounting/categories/reorder', { items }),
};

// Entries API
export const entriesAPI = {
  list: (params = {}) => {
    const query = {};
    if (params.type) query.type = params.type;
    if (params.categoryId) query.categoryId = params.categoryId;
    if (params.fromDate) query.from_date = params.fromDate;
    if (params.toDate) query.to_date = params.toDate;
    if (params.search) query.search = params.search;
    if (params.page !== undefined) query.page = params.page;
    if (params.pageSize !== undefined) query.page_size = params.pageSize;
    if (params.sort) query.sort = params.sort;
    return apiClient.get('/api/accounting/entries', { params: query });
  },
  create: (data) => apiClient.post('/api/accounting/entries', data),
  update: (id, data) => apiClient.put(`/api/accounting/entries/${id}`, data),
  delete: (id) => apiClient.delete(`/api/accounting/entries/${id}`),
  summary: (fromDate, toDate) => {
    return apiClient.get('/api/accounting/entries/summary', {
      params: { from_date: fromDate, to_date: toDate },
    });
  },
};

// Templates API
export const templatesAPI = {
  list: () => apiClient.get('/api/accounting/templates'),
  create: (data) => apiClient.post('/api/accounting/templates', data),
  update: (id, data) => apiClient.put(`/api/accounting/templates/${id}`, data),
  delete: (id) => apiClient.delete(`/api/accounting/templates/${id}`),
  apply: (id, data) => apiClient.post(`/api/accounting/templates/${id}/apply`, data),
};
