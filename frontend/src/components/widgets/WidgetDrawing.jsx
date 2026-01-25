/**
 * WidgetDrawing - free draw canvas with persistent strokes via itemMetadata
 */

import React, { useEffect, useRef, useState } from 'react';

const WidgetDrawing = ({
  className,
  itemId,
  isSelected,
  strokes = [],
  backgroundColor = '#ffffff',
  penColor = '#111827',
  penSize = 3,
  onChange,
}) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentPoints, setCurrentPoints] = useState([]);
  const [devicePixelRatioValue, setDevicePixelRatioValue] = useState(1);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showPenPicker, setShowPenPicker] = useState(false);

  // Normalize points to [0,1] relative coords for persistence across resize
  const toRelative = (x, y, width, height) => ({ x: x / width, y: y / height });
  const toAbsolute = (x, y, width, height) => ({ x: x * width, y: y * height });

  const setupCanvasSize = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const dpr = window.devicePixelRatio || 1;
    setDevicePixelRatioValue(dpr);
    // Use clientWidth/Height (CSS pixels, excludes borders/scrollbars) to
    // avoid discrepancies when the parent has padding or transforms.
    const cssWidth = Math.max(1, Math.floor(container.clientWidth));
    const cssHeight = Math.max(1, Math.floor(container.clientHeight));
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    canvas.width = Math.max(1, Math.floor(cssWidth * dpr));
    canvas.height = Math.max(1, Math.floor(cssHeight * dpr));
    const ctx = canvas.getContext('2d');
    // Scale the drawing operations so all coordinates are in CSS pixels.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const drawAll = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    // Ensure context is scaled to current DPR in case it changed.
    const dpr = devicePixelRatioValue || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = canvas.clientWidth; // CSS pixels
    const h = canvas.clientHeight; // CSS pixels
    ctx.clearRect(0, 0, w, h);
    // background (support transparent)
    if (backgroundColor && backgroundColor !== 'transparent') {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, w, h);
    }

    // existing strokes
    for (const stroke of strokes) {
      const points = stroke.points || [];
      if (points.length < 2) continue;
      ctx.strokeStyle = stroke.color || penColor;
      ctx.lineWidth = stroke.size || penSize;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      const p0 = toAbsolute(points[0].x, points[0].y, w, h);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < points.length; i++) {
        const p = toAbsolute(points[i].x, points[i].y, w, h);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // current preview
    if (currentPoints.length >= 2) {
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penSize;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
      for (let i = 1; i < currentPoints.length; i++) {
        ctx.lineTo(currentPoints[i].x, currentPoints[i].y);
      }
      ctx.stroke();
    }
  };

  useEffect(() => {
    setupCanvasSize();
    const ro = new ResizeObserver(() => {
      setupCanvasSize();
      // redraw after resize
      requestAnimationFrame(drawAll);
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    drawAll();
  }, [strokes, backgroundColor, penColor, penSize, devicePixelRatioValue, currentPoints]);

  const getRelativePos = (clientX, clientY) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    // Map from viewport pixels to canvas CSS pixel coordinates.
    // This compensates for any CSS transforms (scale) applied by parents.
    const scaleX = rect.width ? canvas.clientWidth / rect.width : 1;
    const scaleY = rect.height ? canvas.clientHeight / rect.height : 1;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    return { x, y };
  };

  const handlePointerDown = (e) => {
    if (!editMode) return; // only draw in edit mode
    e.preventDefault();
    e.stopPropagation();
    const p = e.touches ? e.touches[0] : e;
    const { x, y } = getRelativePos(p.clientX, p.clientY);
    setIsDrawing(true);
    setCurrentPoints([{ x, y }]);
  };

  const handlePointerMove = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    e.stopPropagation();
    const p = e.touches ? e.touches[0] : e;
    const { x, y } = getRelativePos(p.clientX, p.clientY);
    setCurrentPoints((pts) => {
      const next = [...pts, { x, y }];
      return next;
    });
  };

  const finishStroke = () => {
    if (!isDrawing || currentPoints.length < 2) {
      setIsDrawing(false);
      setCurrentPoints([]);
      return;
    }
    const canvas = canvasRef.current;
    const w = canvas.clientWidth; // CSS pixels
    const h = canvas.clientHeight; // CSS pixels
    const relPoints = currentPoints.map((p) => toRelative(p.x, p.y, w, h));
    const newStroke = { points: relPoints, color: penColor, size: penSize };
    const updatedStrokes = [...strokes, newStroke];
    setIsDrawing(false);
    setCurrentPoints([]);
    if (onChange) onChange({ strokes: updatedStrokes });
  };

  const handlePointerUp = (e) => {
    e && e.preventDefault && e.preventDefault();
    finishStroke();
  };

  const clearDrawing = () => {
    if (onChange) onChange({ strokes: [] });
  };

  // Double click/tap to toggle edit mode
  const handleDoubleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setEditMode((m) => !m);
  };

  // Close edit/drawing when clicking outside this widget
  useEffect(() => {
    const handleGlobalPointerDown = (e) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) {
        finishStroke();
        setEditMode(false);
        setIsDrawing(false);
        setCurrentPoints([]);
        setShowBgPicker(false);
        setShowPenPicker(false);
      }
    };
    window.addEventListener('pointerdown', handleGlobalPointerDown, { capture: true });
    return () => window.removeEventListener('pointerdown', handleGlobalPointerDown, { capture: true });
  }, []);

  // When parent deselects this widget, exit edit mode and stop drawing
  useEffect(() => {
    if (!isSelected) {
      finishStroke();
      setEditMode(false);
      setIsDrawing(false);
      setCurrentPoints([]);
      setShowBgPicker(false);
      setShowPenPicker(false);
    }
  }, [isSelected]);

  const handleBackgroundColorChange = (value) => {
    const next = typeof value === 'string' ? value : value?.target?.value;
    if (!next) return;
    if (onChange) onChange({ backgroundColor: next });
  };

  const handlePenColorChange = (value) => {
    const next = typeof value === 'string' ? value : value?.target?.value;
    if (!next) return;
    if (onChange) onChange({ penColor: next });
  };

  return (
    <div
      ref={containerRef}
      className={className ? `${className} relative` : 'relative'}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={handleDoubleClick}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full touch-none"
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      />
      {isSelected && (
        <div className="absolute top-2 left-2 flex gap-2 items-center">
          <button
            className={`px-2 py-1 text-xs rounded ${editMode ? 'bg-green-600' : 'bg-gray-900/70'} text-white`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setEditMode((m) => !m);
            }}
            title={editMode ? 'Exit edit mode' : 'Enter edit mode'}
          >
            {editMode ? 'Editing' : 'Edit'}
          </button>

          {/* Background color picker */}
          <div className="relative">
            <button
              className="px-2 py-1 text-xs rounded bg-gray-900/70 text-white flex items-center justify-center"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowBgPicker((s) => !s);
                setShowPenPicker(false);
              }}
              title="Select background color"
              aria-label="Select background color"
            >
              {/* Palette icon */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12 3a9 9 0 0 0 0 18h4.5a2.5 2.5 0 0 0 0-5H15a1 1 0 0 1-1-1c0-1.657-1.343-3-3-3H9a3 3 0 0 1 0-6h3zM7.5 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm4 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM6 13a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/>
              </svg>
            </button>
            {showBgPicker && (
              <div className="absolute z-10 mt-2 p-2 rounded bg-gray-900/90 text-white shadow-lg flex items-center gap-2">
                {/* Transparent option */}
                <button
                  className="w-6 h-6 rounded overflow-hidden border border-white/30"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleBackgroundColorChange('transparent');
                    setShowBgPicker(false);
                  }}
                  title="Transparent background"
                  aria-label="Transparent background"
                >
                  {/* Checkerboard */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" width="24" height="24">
                    <defs>
                      <pattern id="checker" x="0" y="0" width="2" height="2" patternUnits="userSpaceOnUse">
                        <rect x="0" y="0" width="1" height="1" fill="#bbb" />
                        <rect x="1" y="1" width="1" height="1" fill="#bbb" />
                      </pattern>
                    </defs>
                    <rect x="0" y="0" width="12" height="12" fill="url(#checker)" />
                  </svg>
                </button>
                <input
                  type="color"
                  value={backgroundColor && backgroundColor !== 'transparent' ? backgroundColor : '#ffffff'}
                  onChange={(e) => {
                    handleBackgroundColorChange(e);
                    setShowBgPicker(false);
                  }}
                  className="w-8 h-8 bg-transparent cursor-pointer"
                  aria-label="Pick background color"
                />
              </div>
            )}
          </div>

          {/* Pen color picker */}
          <div className="relative">
            <button
              className="px-2 py-1 text-xs rounded bg-gray-900/70 text-white flex items-center justify-center"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowPenPicker((s) => !s);
                setShowBgPicker(false);
              }}
              title="Select pen color"
              aria-label="Select pen color"
            >
              {/* Pen nib icon */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M14.121 3.879a3 3 0 0 1 4.243 4.242l-1.414 1.415-4.243-4.243 1.414-1.414zM11.293 6.707l6 6L12 18l-6.364 2.121L7.757 13l3.536-3.536zM10 14l-1 3 3-1 2-2-2-2-2 2z"/>
              </svg>
            </button>
            {showPenPicker && (
              <div className="absolute z-10 mt-2 p-2 rounded bg-gray-900/90 text-white shadow-lg">
                <input
                  type="color"
                  value={penColor}
                  onChange={(e) => {
                    handlePenColorChange(e);
                    setShowPenPicker(false);
                  }}
                  className="w-8 h-8 bg-transparent cursor-pointer"
                  aria-label="Pick pen color"
                />
              </div>
            )}
          </div>

          <button
            className="px-2 py-1 text-xs rounded bg-gray-900/70 text-white"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              clearDrawing();
            }}
            title="Clear drawing"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
};

export default WidgetDrawing;


