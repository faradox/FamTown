/**
 * TownsquareCanvas component - main canvas for the townsquare
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import { useTownsquareStore } from '../../stores/useTownsquareStore';
import { useObjectsStore } from '../../stores/useObjectsStore';
import { useViewConfigStore } from '../../stores/useViewConfigStore';
import { townsquareAPI } from '../../services/townsquareAPI';
import TownsquareObject from '../objects/TownsquareObject';

// Virtual canvas size (large enough to act as "infinite")
const VIRTUAL_CANVAS_SIZE = 10000;

const TownsquareCanvas = () => {
  const { items, setItems, deselectItem, zoom, panX, panY, setZoom, setPan } = useTownsquareStore();
  const { getObject, setEvents, setPictures, setFiles, setTexts } = useObjectsStore();
  const { getBackgroundStyle } = useViewConfigStore();
  const backgroundStyle = getBackgroundStyle('townsquare');

  const canvasRef = useRef(null);
  const viewportRef = useRef(null);
  const stageRef = useRef(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [touches, setTouches] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [visibleItemIds, setVisibleItemIds] = useState(new Set());
  const viewportCheckTimeoutRef = useRef(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    loadTownsquareItems();
  }, []);

  // Listen for townsquare items updates
  useEffect(() => {
    const handleTownsquareUpdate = () => {
      loadTownsquareItems();
    };

    window.addEventListener('townsquare-items-updated', handleTownsquareUpdate);
    return () => window.removeEventListener('townsquare-items-updated', handleTownsquareUpdate);
  }, []);

  const loadTownsquareItems = async () => {
    try {
      // Fetch items plus only referenced objects
      const response = await townsquareAPI.getCombined();
      const data = response.data;
      setItems(data.items || []);
      if (data.objects) {
        if (Array.isArray(data.objects.events)) setEvents(data.objects.events);
        if (Array.isArray(data.objects.pictures)) setPictures(data.objects.pictures);
        if (Array.isArray(data.objects.files)) setFiles(data.objects.files);
        if (Array.isArray(data.objects.texts)) setTexts(data.objects.texts);
      }
    } catch (error) {
      console.error('Error loading townsquare items:', error);
    }
  };

  // Check if an item is in viewport
  const isItemInViewport = (item, viewportWidth, viewportHeight) => {
    // Transform item bounds to screen coordinates
    const itemScreenX = item.x * zoom + panX;
    const itemScreenY = item.y * zoom + panY;
    const itemScreenWidth = item.width * zoom;
    const itemScreenHeight = item.height * zoom;
    
    // Check if item rectangle intersects with viewport (0,0 to viewportWidth, viewportHeight)
    const isVisible = !(
      itemScreenX + itemScreenWidth < 0 ||
      itemScreenY + itemScreenHeight < 0 ||
      itemScreenX > viewportWidth ||
      itemScreenY > viewportHeight
    );
    
    return isVisible;
  };

  // Update visible items (debounced)
  const updateVisibleItems = useCallback(() => {
    if (viewportCheckTimeoutRef.current) {
      clearTimeout(viewportCheckTimeoutRef.current);
    }

    viewportCheckTimeoutRef.current = setTimeout(() => {
      if (!viewportRef.current) {
        return;
      }

      const viewportRect = viewportRef.current.getBoundingClientRect();
      const viewportWidth = viewportRect.width;
      const viewportHeight = viewportRect.height;

      const nextVisibleIds = new Set();
      for (const item of items) {
        if (isItemInViewport(item, viewportWidth, viewportHeight)) {
          nextVisibleIds.add(item.id);
        }
      }

      setVisibleItemIds((current) => {
        if (current.size === nextVisibleIds.size) {
          let isSame = true;
          for (const id of nextVisibleIds) {
            if (!current.has(id)) {
              isSame = false;
              break;
            }
          }
          if (isSame) {
            return current;
          }
        }

        return nextVisibleIds;
      });
    }, 150);
  }, [items, panX, panY, zoom]);

  // Update visible items when pan, zoom, or items change
  useEffect(() => {
    updateVisibleItems();
    return () => {
      if (viewportCheckTimeoutRef.current) {
        clearTimeout(viewportCheckTimeoutRef.current);
        viewportCheckTimeoutRef.current = null;
      }
    };
  }, [updateVisibleItems]);

  useEffect(() => {
    return () => {
      if (viewportCheckTimeoutRef.current) {
        clearTimeout(viewportCheckTimeoutRef.current);
      }
    };
  }, []);

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
    // Only deselect if clicking on the canvas itself (not on a child object), not during panning
    if (!isPanning && (e.target === canvasRef.current || e.target === viewportRef.current)) {
      deselectItem();
    }
  };

  // Mouse wheel zoom (Stage)
  const handleStageWheel = (e) => {
    e.evt.preventDefault();
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const mouseX = (e.evt?.clientX || 0) - rect.left;
    const mouseY = (e.evt?.clientY || 0) - rect.top;
    const canvasX = (mouseX - panX) / zoom;
    const canvasY = (mouseY - panY) / zoom;
    const delta = -(e.evt?.deltaY || 0);
    const zoomFactor = delta > 0 ? 1.1 : 0.9;
    const newZoom = zoom * zoomFactor;
    const newPanX = mouseX - canvasX * newZoom;
    const newPanY = mouseY - canvasY * newZoom;
    setZoom(newZoom);
    setPan(newPanX, newPanY);
  };

  // Panning with mouse on Stage background
  const handleStageMouseDown = (e) => {
    setIsPanning(true);
    setPanStart({ x: (e.evt?.clientX || 0) - panX, y: (e.evt?.clientY || 0) - panY });
    e.evt?.preventDefault?.();
  };

  const handleMouseMove = (e) => {
    if (!isPanning) return;

    const newPanX = (e.clientX ?? e.evt?.clientX) - panStart.x;
    const newPanY = (e.clientY ?? e.evt?.clientY) - panStart.y;
    setPan(newPanX, newPanY);
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Touch gestures
  const handleTouchStart = (e) => {
    (e.evt?.preventDefault?.() || e.preventDefault?.());
    const touchArray = Array.from((e.evt?.touches) || e.touches || []);
    setTouches(touchArray);

    if (touchArray.length === 1) {
      // Single touch - only start panning if touching the canvas background
      const touch = touchArray[0];
      setIsPanning(true);
      setPanStart({ x: touch.clientX - panX, y: touch.clientY - panY });
    }
  };

  const handleTouchMove = (e) => {
    (e.evt?.preventDefault?.() || e.preventDefault?.());
    const touchArray = Array.from((e.evt?.touches) || e.touches || []);

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

  // Add/remove global listeners for panning continuation outside Stage
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

  // Track viewport size for Stage sizing
  useEffect(() => {
    const updateSize = () => {
      if (!viewportRef.current) return;
      const rect = viewportRef.current.getBoundingClientRect();
      setStageSize({ width: rect.width, height: rect.height });
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    if (viewportRef.current) ro.observe(viewportRef.current);
    window.addEventListener('resize', updateSize);
    return () => {
      window.removeEventListener('resize', updateSize);
      ro.disconnect();
    };
  }, []);

  // Stage handles wheel; no DOM wheel listener needed

  return (
    <div
      ref={viewportRef}
      onClick={handleCanvasClick}
      className={`absolute inset-0 overflow-hidden`}
      style={{
        ...backgroundStyle,
        cursor: isPanning ? 'grabbing' : 'grab',
        touchAction: 'none',
        overscrollBehavior: 'none',
      }}
    >
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        listening={true}
        onWheel={handleStageWheel}
        onMouseDown={handleStageMouseDown}
        onClick={() => {
          if (!isPanning) {
            deselectItem();
          }
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ position: 'absolute', inset: 0 }}
      >
        <Layer listening={true}>
          <Rect x={0} y={0} width={stageSize.width} height={stageSize.height} fillEnabled={false} listening={true} />
        </Layer>
      </Stage>
      <div
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{
          position: 'absolute',
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: '0 0',
          touchAction: 'none',
        }}
      >
        {items.map((item) => {
          const objectData = getObject(item.objectType, item.objectId);
          const isVisible = visibleItemIds.has(item.id);
          return (
            <TownsquareObject
              key={item.id}
              item={item}
              objectData={objectData}
              isVisible={isVisible}
            />
          );
        })}
      </div>
    </div>
  );
};

export default TownsquareCanvas;
