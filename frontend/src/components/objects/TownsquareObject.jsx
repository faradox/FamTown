/**
 * TownsquareObject component - wrapper for draggable/resizable objects on canvas
 */

import React, { useState, useRef, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useTownsquareStore } from '../../stores/useTownsquareStore';
import { townsquareAPI } from '../../services/townsquareAPI';
import EventCard from './EventCard';
import PictureCard from './PictureCard';
import TownsquarePictureCard from './TownsquarePictureCard';
import FileCard from './FileCard';
import TextCard from './TextCard';
import WidgetDrawing from '../widgets/WidgetDrawing';
import WidgetYoutube from '../widgets/WidgetYoutube';
import WidgetGenImage from '../widgets/WidgetGenImage';
import WidgetList from '../widgets/WidgetList';
import { genaiAPI } from '../../services/genaiAPI';
import { useGenaiStatus } from '../../hooks/useGenaiStatus';

const TownsquareObject = ({ item, objectData, isVisible = true }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [cropEdge, setCropEdge] = useState(null); // 'top', 'right', 'bottom', 'left'
  const [cropStartPos, setCropStartPos] = useState({ x: 0, y: 0 });
  const [cropStartValues, setCropStartValues] = useState({ offsets: null, width: 0, height: 0, x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const pendingUpdateRef = useRef(null);
  const elementRef = useRef(null);
  const { enabled: isGenaiEnabled } = useGenaiStatus();

  // Helper to get current crop offsets
  const getCropOffsets = () => ({
    top: item.itemMetadata?.cropTop || 0,
    right: item.itemMetadata?.cropRight || 0,
    bottom: item.itemMetadata?.cropBottom || 0,
    left: item.itemMetadata?.cropLeft || 0,
  });

  // Check if this is a picture item
  const isPicture = item.objectType === 'picture';

  const { updateItem, bringToFront, selectItem, removeItem, selectedItemId, zoom } = useTownsquareStore(
    useShallow((state) => ({
      updateItem: state.updateItem,
      bringToFront: state.bringToFront,
      selectItem: state.selectItem,
      removeItem: state.removeItem,
      selectedItemId: state.selectedItemId,
      zoom: state.zoom,
    }))
  );

  const handleMouseDown = (e) => {
    if (e.target.classList.contains('resize-handle') ||
        e.target.classList.contains('rotate-handle') ||
        e.target.classList.contains('crop-handle') ||
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
    const touchCount = e.touches?.length || 0;
    if (touchCount > 1) {
      return;
    }
    if (e.target.classList.contains('resize-handle') ||
        e.target.classList.contains('rotate-handle') ||
        e.target.classList.contains('crop-handle') ||
        e.target.closest('button')) {
      return;
    }

    e.preventDefault();
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
    if ((e.touches?.length || 0) > 1) {
      return;
    }

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
      if (pendingUpdateRef.current) {
        try {
          await townsquareAPI.updateItem(item.id, pendingUpdateRef.current);
          pendingUpdateRef.current = null;
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
      if (pendingUpdateRef.current) {
        try {
          await townsquareAPI.updateItem(item.id, pendingUpdateRef.current);
          pendingUpdateRef.current = null;
        } catch (error) {
          console.error('Error updating item position:', error);
        }
      }
    }
  };

  const handleResizeMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    bringToFront(item.id);
    selectItem(item.id);
  };

  const handleResizeTouchStart = (e) => {
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
    let newWidth = Math.round(Math.max(100, (touch.clientX - parentRect.left) / zoom - item.x));
    let newHeight = Math.round(Math.max(100, (touch.clientY - parentRect.top) / zoom - item.y));

    // For pictures, maintain aspect ratio (scale proportionally)
    if (isPicture) {
      const aspectRatio = item.width / item.height;
      // Use diagonal distance to determine scale factor
      const scaleFactor = Math.max(newWidth / item.width, newHeight / item.height);
      newWidth = Math.round(Math.max(100, item.width * scaleFactor));
      newHeight = Math.round(Math.max(100, item.height * scaleFactor));
    }

    updateItem(item.id, { width: newWidth, height: newHeight });
    pendingUpdateRef.current = { width: newWidth, height: newHeight };
  };

  const handleResizeTouchEnd = async () => {
    if (isResizing) {
      setIsResizing(false);
      if (pendingUpdateRef.current) {
        try {
          await townsquareAPI.updateItem(item.id, pendingUpdateRef.current);
          pendingUpdateRef.current = null;
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
    let newWidth = Math.round(Math.max(100, (e.clientX - parentRect.left) / zoom - item.x));
    let newHeight = Math.round(Math.max(100, (e.clientY - parentRect.top) / zoom - item.y));

    // For pictures, maintain aspect ratio (scale proportionally)
    if (isPicture) {
      const aspectRatio = item.width / item.height;
      // Use diagonal distance to determine scale factor
      const scaleFactor = Math.max(newWidth / item.width, newHeight / item.height);
      newWidth = Math.round(Math.max(100, item.width * scaleFactor));
      newHeight = Math.round(Math.max(100, item.height * scaleFactor));
    }

    updateItem(item.id, { width: newWidth, height: newHeight });
    pendingUpdateRef.current = { width: newWidth, height: newHeight };
  };

  const handleResizeMouseUp = async () => {
    if (isResizing) {
      setIsResizing(false);
      if (pendingUpdateRef.current) {
        try {
          await townsquareAPI.updateItem(item.id, pendingUpdateRef.current);
          pendingUpdateRef.current = null;
        } catch (error) {
          console.error('Error updating item size:', error);
        }
      }
    }
  };

  const handleRotateMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsRotating(true);
    bringToFront(item.id);
    selectItem(item.id);
  };

  const handleRotateTouchStart = (e) => {
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
      if (pendingUpdateRef.current) {
        try {
          await townsquareAPI.updateItem(item.id, pendingUpdateRef.current);
          pendingUpdateRef.current = null;
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
      if (pendingUpdateRef.current) {
        try {
          await townsquareAPI.updateItem(item.id, pendingUpdateRef.current);
          pendingUpdateRef.current = null;
        } catch (error) {
          console.error('Error updating item rotation:', error);
        }
      }
    }
  };

  // Crop handlers for picture edges
  const handleCropStart = (edge) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsCropping(true);
    setCropEdge(edge);
    bringToFront(item.id);
    selectItem(item.id);

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setCropStartPos({ x: clientX, y: clientY });
    setCropStartValues({
      offsets: getCropOffsets(),
      width: item.width,
      height: item.height,
      x: item.x,
      y: item.y,
    });
  };

  const handleCropMove = (e) => {
    if (!isCropping || !cropEdge) return;

    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const deltaX = (clientX - cropStartPos.x) / zoom;
    const deltaY = (clientY - cropStartPos.y) / zoom;

    const { offsets, width, height, x, y } = cropStartValues;
    let newOffsets = { ...offsets };
    let newWidth = width;
    let newHeight = height;
    let newX = x;
    let newY = y;

    // Calculate the visible ratio (what portion of original is currently shown)
    const visibleWidthRatio = Math.max(0.01, (100 - offsets.left - offsets.right) / 100);
    const visibleHeightRatio = Math.max(0.01, (100 - offsets.top - offsets.bottom) / 100);

    // Calculate original image equivalent dimensions (what full image would be at current scale)
    const origWidthEquiv = width / visibleWidthRatio;
    const origHeightEquiv = height / visibleHeightRatio;

    switch (cropEdge) {
      case 'top':
        // Dragging top edge: positive deltaY = drag down = crop more from top
        const topCropDelta = (deltaY / origHeightEquiv) * 100;
        newOffsets.top = Math.max(0, Math.min(90 - offsets.bottom, offsets.top + topCropDelta));
        newHeight = Math.max(50, height - deltaY);
        newY = y + deltaY;
        break;
      case 'bottom':
        // Dragging bottom edge: negative deltaY = drag up = crop more from bottom
        const bottomCropDelta = (-deltaY / origHeightEquiv) * 100;
        newOffsets.bottom = Math.max(0, Math.min(90 - offsets.top, offsets.bottom + bottomCropDelta));
        newHeight = Math.max(50, height + deltaY);
        break;
      case 'left':
        // Dragging left edge: positive deltaX = drag right = crop more from left
        const leftCropDelta = (deltaX / origWidthEquiv) * 100;
        newOffsets.left = Math.max(0, Math.min(90 - offsets.right, offsets.left + leftCropDelta));
        newWidth = Math.max(50, width - deltaX);
        newX = x + deltaX;
        break;
      case 'right':
        // Dragging right edge: negative deltaX = drag left = crop more from right
        const rightCropDelta = (-deltaX / origWidthEquiv) * 100;
        newOffsets.right = Math.max(0, Math.min(90 - offsets.left, offsets.right + rightCropDelta));
        newWidth = Math.max(50, width + deltaX);
        break;
    }

    const newMetadata = {
      ...(item.itemMetadata || {}),
      cropTop: newOffsets.top,
      cropRight: newOffsets.right,
      cropBottom: newOffsets.bottom,
      cropLeft: newOffsets.left,
    };

    updateItem(item.id, {
      width: Math.round(newWidth),
      height: Math.round(newHeight),
      x: Math.round(newX),
      y: Math.round(newY),
      itemMetadata: newMetadata,
    });
    pendingUpdateRef.current = {
      width: Math.round(newWidth),
      height: Math.round(newHeight),
      x: Math.round(newX),
      y: Math.round(newY),
      itemMetadata: newMetadata,
    };
  };

  const handleCropEnd = async () => {
    if (isCropping) {
      setIsCropping(false);
      setCropEdge(null);
      if (pendingUpdateRef.current) {
        try {
          await townsquareAPI.updateItem(item.id, pendingUpdateRef.current);
          pendingUpdateRef.current = null;
        } catch (error) {
          console.error('Error updating crop:', error);
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

  useEffect(() => {
    if (isCropping) {
      document.addEventListener('mousemove', handleCropMove);
      document.addEventListener('mouseup', handleCropEnd);
      document.addEventListener('touchmove', handleCropMove, { passive: false });
      document.addEventListener('touchend', handleCropEnd);
      return () => {
        document.removeEventListener('mousemove', handleCropMove);
        document.removeEventListener('mouseup', handleCropEnd);
        document.removeEventListener('touchmove', handleCropMove);
        document.removeEventListener('touchend', handleCropEnd);
      };
    }
  }, [isCropping, cropEdge, cropStartPos, cropStartValues, zoom]);

  const handleFontSizeChange = async (newFontSize) => {
    const newMetadata = { ...(item.itemMetadata || {}), fontSize: newFontSize };
    updateItem(item.id, { itemMetadata: newMetadata });
    try {
      await townsquareAPI.updateItem(item.id, { itemMetadata: newMetadata });
    } catch (error) {
      console.error('Error updating font size:', error);
    }
  };

  const handleBackgroundColorChange = async (newColor) => {
    const newMetadata = { ...(item.itemMetadata || {}), backgroundColor: newColor };
    updateItem(item.id, { itemMetadata: newMetadata });
    try {
      await townsquareAPI.updateItem(item.id, { itemMetadata: newMetadata });
    } catch (error) {
      console.error('Error updating background color:', error);
    }
  };

  const handleAutoEditComplete = async () => {
    // Clear the autoEdit flag after the first edit
    const newMetadata = { ...(item.itemMetadata || {}), autoEdit: false };
    updateItem(item.id, { itemMetadata: newMetadata });
    try {
      await townsquareAPI.updateItem(item.id, { itemMetadata: newMetadata });
    } catch (error) {
      console.error('Error clearing autoEdit flag:', error);
    }
  };

  const handleRemove = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await townsquareAPI.removeItem(item.id);
      removeItem(item.id);
    } catch (error) {
      console.error('Error removing item from townsquare:', error);
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
        return objectData ? (
          <TownsquarePictureCard
            picture={objectData}
            priority={isVisible}
            cropOffsets={getCropOffsets()}
            {...props}
          />
        ) : null;
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
            onFontSizeChange={handleFontSizeChange}
            onBackgroundColorChange={handleBackgroundColorChange}
            forceDarkText={true}
            autoEdit={item.itemMetadata?.autoEdit || false}
            onAutoEditComplete={handleAutoEditComplete}
          />
        ) : null;
      case 'widget': {
        const widgetType = item.itemMetadata?.widgetType;
        if (widgetType === 'drawing') {
          return (
            <WidgetDrawing
              {...props}
              itemId={item.id}
              isSelected={isSelected}
              strokes={item.itemMetadata?.strokes || []}
              backgroundColor={item.itemMetadata?.backgroundColor || '#ffffff'}
              penColor={item.itemMetadata?.penColor || '#111827'}
              penSize={item.itemMetadata?.penSize || 3}
              onChange={async (newMetadata) => {
                const updated = { ...(item.itemMetadata || {}), ...newMetadata };
                updateItem(item.id, { itemMetadata: updated });
                try {
                  await townsquareAPI.updateItem(item.id, { itemMetadata: updated });
                } catch (error) {
                  console.error('Error updating drawing widget:', error);
                }
              }}
            />
          );
        }
        if (widgetType === 'youtube') {
          return (
            <WidgetYoutube
              {...props}
              isSelected={isSelected}
              url={item.itemMetadata?.url}
              onChange={async (newMetadata) => {
                const updated = { ...(item.itemMetadata || {}), ...newMetadata };
                updateItem(item.id, { itemMetadata: updated });
                try {
                  await townsquareAPI.updateItem(item.id, { itemMetadata: updated });
                } catch (error) {
                  console.error('Error updating youtube widget:', error);
                }
              }}
            />
          );
        }
        if (widgetType === 'genimage') {
          return (
            <WidgetGenImage
              {...props}
              isSelected={isSelected}
              imageBase64={item.itemMetadata?.imageBase64 || null}
              isEnabled={isGenaiEnabled}
              onChange={async (newMetadata) => {
                if (!isGenaiEnabled) {
                  return;
                }
                // If user provided a prompt, call backend to generate and then update metadata
                if (newMetadata && newMetadata.prompt) {
                  try {
                    const resp = await genaiAPI.generateImage(newMetadata.prompt);
                    const b64 = resp?.data?.imageBase64 || null;
                    const updated = { ...(item.itemMetadata || {}), imageBase64: b64, lastPrompt: newMetadata.prompt };
                    updateItem(item.id, { itemMetadata: updated });
                    await townsquareAPI.updateItem(item.id, { itemMetadata: updated });
                  } catch (error) {
                    console.error('Error generating image:', error);
                  }
                } else {
                  const updated = { ...(item.itemMetadata || {}), ...newMetadata };
                  updateItem(item.id, { itemMetadata: updated });
                  try {
                    await townsquareAPI.updateItem(item.id, { itemMetadata: updated });
                  } catch (error) {
                    console.error('Error updating genimage widget:', error);
                  }
                }
              }}
            />
          );
        }
        if (widgetType === 'list') {
          return (
            <WidgetList
              {...props}
              isSelected={isSelected}
              title={item.itemMetadata?.title || ''}
              items={item.itemMetadata?.items || []}
              onChange={async (newMetadata) => {
                const updated = { ...(item.itemMetadata || {}), ...newMetadata };
                updateItem(item.id, { itemMetadata: updated });
                try {
                  await townsquareAPI.updateItem(item.id, { itemMetadata: updated });
                } catch (error) {
                  console.error('Error updating list widget:', error);
                }
              }}
            />
          );
        }
        return null;
      }
      default:
        return null;
    }
  };

  const isSelected = selectedItemId === item.id;

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
        touchAction: 'none',
      }}
      className={`select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      }`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div className="w-full h-full overflow-visible">
        {renderObject()}
      </div>

      {isSelected && (
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
            title="Remove from townsquare"
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
          {/* Edge crop handles for pictures */}
          {isPicture && (
            <>
              {/* Top edge - horizontal bar */}
              <div
                className="crop-handle absolute top-0 left-4 right-4 h-2 bg-orange-500 opacity-60 hover:opacity-100 cursor-ns-resize"
                onMouseDown={handleCropStart('top')}
                onTouchStart={handleCropStart('top')}
                title="Drag to crop from top"
              />
              {/* Bottom edge - horizontal bar */}
              <div
                className="crop-handle absolute bottom-0 left-4 right-8 h-2 bg-orange-500 opacity-60 hover:opacity-100 cursor-ns-resize"
                onMouseDown={handleCropStart('bottom')}
                onTouchStart={handleCropStart('bottom')}
                title="Drag to crop from bottom"
              />
              {/* Left edge - vertical bar */}
              <div
                className="crop-handle absolute left-0 top-4 bottom-4 w-2 bg-orange-500 opacity-60 hover:opacity-100 cursor-ew-resize"
                onMouseDown={handleCropStart('left')}
                onTouchStart={handleCropStart('left')}
                title="Drag to crop from left"
              />
              {/* Right edge - vertical bar */}
              <div
                className="crop-handle absolute right-0 top-4 bottom-8 w-2 bg-orange-500 opacity-60 hover:opacity-100 cursor-ew-resize"
                onMouseDown={handleCropStart('right')}
                onTouchStart={handleCropStart('right')}
                title="Drag to crop from right"
              />
            </>
          )}
        </>
      )}
    </div>
  );
};

export default React.memo(TownsquareObject);
