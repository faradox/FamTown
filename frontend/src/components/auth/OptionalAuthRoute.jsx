import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * OptionalAuthRoute - A route component that works for both authenticated and unauthenticated users
 * This differs from ProtectedRoute which requires authentication
 */
const OptionalAuthRoute = ({ children, redirectIfAuthedTo }) => {
  const { isLoading, isAuthenticated } = useAuth();

  // Show loading while auth is being determined
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-300"></div>
      </div>
    );
  }

  // If authenticated and redirect target provided, redirect
  if (redirectIfAuthedTo && isAuthenticated) {
    return <Navigate to={redirectIfAuthedTo} replace />;
  }

  // Render children regardless of auth status
  return children;
};

export default OptionalAuthRoute; 