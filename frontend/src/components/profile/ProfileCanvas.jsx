/**
 * ProfileCanvas component - canvas for user profile view
 * Similar to TownsquareCanvas but for individual profiles
 */

import React, { useEffect, useRef, useState } from 'react';
import { useProfileStore } from '../../stores/useProfileStore';
import { useObjectsStore } from '../../stores/useObjectsStore';
import { useViewConfigStore } from '../../stores/useViewConfigStore';
import { profileAPI } from '../../services/profileAPI';
import ProfileObject from './ProfileObject';

// Virtual canvas size (large enough to act as "infinite")
const VIRTUAL_CANVAS_SIZE = 10000;

const ProfileCanvas = ({ userId, isOwner }) => {
  const { items, setItems, deselectItem, zoom, panX, panY, setZoom, setPan, setCurrentProfileUserId } = useProfileStore();
  const { events, pictures, files, texts, getObject } = useObjectsStore();
  const { getBackgroundStyle } = useViewConfigStore();
  const backgroundStyle = getBackgroundStyle('profile');

  const canvasRef = useRef(null);
  const viewportRef = useRef(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [touches, setTouches] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    setCurrentProfileUserId(userId);
    loadProfileItems();
  }, [userId]);

  // Listen for profile items updates
  useEffect(() => {
    const handleProfileUpdate = (event) => {
      if (event.detail?.userId === userId) {
        loadProfileItems();
      }
    };

    window.addEventListener('profile-items-updated', handleProfileUpdate);
    return () => window.removeEventListener('profile-items-updated', handleProfileUpdate);
  }, [userId]);

  const loadProfileItems = async () => {
    try {
      const response = await profileAPI.getItems(userId);
      setItems(response.data);
    } catch (error) {
      console.error('Error loading profile items:', error);
    }
  };

  // Calculate bounding box of all items
  const calculateBoundingBox = () => {
    if (items.length === 0) {
      return { minX: 0, minY: 0, maxX: 1920, maxY: 1080 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    items.forEach((item) => {
      minX = Math.min(minX, item.x);
      minY = Math.min(minY, item.y);
      maxX = Math.max(maxX, item.x + item.width);
      maxY = Math.max(maxY, item.y + item.height);
    });

    // Add padding
    const padding = 100;
    return {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding,
    };
  };

  // Auto-fit all objects in view
  const fitToView = () => {
    if (!viewportRef.current || items.length === 0) {
      return;
    }

    const bbox = calculateBoundingBox();
    const bboxWidth = bbox.maxX - bbox.minX;
    const bboxHeight = bbox.maxY - bbox.minY;

    const viewportRect = viewportRef.current.getBoundingClientRect();
    const viewportWidth = viewportRect.width;
    const viewportHeight = viewportRect.height;

    // Calculate zoom to fit
    const zoomX = viewportWidth / bboxWidth;
    const zoomY = viewportHeight / bboxHeight;
    const newZoom = Math.min(zoomX, zoomY, 1); // Don't zoom in beyond 1x

    // Calculate pan to center
    const newPanX = (viewportWidth - bboxWidth * newZoom) / 2 - bbox.minX * newZoom;
    const newPanY = (viewportHeight - bboxHeight * newZoom) / 2 - bbox.minY * newZoom;

    setZoom(newZoom);
    setPan(newPanX, newPanY);
    setIsInitialized(true);
  };

  // Auto-fit when items are loaded
  useEffect(() => {
    if (items.length > 0 && !isInitialized && viewportRef.current) {
      // Small delay to ensure viewport is properly sized
      setTimeout(fitToView, 100);
    }
  }, [items, isInitialized]);

  const handleCanvasClick = (e) => {
    // Only deselect if clicking on the canvas itself, not during panning
    if (!isPanning && e.target === canvasRef.current) {
      deselectItem();
    }
  };

  // Mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();

    const rect = viewportRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate mouse position in canvas coordinates before zoom
    const canvasX = (mouseX - panX) / zoom;
    const canvasY = (mouseY - panY) / zoom;

    // Calculate new zoom level
    const delta = -e.deltaY;
    const zoomFactor = delta > 0 ? 1.1 : 0.9;
    const newZoom = zoom * zoomFactor;

    // Calculate new pan to keep mouse position fixed
    const newPanX = mouseX - canvasX * newZoom;
    const newPanY = mouseY - canvasY * newZoom;

    setZoom(newZoom);
    setPan(newPanX, newPanY);
  };

  // Panning with mouse
  const handleMouseDown = (e) => {
    // Only start panning if clicking on the canvas background (not on objects)
    if (e.target === canvasRef.current || e.target === viewportRef.current) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e) => {
    if (!isPanning) return;

    const newPanX = e.clientX - panStart.x;
    const newPanY = e.clientY - panStart.y;
    setPan(newPanX, newPanY);
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Touch gestures
  const handleTouchStart = (e) => {
    const touchArray = Array.from(e.touches);
    setTouches(touchArray);

    if (touchArray.length === 1) {
      // Single touch - only start panning if touching the canvas background
      if (e.target === canvasRef.current || e.target === viewportRef.current) {
        const touch = touchArray[0];
        setIsPanning(true);
        setPanStart({ x: touch.clientX - panX, y: touch.clientY - panY });
      }
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    const touchArray = Array.from(e.touches);

    if (touchArray.length === 1 && isPanning) {
      // Single touch - panning
      const touch = touchArray[0];
      const newPanX = touch.clientX - panStart.x;
      const newPanY = touch.clientY - panStart.y;
      setPan(newPanX, newPanY);
    } else if (touchArray.length === 2 && touches.length === 2) {
      // Two touches - pinch to zoom
      const prevTouch1 = touches[0];
      const prevTouch2 = touches[1];
      const prevDist = Math.hypot(
        prevTouch2.clientX - prevTouch1.clientX,
        prevTouch2.clientY - prevTouch1.clientY
      );

      const currTouch1 = touchArray[0];
      const currTouch2 = touchArray[1];
      const currDist = Math.hypot(
        currTouch2.clientX - currTouch1.clientX,
        currTouch2.clientY - currTouch1.clientY
      );

      const scale = currDist / prevDist;
      const newZoom = zoom * scale;

      // Calculate center point between touches
      const rect = viewportRef.current.getBoundingClientRect();
      const centerX = ((currTouch1.clientX + currTouch2.clientX) / 2) - rect.left;
      const centerY = ((currTouch1.clientY + currTouch2.clientY) / 2) - rect.top;

      // Calculate canvas position at center
      const canvasX = (centerX - panX) / zoom;
      const canvasY = (centerY - panY) / zoom;

      // Calculate new pan to keep center fixed
      const newPanX = centerX - canvasX * newZoom;
      const newPanY = centerY - canvasY * newZoom;

      setZoom(newZoom);
      setPan(newPanX, newPanY);
    }

    setTouches(touchArray);
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
    setTouches([]);
  };

  // Add/remove event listeners for mouse panning
  useEffect(() => {
    if (isPanning) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isPanning, panStart]);

  return (
    <div
      ref={viewportRef}
      className={`absolute inset-0 overflow-hidden`}
      style={{
        ...backgroundStyle,
        cursor: isPanning ? 'grabbing' : 'grab',
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleCanvasClick}
    >
      <div
        ref={canvasRef}
        style={{
          position: 'absolute',
          width: VIRTUAL_CANVAS_SIZE,
          height: VIRTUAL_CANVAS_SIZE,
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {items.map((item) => {
          const objectData = getObject(item.objectType, item.objectId);
          return (
            <ProfileObject
              key={item.id}
              item={item}
              objectData={objectData}
              isEditable={isOwner}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ProfileCanvas;
