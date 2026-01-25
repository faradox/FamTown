/**
 * WidgetGenImage - generate image from prompt using backend GenAI
 */

import React, { useMemo, useRef, useState, useEffect } from 'react';

const WidgetGenImage = ({ className, isSelected, imageBase64, onChange, isEnabled = true }) => {
  const containerRef = useRef(null);
  const [localImage, setLocalImage] = useState(imageBase64 || null);

  useEffect(() => {
    setLocalImage(imageBase64 || null);
  }, [imageBase64]);

  const dataUrl = useMemo(() => (localImage ? `data:image/png;base64,${localImage}` : null), [localImage]);

  return (
    <div ref={containerRef} className={className} onClick={(e) => e.stopPropagation()}>
      <div className="w-full h-full relative">
        {/* Image area fills entire card */}
        {dataUrl ? (
          <img src={dataUrl} alt="Generated" className="w-full h-full object-cover" draggable={false} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm text-gray-600 dark:text-gray-300 bg-black/5 dark:bg-white/5">
            No image yet
          </div>
        )}

        {/* Generate button stays visible to allow regeneration */}
        <div className="absolute top-2 left-2 z-10">
          <button
            className={`px-3 py-1 text-xs rounded ${
              isEnabled ? 'bg-gray-900/70 text-white' : 'bg-gray-400 text-white cursor-not-allowed'
            }`}
            onClick={(e) => {
              if (!isEnabled) return;
              e.preventDefault();
              e.stopPropagation();
              const prompt = window.prompt('Enter prompt for the image:');
              if (!prompt || !prompt.trim()) return;
              if (onChange) onChange({ prompt });
            }}
            title="Generate image"
            disabled={!isEnabled}
          >
            {isEnabled ? 'Generate' : 'Disabled'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WidgetGenImage;


