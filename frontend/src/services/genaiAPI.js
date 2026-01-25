/**
 * API service for GenAI operations
 */

import apiClient from './api';

export const genaiAPI = {
  getStatus: () => apiClient.get('/api/genai/status'),
  generateImage: (prompt, model = 'gemini-2.5-flash-image') =>
    apiClient.post('/api/genai/generate-image', { prompt, model }),
};

export default genaiAPI;


