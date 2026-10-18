import React, { createContext, useContext, useState, useEffect } from 'react';
import { authStorage } from '../services/authStorage';
import { authAPI } from '../services/api';
import { useViewConfigStore } from '../stores/useViewConfigStore';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { loadAll } = useViewConfigStore();

  // Check for existing authentication on app startup
  useEffect(() => {
    const checkAuth = async () => {
      const token = await authStorage.getToken();
      if (token) {
        try {
          const response = await authAPI.getProfile();
          setUser(response.data);
          setIsAuthenticated(true);
          try {
            await loadAll();
          } catch (err) {
            console.error('Failed to load view configs:', err);
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          // Token might be expired
          await authStorage.removeToken();
          setIsAuthenticated(false);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      
      if (response.data.success) {
        const { user, token } = response.data;
        
        // Store token in storage (native: Preferences, web: cookies)
        await authStorage.setToken(token, 7);
        
        setUser(user);
        setIsAuthenticated(true);
        
        return { success: true };
      } else {
        return { 
          success: false, 
          message: response.data.message || 'Login failed' 
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      
      let message = 'Login failed. Please try again.';
      if (error.response?.data?.detail) {
        message = error.response.data.detail;
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      }
      
      return { 
        success: false, 
        message 
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      
      if (response.data.success) {
        const { user, token } = response.data;
        
        // Store token using unified storage (native: Preferences, web: cookies)
        await authStorage.setToken(token, 7);
        
        setUser(user);
        setIsAuthenticated(true);
        
        return { success: true };
      } else {
        return { 
          success: false, 
          message: response.data.message || 'Registration failed' 
        };
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      let message = 'Registration failed. Please try again.';
      if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.response?.data?.errors) {
        // Handle validation errors
        message = error.response.data.errors.map(err => err.msg).join(', ');
      }
      
      return { 
        success: false, 
        message 
      };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local state regardless of API response
      await authStorage.removeToken();
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await authAPI.updateProfile(profileData);
      setUser(response.data);
      return { success: true };
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };

  const refreshProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      setUser(response.data);
      return { success: true };
    } catch (error) {
      console.error('Profile refresh error:', error);
      throw error;
    }
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 