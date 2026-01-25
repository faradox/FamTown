/**
 * WidgetYoutube - embed a YouTube video by URL
 */

import React, { useMemo, useState } from 'react';

function extractYouTubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      return u.pathname.slice(1);
    }
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname === '/watch') {
        return u.searchParams.get('v');
      }
      if (u.pathname.startsWith('/embed/')) {
        return u.pathname.split('/embed/')[1];
      }
    }
  } catch (_) {
    return null;
  }
  return null;
}

const WidgetYoutube = ({ className, isSelected, url, onChange }) => {
  const [localUrl, setLocalUrl] = useState(url || '');
  const [playMode, setPlayMode] = useState(false);
  const videoId = useMemo(() => extractYouTubeId(localUrl || url || ''), [localUrl, url]);
  const embedSrc = videoId ? `https://www.youtube.com/embed/${videoId}${playMode ? '?autoplay=1' : ''}` : null;

  const applyUrl = () => {
    const trimmed = (localUrl || '').trim();
    if (!trimmed) return;
    if (onChange) onChange({ url: trimmed });
  };

  const handleDoubleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (videoId) setPlayMode((p) => !p);
  };

  return (
    <div className={className} onClick={(e) => e.stopPropagation()} onDoubleClick={handleDoubleClick}>
      {!embedSrc ? (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 bg-black/5 dark:bg-white/5">
          <input
            type="text"
            placeholder="YouTube URL"
            value={localUrl}
            onChange={(e) => setLocalUrl(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-3/4 max-w-md px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          />
          <button
            onClick={applyUrl}
            className="px-3 py-2 text-sm rounded bg-blue-600 hover:bg-blue-700 text-white"
            disabled={!localUrl.trim()}
          >
            Set video
          </button>
        </div>
      ) : (
        <div className="w-full h-full relative">
          {isSelected && (
            <div className="absolute top-2 left-2 z-10">
              <button
                className={`px-2 py-1 text-xs rounded ${playMode ? 'bg-green-600' : 'bg-gray-900/70'} text-white`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setPlayMode((p) => !p);
                }}
              >
                {playMode ? 'Playing' : 'Preview'}
              </button>
            </div>
          )}
          <iframe
            className="w-full h-full"
            style={{ pointerEvents: playMode ? 'auto' : 'none' }}
            src={embedSrc}
            title="YouTube video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
};

export default WidgetYoutube;


