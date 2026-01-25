import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getBranding } from '../../themes/appTheme';

const ForgotPasswordForm = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const branding = getBranding();
  const authTitle = branding.authTitle || branding.appName || 'FamTown';
  const authTitleDecorated = branding.authTitleDecorated || authTitle;

  const handleChange = (e) => {
    setEmail(e.target.value);
    
    // Clear error when user starts typing
    if (errors.email) {
      setErrors(prev => ({
        ...prev,
        email: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    // Simulate API call - replace with actual forgot password API call
    setTimeout(() => {
      setIsLoading(false);
      toast.success('Password reset instructions sent to your email!');
    }, 1500);
  };

  return (
    <div className="h-screen relative overflow-hidden">
      {/* Mobile Background Image */}
      <div className="lg:hidden absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/covers/signup_cover_0.webp')`
        }}
      >
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-gray-900/60 to-black/80"></div>
      </div>

      {/* Back Button - Top Left (Mobile) */}
      <div className="lg:hidden absolute top-4 left-4 z-20">
        <Link
          to="/login"
          className="flex items-center justify-center w-10 h-10 bg-black/20 hover:bg-black/30 rounded-full backdrop-blur-sm transition-colors"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
      </div>

      {/* Logo - Top Center (Mobile) */}
      <div className="lg:hidden absolute top-6 left-1/2 transform -translate-x-1/2 z-20">
        <div className="text-center">
          <h1 className="text-2xl font-black text-white uppercase">{authTitleDecorated}</h1>
        </div>
      </div>

      {/* Welcome Text on Image (Mobile) */}
      <div className="lg:hidden absolute top-[30%] left-4 z-20">
        <h1 className="text-4xl sm:text-4xl font-black text-white">Reset <br/>Password</h1>
      </div>

      {/* Layout Container */}
      <div className="relative z-10 h-full flex flex-col lg:flex-row">
        {/* Desktop Left Side - Image */}
        <div className="hidden lg:flex lg:w-1/2 relative">
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url('/covers/signup_cover_0.webp')`
            }}
          >
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-gray-900/60 to-black/80"></div>
          </div>
        </div>

        {/* Form Section */}
        <div className="flex-1 lg:w-1/2 flex items-end lg:items-center justify-center lg:bg-white lg:dark:bg-gray-900 lg:py-12 px-0 lg:px-8">
        <div className="w-full lg:max-w-md bg-white dark:bg-gray-900 lg:bg-transparent rounded-t-3xl lg:rounded-none shadow-2xl lg:shadow-none px-6 pt-6 pb-5 lg:p-0 space-y-4 lg:space-y-8">
          <div className="hidden lg:block text-center mb-6">
            {/* Show logo and text on desktop only */}
            <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-4 uppercase">{authTitleDecorated}</h1>
            <h2 className="mt-4 text-xl font-extrabold text-gray-900 dark:text-white">
              Reset your password
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Enter your email to receive reset instructions
            </p>
          </div>
          
          <form className="mt-0 lg:mt-0 space-y-4 lg:space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-3 lg:space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={handleChange}
                  className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                    errors.email ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
                  } placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-300 focus:border-transparent focus:z-10 sm:text-sm transition-colors bg-white dark:bg-gray-800`}
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-400">{errors.email}</p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-3 lg:py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gray-900 hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 dark:focus:ring-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </div>
                ) : (
                  'Send Reset Instructions'
                )}
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Remember your password?</p>
              <Link
                to="/login"
                className="block w-full py-3 px-6 text-center text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
              >
                Back to Sign In
              </Link>
            </div>
          </form>
        </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;
