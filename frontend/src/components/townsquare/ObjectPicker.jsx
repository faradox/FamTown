/**
 * ObjectPicker component - modal to select objects to add to townsquare
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { useObjectsStore } from '../../stores/useObjectsStore';
import { townsquareAPI } from '../../services/townsquareAPI';
import { picturesAPI, filesAPI, textsAPI } from '../../services/objectsAPI';
import EventCard from '../objects/EventCard';
import PictureCard from '../objects/PictureCard';
import FileCard from '../objects/FileCard';
import TextCard from '../objects/TextCard';
import toast from 'react-hot-toast';
import { useGenaiStatus } from '../../hooks/useGenaiStatus';

const ObjectPicker = ({ isOpen, onClose, title = 'Add to Townsquare', onAdd }) => {
  const [selectedType, setSelectedType] = useState('event');
  const [isUploading, setIsUploading] = useState(false);
  const [maxZIndex, setMaxZIndex] = useState(0);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [genDefaultPrompt, setGenDefaultPrompt] = useState('');
  const [listTitle, setListTitle] = useState('');
  const { events, pictures, files, texts, addPicture, addFile, addText } = useObjectsStore();
  const fileInputRef = useRef(null);
  const pictureInputRef = useRef(null);
  const { enabled: isGenaiEnabled } = useGenaiStatus();

  // Load existing townsquare items to calculate max z-index
  useEffect(() => {
    const loadMaxZIndex = async () => {
      try {
        const response = await townsquareAPI.getItems();
        const items = response.data;
        const max = items.reduce((maxZ, item) => Math.max(maxZ, item.zIndex || 0), 0);
        setMaxZIndex(max);
      } catch (error) {
        console.error('Error loading townsquare items:', error);
      }
    };

    if (isOpen) {
      loadMaxZIndex();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Helper to get image dimensions and calculate proper initial size
  const getImageDimensions = (imageUrl) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const maxSize = 400; // Maximum dimension for the longer side
        const { naturalWidth, naturalHeight } = img;
        let width, height;

        if (naturalWidth >= naturalHeight) {
          // Landscape or square
          width = Math.min(maxSize, naturalWidth);
          height = Math.round((width / naturalWidth) * naturalHeight);
        } else {
          // Portrait
          height = Math.min(maxSize, naturalHeight);
          width = Math.round((height / naturalHeight) * naturalWidth);
        }

        resolve({ width, height, naturalWidth, naturalHeight });
      };
      img.onerror = () => {
        // Fallback to default dimensions on error
        resolve({ width: 300, height: 300, naturalWidth: 300, naturalHeight: 300 });
      };
      img.src = imageUrl;
    });
  };

  const getObjects = () => {
    switch (selectedType) {
      case 'event':
        return events;
      case 'picture':
        return pictures;
      case 'file':
        return files;
      case 'text':
        return texts;
      case 'widget':
        // Widgets are not existing objects; the tab provides actions instead
        return [];
      default:
        return [];
    }
  };

  const handleAddToTownsquare = async (object) => {
    try {
      // If onAdd prop is provided, use it; otherwise use default townsquare behavior
      if (onAdd) {
        await onAdd(selectedType, object);
      } else {
        let width = 300;
        let height = 200;

        // For pictures, calculate proper dimensions to show full image
        if (selectedType === 'picture' && object.path) {
          const imageUrl = picturesAPI.getUrl(object.path);
          const dims = await getImageDimensions(imageUrl);
          width = dims.width;
          height = dims.height;
        }

        await townsquareAPI.addItem({
          objectType: selectedType,
          objectId: object.id,
          x: Math.floor(Math.random() * 500 + 100),
          y: Math.floor(Math.random() * 300 + 100),
          width,
          height,
          zIndex: maxZIndex + 1,
          rotation: 0,
        });
        // Trigger townsquare canvas to reload
        window.dispatchEvent(new CustomEvent('townsquare-items-updated'));
      }
      onClose();
    } catch (error) {
      console.error('Error adding to townsquare:', error);
    }
  };

  const handlePictureUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploading(true);

    try {
      let currentZIndex = maxZIndex + 1;
      for (const file of files) {
        // Upload picture to library
        const response = await picturesAPI.upload(file);
        const newPicture = response.data;
        addPicture(newPicture);

        // Add to townsquare
        if (onAdd) {
          await onAdd('picture', newPicture);
        } else {
          // Calculate proper dimensions from uploaded image
          const imageUrl = picturesAPI.getUrl(newPicture.path);
          const dims = await getImageDimensions(imageUrl);

          await townsquareAPI.addItem({
            objectType: 'picture',
            objectId: newPicture.id,
            x: Math.floor(Math.random() * 500 + 100),
            y: Math.floor(Math.random() * 300 + 100),
            width: dims.width,
            height: dims.height,
            zIndex: currentZIndex++,
            rotation: 0,
          });
        }
      }
      toast.success(`Uploaded and added ${files.length} photo(s) to townsquare`);
      // Trigger townsquare canvas to reload
      window.dispatchEvent(new CustomEvent('townsquare-items-updated'));
      onClose();
    } catch (error) {
      console.error('Error uploading pictures:', error);
      toast.error('Failed to upload photos');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;

    setIsUploading(true);

    try {
      let currentZIndex = maxZIndex + 1;
      for (const file of selectedFiles) {
        // Upload file to library
        const response = await filesAPI.upload(file);
        const newFile = response.data;
        addFile(newFile);

        // Add to townsquare
        if (onAdd) {
          await onAdd('file', newFile);
        } else {
          await townsquareAPI.addItem({
            objectType: 'file',
            objectId: newFile.id,
            x: Math.floor(Math.random() * 500 + 100),
            y: Math.floor(Math.random() * 300 + 100),
            width: 300,
            height: 200,
            zIndex: currentZIndex++,
            rotation: 0,
          });
        }
      }
      toast.success(`Uploaded and added ${selectedFiles.length} file(s) to townsquare`);
      // Trigger townsquare canvas to reload
      window.dispatchEvent(new CustomEvent('townsquare-items-updated'));
      onClose();
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateText = async () => {
    setIsUploading(true);

    try {
      // Create empty text card
      const response = await textsAPI.create({
        content: '',
        textType: 'insight',
      });
      const newText = response.data;
      addText(newText);

      // Add to townsquare with autoEdit flag
      if (onAdd) {
        await onAdd('text', newText);
      } else {
        await townsquareAPI.addItem({
          objectType: 'text',
          objectId: newText.id,
          x: Math.floor(Math.random() * 500 + 100),
          y: Math.floor(Math.random() * 300 + 100),
          width: 300,
          height: 200,
          zIndex: maxZIndex + 1,
          rotation: 0,
          itemMetadata: {
            autoEdit: true,
          },
        });
      }
      toast.success('Created new text card');
      // Trigger townsquare canvas to reload
      window.dispatchEvent(new CustomEvent('townsquare-items-updated'));
      onClose();
    } catch (error) {
      console.error('Error creating text:', error);
      toast.error('Failed to create text');
    } finally {
      setIsUploading(false);
    }
  };

  const renderObject = (object) => {
    const props = {
      onClick: () => handleAddToTownsquare(object),
      className: 'cursor-pointer',
    };

    switch (selectedType) {
      case 'event':
        return <EventCard key={object.id} event={object} {...props} />;
      case 'picture':
        return <PictureCard key={object.id} picture={object} {...props} />;
      case 'file':
        return <FileCard key={object.id} file={object} {...props} />;
      case 'text':
        return <TextCard key={object.id} text={object} {...props} />;
      case 'widget':
        return null;
      default:
        return null;
    }
  };

  const handleAddWidgetDrawing = async () => {
    try {
      await townsquareAPI.addItem({
        objectType: 'widget',
        objectId: 'drawing',
        x: Math.floor(Math.random() * 500 + 100),
        y: Math.floor(Math.random() * 300 + 100),
        width: 640,
        height: 480,
        zIndex: maxZIndex + 1,
        rotation: 0,
        itemMetadata: {
          widgetType: 'drawing',
          strokes: [],
          backgroundColor: '#ffffff',
          penColor: '#111827',
          penSize: 3,
        },
      });
      window.dispatchEvent(new CustomEvent('townsquare-items-updated'));
      onClose();
    } catch (error) {
      console.error('Error adding drawing widget:', error);
    }
  };

  const handleAddWidgetYoutube = async () => {
    try {
      const url = youtubeUrl.trim();
      if (!url) return;
      await townsquareAPI.addItem({
        objectType: 'widget',
        objectId: 'youtube',
        x: Math.floor(Math.random() * 500 + 100),
        y: Math.floor(Math.random() * 300 + 100),
        width: 360,
        height: 220,
        zIndex: maxZIndex + 1,
        rotation: 0,
        itemMetadata: {
          widgetType: 'youtube',
          url,
        },
      });
      window.dispatchEvent(new CustomEvent('townsquare-items-updated'));
      onClose();
    } catch (error) {
      console.error('Error adding YouTube widget:', error);
    }
  };

  const objects = getObjects();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {['event', 'picture', 'file', 'text', 'widget'].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`flex-1 px-4 py-3 text-sm font-medium capitalize ${
                selectedType === type
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {type}s
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {objects.length === 0 && selectedType === 'event' ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No {selectedType}s found. Create one first!
            </div>
          ) : selectedType === 'widget' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
                <div className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Drawing</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">Free-draw card with persistent strokes.</div>
                <button
                  onClick={handleAddWidgetDrawing}
                  className="px-3 py-2 text-sm rounded bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Add Drawing Widget
                </button>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
                <div className="text-lg font-semibold text-gray-900 dark:text-white mb-2">YouTube</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">Embed a YouTube video by URL.</div>
                <input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="w-full mb-3 px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
                <button
                  onClick={handleAddWidgetYoutube}
                  className="px-3 py-2 text-sm rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                  disabled={!youtubeUrl.trim()}
                >
                  Add YouTube Widget
                </button>
              </div>
              {isGenaiEnabled ? (
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
                  <div className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Generate image</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Places an empty card with a Generate button to create an AI image. Image is not saved in photo library.
                  </div>
                  <input
                    type="text"
                    placeholder="Optional default prompt"
                    value={genDefaultPrompt}
                    onChange={(e) => setGenDefaultPrompt(e.target.value)}
                    className="w-full mb-3 px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  />
                  <button
                    onClick={async () => {
                      try {
                        await townsquareAPI.addItem({
                          objectType: 'widget',
                          objectId: 'genimage',
                          x: Math.floor(Math.random() * 500 + 100),
                          y: Math.floor(Math.random() * 300 + 100),
                          width: 640,
                          height: 360,
                          zIndex: maxZIndex + 1,
                          rotation: 0,
                          itemMetadata: {
                            widgetType: 'genimage',
                            imageBase64: null,
                            lastPrompt: genDefaultPrompt || '',
                          },
                        });
                        window.dispatchEvent(new CustomEvent('townsquare-items-updated'));
                        onClose();
                      } catch (error) {
                        console.error('Error adding generate image widget:', error);
                      }
                    }}
                    className="px-3 py-2 text-sm rounded bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Add Generate Image Widget
                  </button>
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800 opacity-70">
                  <div className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Generate image</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Disabled until `GEMINI_API_KEY` is configured on the backend.
                  </div>
                  <button className="px-3 py-2 text-sm rounded bg-gray-400 text-white cursor-not-allowed" disabled>
                    Add Generate Image Widget
                  </button>
                </div>
              )}
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
                <div className="text-lg font-semibold text-gray-900 dark:text-white mb-2">List</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">Todo-style list with confetti when items are checked off.</div>
                <input
                  type="text"
                  placeholder="Optional list title"
                  value={listTitle}
                  onChange={(e) => setListTitle(e.target.value)}
                  className="w-full mb-3 px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
                <button
                  onClick={async () => {
                    try {
                      await townsquareAPI.addItem({
                        objectType: 'widget',
                        objectId: 'list',
                        x: Math.floor(Math.random() * 500 + 100),
                        y: Math.floor(Math.random() * 300 + 100),
                        width: 360,
                        height: 300,
                        zIndex: maxZIndex + 1,
                        rotation: 0,
                        itemMetadata: {
                          widgetType: 'list',
                          title: listTitle || '',
                          items: [],
                        },
                      });
                      window.dispatchEvent(new CustomEvent('townsquare-items-updated'));
                      onClose();
                    } catch (error) {
                      console.error('Error adding list widget:', error);
                    }
                  }}
                  className="px-3 py-2 text-sm rounded bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Add List Widget
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Add '+' button for pictures */}
              {selectedType === 'picture' && (
                <>
                  <div
                    onClick={() => pictureInputRef.current?.click()}
                    className="aspect-square rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 flex items-center justify-center cursor-pointer transition-colors bg-gray-50 dark:bg-gray-800"
                  >
                    <Plus className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                  </div>
                  <input
                    ref={pictureInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePictureUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </>
              )}

              {/* Add '+' button for files */}
              {selectedType === 'file' && (
                <>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 flex items-center justify-center cursor-pointer transition-colors bg-gray-50 dark:bg-gray-800 h-48"
                  >
                    <Plus className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </>
              )}

              {/* Add '+' button for texts */}
              {selectedType === 'text' && (
                <div
                  onClick={handleCreateText}
                  className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 flex items-center justify-center cursor-pointer transition-colors bg-gray-50 dark:bg-gray-800 h-48"
                >
                  <Plus className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                </div>
              )}

              {objects.map((object) => renderObject(object))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ObjectPicker;

