/**
 * Authentication storage service for managing JWT tokens
 */

import { brandingConfig } from '../config/branding';

const TOKEN_KEY = brandingConfig.authTokenKey;

export const authStorage = {
  /**
   * Get the stored authentication token
   * @returns {Promise<string|null>} The token or null if not found
   */
  async getToken() {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      return token;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },

  /**
   * Store the authentication token
   * @param {string} token - The JWT token to store
   * @param {number} expiryDays - Number of days until expiry (unused in localStorage)
   * @returns {Promise<void>}
   */
  async setToken(token, expiryDays = 7) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
      console.error('Error setting token:', error);
    }
  },

  /**
   * Remove the stored authentication token
   * @returns {Promise<void>}
   */
  async removeToken() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error removing token:', error);
    }
  },
};

