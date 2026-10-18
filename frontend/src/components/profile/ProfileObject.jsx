/**
 * ProfileObject component - wrapper for draggable/resizable objects on profile canvas
 * Similar to TownsquareObject but for profile canvases
 */

import React, { useState, useRef, useEffect } from 'react';
import { useProfileStore } from '../../stores/useProfileStore';
import { profileAPI } from '../../services/profileAPI';
import EventCard from '../objects/EventCard';
import PictureCard from '../objects/PictureCard';
import FileCard from '../objects/FileCard';
import TextCard from '../objects/TextCard';

const ProfileObject = ({ item, objectData, isEditable }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  // A ref, not state: document listeners are bound once per gesture and would
  // otherwise read the value from when the gesture started (null)
  const pendingUpdateRef = useRef(null);
  const elementRef = useRef(null);

  const { updateItem, bringToFront, selectedItemId, selectItem, removeItem, zoom, currentProfileUserId } = useProfileStore();

  const handleMouseDown = (e) => {
    if (!isEditable) return;

    if (e.target.classList.contains('resize-handle') ||
        e.target.classList.contains('rotate-handle') ||
        e.target.closest('button')) {
      return;
    }

    e.preventDefault();
    setIsDragging(true);
    bringToFront(item.id);
    selectItem(item.id);

    const rect = elementRef.current.getBoundingClientRect();
    const parent = elementRef.current.parentElement;
    const parentRect = parent.getBoundingClientRect();

    // Calculate offset in canvas coordinates (accounting for zoom)
    setDragOffset({
      x: (e.clientX - parentRect.left) / zoom - item.x,
      y: (e.clientY - parentRect.top) / zoom - item.y,
    });
  };

  const handleTouchStart = (e) => {
    if (!isEditable) return;

    if (e.target.classList.contains('resize-handle') ||
        e.target.classList.contains('rotate-handle') ||
        e.target.closest('button')) {
      return;
    }

    e.stopPropagation();
    const touch = e.touches[0];
    setIsDragging(true);
    bringToFront(item.id);
    selectItem(item.id);

    const parent = elementRef.current.parentElement;
    const parentRect = parent.getBoundingClientRect();

    // Calculate offset in canvas coordinates (accounting for zoom)
    setDragOffset({
      x: (touch.clientX - parentRect.left) / zoom - item.x,
      y: (touch.clientY - parentRect.top) / zoom - item.y,
    });
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;

    e.preventDefault();
    e.stopPropagation();
    const touch = e.touches[0];
    const parent = elementRef.current.parentElement;
    const parentRect = parent.getBoundingClientRect();

    // Account for zoom when calculating position
    let newX = (touch.clientX - parentRect.left) / zoom - dragOffset.x;
    let newY = (touch.clientY - parentRect.top) / zoom - dragOffset.y;

    // Round to nearest integer for cleaner positioning
    newX = Math.round(newX);
    newY = Math.round(newY);

    updateItem(item.id, { x: newX, y: newY });
    pendingUpdateRef.current = { x: newX, y: newY };
  };

  const handleTouchEnd = async () => {
    if (isDragging) {
      setIsDragging(false);
      const update = pendingUpdateRef.current;
      pendingUpdateRef.current = null;
      if (update) {
        try {
          await profileAPI.updateItem(currentProfileUserId, item.id, update);
        } catch (error) {
          console.error('Error updating item position:', error);
        }
      }
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const parent = elementRef.current.parentElement;
    const parentRect = parent.getBoundingClientRect();

    // Account for zoom when calculating position
    let newX = (e.clientX - parentRect.left) / zoom - dragOffset.x;
    let newY = (e.clientY - parentRect.top) / zoom - dragOffset.y;

    // Round to nearest integer for cleaner positioning
    newX = Math.round(newX);
    newY = Math.round(newY);

    updateItem(item.id, { x: newX, y: newY });
    pendingUpdateRef.current = { x: newX, y: newY };
  };

  const handleMouseUp = async () => {
    if (isDragging) {
      setIsDragging(false);
      const update = pendingUpdateRef.current;
      pendingUpdateRef.current = null;
      if (update) {
        try {
          await profileAPI.updateItem(currentProfileUserId, item.id, update);
        } catch (error) {
          console.error('Error updating item position:', error);
        }
      }
    }
  };

  const handleResizeMouseDown = (e) => {
    if (!isEditable) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    bringToFront(item.id);
    selectItem(item.id);
  };

  const handleResizeTouchStart = (e) => {
    if (!isEditable) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    bringToFront(item.id);
    selectItem(item.id);
  };

  const handleResizeTouchMove = (e) => {
    if (!isResizing) return;

    e.preventDefault();
    e.stopPropagation();
    const touch = e.touches[0];
    const parent = elementRef.current.parentElement;
    const parentRect = parent.getBoundingClientRect();

    // Account for zoom when calculating size
    const newWidth = Math.round(Math.max(100, (touch.clientX - parentRect.left) / zoom - item.x));
    const newHeight = Math.round(Math.max(100, (touch.clientY - parentRect.top) / zoom - item.y));

    updateItem(item.id, { width: newWidth, height: newHeight });
    pendingUpdateRef.current = { width: newWidth, height: newHeight };
  };

  const handleResizeTouchEnd = async () => {
    if (isResizing) {
      setIsResizing(false);
      const update = pendingUpdateRef.current;
      pendingUpdateRef.current = null;
      if (update) {
        try {
          await profileAPI.updateItem(currentProfileUserId, item.id, update);
        } catch (error) {
          console.error('Error updating item size:', error);
        }
      }
    }
  };

  const handleResizeMouseMove = (e) => {
    if (!isResizing) return;

    const parent = elementRef.current.parentElement;
    const parentRect = parent.getBoundingClientRect();

    // Account for zoom when calculating size
    const newWidth = Math.round(Math.max(100, (e.clientX - parentRect.left) / zoom - item.x));
    const newHeight = Math.round(Math.max(100, (e.clientY - parentRect.top) / zoom - item.y));

    updateItem(item.id, { width: newWidth, height: newHeight });
    pendingUpdateRef.current = { width: newWidth, height: newHeight };
  };

  const handleResizeMouseUp = async () => {
    if (isResizing) {
      setIsResizing(false);
      const update = pendingUpdateRef.current;
      pendingUpdateRef.current = null;
      if (update) {
        try {
          await profileAPI.updateItem(currentProfileUserId, item.id, update);
        } catch (error) {
          console.error('Error updating item size:', error);
        }
      }
    }
  };

  const handleRotateMouseDown = (e) => {
    if (!isEditable) return;
    e.preventDefault();
    e.stopPropagation();
    setIsRotating(true);
    bringToFront(item.id);
    selectItem(item.id);
  };

  const handleRotateTouchStart = (e) => {
    if (!isEditable) return;
    e.preventDefault();
    e.stopPropagation();
    setIsRotating(true);
    bringToFront(item.id);
    selectItem(item.id);
  };

  const handleRotateTouchMove = (e) => {
    if (!isRotating) return;

    e.preventDefault();
    e.stopPropagation();
    const touch = e.touches[0];
    const rect = elementRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const angle = Math.atan2(touch.clientY - centerY, touch.clientX - centerX);
    const degrees = (angle * 180) / Math.PI + 90; // Add 90 to adjust for top-center reference

    updateItem(item.id, { rotation: Math.round(degrees) });
    pendingUpdateRef.current = { rotation: Math.round(degrees) };
  };

  const handleRotateTouchEnd = async () => {
    if (isRotating) {
      setIsRotating(false);
      const update = pendingUpdateRef.current;
      pendingUpdateRef.current = null;
      if (update) {
        try {
          await profileAPI.updateItem(currentProfileUserId, item.id, update);
        } catch (error) {
          console.error('Error updating item rotation:', error);
        }
      }
    }
  };

  const handleRotateMouseMove = (e) => {
    if (!isRotating) return;

    const rect = elementRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    const degrees = (angle * 180) / Math.PI + 90; // Add 90 to adjust for top-center reference

    updateItem(item.id, { rotation: Math.round(degrees) });
    pendingUpdateRef.current = { rotation: Math.round(degrees) };
  };

  const handleRotateMouseUp = async () => {
    if (isRotating) {
      setIsRotating(false);
      const update = pendingUpdateRef.current;
      pendingUpdateRef.current = null;
      if (update) {
        try {
          await profileAPI.updateItem(currentProfileUserId, item.id, update);
        } catch (error) {
          console.error('Error updating item rotation:', error);
        }
      }
    }
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, dragOffset, zoom]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMouseMove);
      document.addEventListener('mouseup', handleResizeMouseUp);
      document.addEventListener('touchmove', handleResizeTouchMove, { passive: false });
      document.addEventListener('touchend', handleResizeTouchEnd);
      return () => {
        document.removeEventListener('mousemove', handleResizeMouseMove);
        document.removeEventListener('mouseup', handleResizeMouseUp);
        document.removeEventListener('touchmove', handleResizeTouchMove);
        document.removeEventListener('touchend', handleResizeTouchEnd);
      };
    }
  }, [isResizing, zoom]);

  useEffect(() => {
    if (isRotating) {
      document.addEventListener('mousemove', handleRotateMouseMove);
      document.addEventListener('mouseup', handleRotateMouseUp);
      document.addEventListener('touchmove', handleRotateTouchMove, { passive: false });
      document.addEventListener('touchend', handleRotateTouchEnd);
      return () => {
        document.removeEventListener('mousemove', handleRotateMouseMove);
        document.removeEventListener('mouseup', handleRotateMouseUp);
        document.removeEventListener('touchmove', handleRotateTouchMove);
        document.removeEventListener('touchend', handleRotateTouchEnd);
      };
    }
  }, [isRotating]);

  const handleFontSizeChange = async (newFontSize) => {
    if (!isEditable) return;
    const newMetadata = { ...(item.itemMetadata || {}), fontSize: newFontSize };
    updateItem(item.id, { itemMetadata: newMetadata });
    try {
      await profileAPI.updateItem(currentProfileUserId, item.id, { itemMetadata: newMetadata });
    } catch (error) {
      console.error('Error updating font size:', error);
    }
  };

  const handleBackgroundColorChange = async (newColor) => {
    if (!isEditable) return;
    const newMetadata = { ...(item.itemMetadata || {}), backgroundColor: newColor };
    updateItem(item.id, { itemMetadata: newMetadata });
    try {
      await profileAPI.updateItem(currentProfileUserId, item.id, { itemMetadata: newMetadata });
    } catch (error) {
      console.error('Error updating background color:', error);
    }
  };

  const handleRemove = async (e) => {
    if (!isEditable) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      await profileAPI.removeItem(currentProfileUserId, item.id);
      removeItem(item.id);
    } catch (error) {
      console.error('Error removing item from profile:', error);
    }
  };

  const renderObject = () => {
    const props = {
      className: 'w-full h-full',
      onClick: (e) => e.stopPropagation(),
    };

    switch (item.objectType) {
      case 'event':
        return objectData ? <EventCard event={objectData} {...props} /> : null;
      case 'picture':
        return objectData ? <PictureCard picture={objectData} {...props} /> : null;
      case 'file':
        return objectData ? <FileCard file={objectData} {...props} /> : null;
      case 'text':
        return objectData ? (
          <TextCard
            text={objectData}
            {...props}
            isSelected={isSelected}
            fontSize={item.itemMetadata?.fontSize || 14}
            backgroundColor={item.itemMetadata?.backgroundColor || '#ffffff'}
            onFontSizeChange={isEditable ? handleFontSizeChange : undefined}
            onBackgroundColorChange={isEditable ? handleBackgroundColorChange : undefined}
            forceDarkText={true}
          />
        ) : null;
      default:
        return null;
    }
  };

  const isSelected = isEditable && selectedItemId === item.id;

  return (
    <div
      ref={elementRef}
      style={{
        position: 'absolute',
        left: item.x,
        top: item.y,
        width: item.width,
        height: item.height,
        zIndex: item.zIndex || 0,
        transform: `rotate(${item.rotation || 0}deg)`,
      }}
      className={`select-none ${isEditable && (isDragging ? 'cursor-grabbing' : 'cursor-grab')} ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      }`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div className="w-full h-full overflow-visible">
        {renderObject()}
      </div>

      {isSelected && isEditable && (
        <>
          <div
            className="resize-handle absolute bottom-0 right-0 w-8 h-8 md:w-4 md:h-4 bg-blue-500 cursor-se-resize"
            onMouseDown={handleResizeMouseDown}
            onTouchStart={handleResizeTouchStart}
          />
          <div
            className="rotate-handle absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 w-10 h-10 md:w-6 md:h-6 bg-green-500 rounded-full cursor-grab hover:cursor-grabbing flex items-center justify-center"
            onMouseDown={handleRotateMouseDown}
            onTouchStart={handleRotateTouchStart}
          >
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </div>
          <button
            className="absolute top-0 right-0 -translate-y-2 translate-x-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full cursor-pointer flex items-center justify-center shadow-lg transition-colors"
            onClick={handleRemove}
            title="Remove from profile"
          >
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </>
      )}
    </div>
  );
};

export default ProfileObject;
