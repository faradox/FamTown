/**
 * ConfigModal component - modal for configuring view settings
 */

import React, { useEffect, useRef, useState } from 'react';
import { X, Upload } from 'lucide-react';

const DEFAULT_COLOR = '#111827';

const resolveInitialColor = (config) => {
  if (!config) return DEFAULT_COLOR;
  if (config.backgroundType === 'color' && config.backgroundColor) {
    return config.backgroundColor;
  }
  if (config.backgroundColor) {
    return config.backgroundColor;
  }
  return DEFAULT_COLOR;
};

const ConfigModal = ({
  isOpen,
  onClose,
  viewName,
  onSetColor,
  onUploadImage,
  onReset = async () => {},
  currentConfig,
  hasUserConfig = false,
}) => {
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [isUploading, setIsUploading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setColor(resolveInitialColor(currentConfig));
    }
  }, [isOpen, currentConfig]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (color) {
      await onSetColor(viewName, color);
    }
    onClose();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      await onUploadImage(viewName, file);
      onClose();
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleReset = async () => {
    if (isResetting) return;
    setIsResetting(true);
    try {
      await onReset(viewName);
      onClose();
    } catch (error) {
      console.error('Failed to reset view config:', error);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            View Configuration
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Background Color
              </label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-16 h-10 p-0 border border-gray-300 dark:border-gray-600 rounded cursor-pointer bg-transparent"
                aria-label="Pick background color"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Background Image
              </label>
              <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer ${isUploading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white`}>
                <Upload className="w-5 h-5" />
                {isUploading ? 'Uploading...' : 'Upload Image'}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between mt-6">
            <button
              type="button"
              onClick={handleReset}
              disabled={!hasUserConfig || isResetting}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                !hasUserConfig || isResetting
                  ? 'text-gray-400 bg-gray-100 dark:text-gray-500 dark:bg-gray-700 cursor-not-allowed'
                  : 'text-red-600 bg-red-100 hover:bg-red-200 dark:text-red-400 dark:bg-red-900/40 dark:hover:bg-red-900/60'
              }`}
            >
              {isResetting ? 'Resetting...' : 'Reset to Shared Default'}
            </button>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigModal;
