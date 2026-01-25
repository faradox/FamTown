/**
 * PhotosPage - photo wall view
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Upload, X, User, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { picturesAPI } from '../services/objectsAPI';
import { townsquareAPI } from '../services/townsquareAPI';
import { useObjectsStore } from '../stores/useObjectsStore';
import { useViewConfigStore } from '../stores/useViewConfigStore';
import PictureCard from '../components/objects/PictureCard';
import FloatingMenu from '../components/common/FloatingMenu';
import ConfigModal from '../components/common/ConfigModal';
import toast from 'react-hot-toast';

const PhotosPage = () => {
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPicture, setSelectedPicture] = useState(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const { pictures, setPictures, addPicture, deletePicture } = useObjectsStore();
  const {
    viewConfigs,
    getBackgroundStyle,
    setBackgroundColor,
    uploadBackgroundImage,
    resetViewConfig,
    hasUserOverride,
    loadAll,
  } = useViewConfigStore();
  const backgroundStyle = getBackgroundStyle('photos');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef(null);
  const pageRef = useRef(1);
  const isFetchingRef = useRef(false);
  const PAGE_SIZE = 6;

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const fetchPictures = useCallback(
    async ({ reset = false } = {}) => {
      if (isFetchingRef.current) return;

      if (reset) {
        pageRef.current = 1;
        setHasMore(true);
      }

      isFetchingRef.current = true;
      setIsLoading(true);

      try {
        const response = await picturesAPI.list({
          page: pageRef.current,
          page_size: PAGE_SIZE,
          sort: sortOrder,
        });

        const fetchedPictures = response.data;

        if (reset) {
          setPictures(fetchedPictures);
        } else {
          const currentPictures = useObjectsStore.getState().pictures;
          const existingIds = new Set(currentPictures.map((picture) => picture.id));
          const mergedPictures = [...currentPictures];

          fetchedPictures.forEach((picture) => {
            if (!existingIds.has(picture.id)) {
              mergedPictures.push(picture);
            }
          });

          setPictures(mergedPictures);
        }

        setHasMore(fetchedPictures.length === PAGE_SIZE);
        pageRef.current += 1;
      } catch (error) {
        console.error('Error loading pictures:', error);
      } finally {
        isFetchingRef.current = false;
        setIsLoading(false);
      }
    },
    [setPictures, sortOrder]
  );

  useEffect(() => {
    fetchPictures({ reset: true });
  }, [fetchPictures]);

  useEffect(() => {
    setSelectedPicture(null);
  }, [sortOrder]);

  useEffect(() => {
    if (!selectedPicture) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedPicture(null);
      } else if (e.key === 'ArrowLeft') {
        navigatePicture(-1);
      } else if (e.key === 'ArrowRight') {
        navigatePicture(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPicture, pictures]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isLoading) {
          fetchPictures();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [fetchPictures, hasMore, isLoading]);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploading(true);

    try {
      for (const file of files) {
        const response = await picturesAPI.upload(file);
        addPicture(response.data);
      }
      toast.success(`Uploaded ${files.length} photo(s)`);
      await fetchPictures({ reset: true });
    } catch (error) {
      console.error('Error uploading pictures:', error);
      toast.error('Failed to upload photos');
    } finally {
      setIsUploading(false);
    }
  };

  const navigatePicture = (direction) => {
    if (!selectedPicture) return;

    const currentIndex = pictures.findIndex(p => p.id === selectedPicture.id);
    if (currentIndex === -1) return;

    const nextIndex = currentIndex + direction;
    if (nextIndex >= 0 && nextIndex < pictures.length) {
      setSelectedPicture(pictures[nextIndex]);
    }
  };

  const handlePin = async (picture) => {
    try {
      // Generate random position within reasonable bounds
      const x = Math.floor(Math.random() * 800) + 100;
      const y = Math.floor(Math.random() * 600) + 100;

      // Calculate proper dimensions from image to show full image
      const imageUrl = picturesAPI.getUrl(picture.path);
      let width = 300;
      let height = 300;

      try {
        const dims = await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const maxSize = 400;
            const { naturalWidth, naturalHeight } = img;
            let w, h;

            if (naturalWidth >= naturalHeight) {
              w = Math.min(maxSize, naturalWidth);
              h = Math.round((w / naturalWidth) * naturalHeight);
            } else {
              h = Math.min(maxSize, naturalHeight);
              w = Math.round((h / naturalHeight) * naturalWidth);
            }

            resolve({ width: w, height: h });
          };
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = imageUrl;
        });
        width = dims.width;
        height = dims.height;
      } catch (e) {
        // Fallback to defaults if dimension calculation fails
      }

      await townsquareAPI.addItem({
        objectType: 'picture',
        objectId: picture.id,
        x,
        y,
        width,
        height,
        zIndex: 0,
        rotation: 0,
      });

      toast.success('Pinned to Townsquare!');
      navigate('/townsquare');
    } catch (error) {
      console.error('Error pinning picture:', error);
      toast.error('Failed to pin to Townsquare');
    }
  };

  const handleDelete = async (picture) => {
    if (!window.confirm('Are you sure you want to delete this photo?')) {
      return;
    }

    try {
      await picturesAPI.delete(picture.id);
      deletePicture(picture.id);
      toast.success('Photo deleted successfully');

      // Close the lightbox if the deleted picture was selected
      if (selectedPicture && selectedPicture.id === picture.id) {
        setSelectedPicture(null);
      }

      if (hasMore) {
        await fetchPictures();
      }
    } catch (error) {
      console.error('Error deleting picture:', error);
      toast.error('Failed to delete photo');
    }
  };

  // Menu items for the floating menu (no add button for photos view)
  const menuItems = [
    {
      icon: <User className="w-6 h-6" />,
      label: 'Profile',
      color: 'bg-purple-600 hover:bg-purple-700',
      onClick: () => navigate('/profile'),
    },
    {
      icon: <Settings className="w-6 h-6" />,
      label: 'Settings',
      color: 'bg-orange-600 hover:bg-orange-700',
      onClick: () => setIsConfigOpen(true),
    },
  ];

  return (
    <div className={`min-h-screen`} style={backgroundStyle}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex items-center flex-wrap gap-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Photos
            </h1>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span>Sort</span>
              <select
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              >
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </select>
            </div>
          </div>
          <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 cursor-pointer">
            <Upload className="w-5 h-5" />
            Upload Photos
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />
          </label>
        </div>

        {pictures.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {isLoading ? 'Loading photos...' : 'No photos yet. Upload your first photo!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {pictures.map((picture) => (
              <PictureCard
                key={picture.id}
                picture={picture}
                onClick={() => setSelectedPicture(picture)}
                onPin={handlePin}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        <div ref={sentinelRef} className="h-1" />

        {isLoading && pictures.length > 0 && (
          <div className="flex justify-center py-6">
            <span className="text-sm text-gray-500 dark:text-gray-400">Loading more photos...</span>
          </div>
        )}

        {isUploading && (
          <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
            Uploading...
          </div>
        )}
      </div>

      {/* Image Lightbox Modal */}
      {selectedPicture && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPicture(null)}
        >
          <button
            onClick={() => setSelectedPicture(null)}
            className="absolute top-4 right-4 p-2 text-white hover:text-gray-300 transition-colors"
          >
            <X className="w-8 h-8" />
          </button>
          <div className="max-w-7xl max-h-full flex flex-col items-center">
            <img
              src={picturesAPI.getUrl(selectedPicture.path)}
              alt={selectedPicture.caption || selectedPicture.filename}
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            {selectedPicture.caption && (
              <div className="mt-4 text-white text-center max-w-2xl">
                <p className="text-lg">{selectedPicture.caption}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <FloatingMenu items={menuItems} />
      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        viewName="photos"
        onSetColor={setBackgroundColor}
        onUploadImage={uploadBackgroundImage}
        onReset={resetViewConfig}
        currentConfig={viewConfigs['photos']}
        hasUserConfig={hasUserOverride('photos')}
      />
    </div>
  );
};

export default PhotosPage;
