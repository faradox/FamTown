/**
 * HomePage - landing page with login redirect
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getBranding } from '../themes/appTheme';

const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const branding = getBranding();
  const loadingTitle = branding.appName || 'FamTown';

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/townsquare');
    } else {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-300 mx-auto mb-4"></div>
        <h1 className="font-black text-gray-900 dark:text-white uppercase tracking-wide text-xl">
          {loadingTitle}
        </h1>
      </div>
    </div>
  );
};

export default HomePage;

