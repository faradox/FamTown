import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getBranding } from '../../themes/appTheme';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const branding = getBranding();
  const loadingTitle =
    branding.authTitleDecorated || branding.authTitle || branding.appName || 'FamTown';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-300 mx-auto mb-4"></div>
          <h1 className="font-black text-gray-900 dark:text-white uppercase tracking-wide text-xl">{loadingTitle}</h1>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to home page (which shows login options)
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute; 