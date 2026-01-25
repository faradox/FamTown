/**
 * TownsquarePictureCard component - specialized picture display for townsquare canvas
 * Supports cropping from any edge while maintaining proper image display
 */

import React, { useState, useEffect } from 'react';
import { picturesAPI } from '../../services/objectsAPI';
import { useObjectsStore } from '../../stores/useObjectsStore';
import { Image as ImageIcon, Loader } from 'lucide-react';

const TownsquarePictureCard = ({
  picture,
  priority = false,
  className = '',
  cropOffsets = { top: 0, right: 0, bottom: 0, left: 0 },
}) => {
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

  // Calculate background-size and background-position to show the cropped portion
  // When no crop (all offsets = 0), image fills container at 100%
  // When cropped, image is scaled up and positioned to show only the visible portion
  const { top, right, bottom, left } = cropOffsets;
  const visibleWidthPercent = Math.max(1, 100 - left - right);
  const visibleHeightPercent = Math.max(1, 100 - top - bottom);

  // Background size: scale up so visible portion fills container
  const bgWidth = (100 / visibleWidthPercent) * 100;
  const bgHeight = (100 / visibleHeightPercent) * 100;

  // Background position: offset to hide the cropped portions
  // Uses the background-position percentage formula
  const bgPosX = visibleWidthPercent < 100 ? (left / (100 - visibleWidthPercent)) * 100 : 0;
  const bgPosY = visibleHeightPercent < 100 ? (top / (100 - visibleHeightPercent)) * 100 : 0;

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden relative ${className}`}
      style={{ width: '100%', height: '100%' }}
    >
      <div
        className="relative w-full h-full overflow-hidden bg-gray-100 dark:bg-gray-700"
      >
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
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${displayUrl})`,
              backgroundSize: `${bgWidth}% ${bgHeight}%`,
              backgroundPosition: `${bgPosX}% ${bgPosY}%`,
              backgroundRepeat: 'no-repeat',
            }}
            role="img"
            aria-label={picture.caption || picture.filename}
          />
        )}
        {/* Hidden img for loading detection */}
        {displayUrl && (
          <img
            src={displayUrl}
            alt=""
            className="sr-only"
            loading={priority ? 'eager' : 'lazy'}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}
      </div>
    </div>
  );
};

export default TownsquarePictureCard;
