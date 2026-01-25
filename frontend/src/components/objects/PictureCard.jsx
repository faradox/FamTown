/**
 * PictureCard component for displaying pictures
 */

import React, { useState, useEffect } from 'react';
import { picturesAPI } from '../../services/objectsAPI';
import { useObjectsStore } from '../../stores/useObjectsStore';
import { Image as ImageIcon, Pin, X, Loader } from 'lucide-react';

const PictureCard = ({ picture, onClick, onPin, onDelete, priority = false, className = '' }) => {
  const imageUrl = picturesAPI.getUrl(picture.path);
  const { getCachedContent, setCachedContent, getObjectLoadingState, setObjectLoadingState } = useObjectsStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [displayUrl, setDisplayUrl] = useState(null);

  useEffect(() => {
    const cached = getCachedContent('picture', picture.id);
    if (cached && cached === imageUrl) {
      setDisplayUrl(cached);
      setIsLoading(false);
      setLoadError(false);
      setObjectLoadingState('picture', picture.id, 'loaded');
      return;
    }

    if (cached && cached !== imageUrl) {
      setCachedContent('picture', picture.id, imageUrl);
    }

    const loadingState = getObjectLoadingState('picture', picture.id);
    if (loadingState === 'loaded') {
      setDisplayUrl(imageUrl);
      setIsLoading(false);
      setLoadError(false);
      return;
    }

    if (loadingState === 'error') {
      setDisplayUrl(imageUrl);
      setIsLoading(false);
      setLoadError(true);
      return;
    }

    setDisplayUrl(imageUrl);
    setIsLoading(true);
    setLoadError(false);
    setObjectLoadingState('picture', picture.id, 'loading');
  }, [picture.id, imageUrl, getCachedContent, getObjectLoadingState, setCachedContent, setObjectLoadingState]);

  const handleImageLoad = () => {
    setCachedContent('picture', picture.id, imageUrl);
    setObjectLoadingState('picture', picture.id, 'loaded');
    setIsLoading(false);
    setLoadError(false);
  };

  const handleImageError = () => {
    setObjectLoadingState('picture', picture.id, 'error');
    setIsLoading(false);
    setLoadError(true);
  };

  const handlePinClick = (e) => {
    e.stopPropagation();
    if (onPin) {
      onPin(picture);
    }
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(picture);
    }
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer relative ${className}`}
    >
      {onDelete && (
        <button
          onClick={handleDeleteClick}
          className="absolute top-2 left-2 p-1.5 rounded-lg bg-white/90 dark:bg-gray-800/90 hover:bg-red-100 dark:hover:bg-red-900 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors z-10 shadow-md"
          title="Delete"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      {onPin && (
        <button
          onClick={handlePinClick}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors z-10 shadow-md"
          title="Pin to Townsquare"
        >
          <Pin className="w-4 h-4" />
        </button>
      )}
      <div className="aspect-square relative bg-gray-100 dark:bg-gray-700">
        {isLoading && !loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700">
            <div className="flex flex-col items-center gap-2">
              <ImageIcon className="w-12 h-12 text-gray-400" />
              <Loader className="w-5 h-5 text-gray-400 animate-spin" />
            </div>
          </div>
        )}
        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700">
            <ImageIcon className="w-12 h-12 text-gray-400" />
          </div>
        )}
        {displayUrl && !loadError && (
          <img
            src={displayUrl}
            alt={picture.caption || picture.filename}
            className="w-full h-full object-cover"
            loading={priority ? 'eager' : 'lazy'}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}
      </div>
      {picture.caption && (
        <div className="p-3">
          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
            {picture.caption}
          </p>
        </div>
      )}
    </div>
  );
};

export default PictureCard;
