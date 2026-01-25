/**
 * WidgetList - simple todo-style list with satisfying confetti on completion
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';

const WidgetList = ({ className, isSelected, title = '', items = [], onChange }) => {
  const [newText, setNewText] = useState('');
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Keep a stable, sorted view: incomplete first (by createdAt), then completed (by completedAt)
  const sortedItems = useMemo(() => {
    const pending = (items || []).filter((it) => !it.done).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    const completed = (items || [])
      .filter((it) => it.done)
      .sort((a, b) => (a.completedAt || 0) - (b.completedAt || 0));
    return [...pending, ...completed];
  }, [items]);

  useEffect(() => {
    // Focus input when selected to encourage quick add, blur when deselected
    if (inputRef.current) {
      if (isSelected) {
        inputRef.current.focus();
      } else {
        inputRef.current.blur();
      }
    }
  }, [isSelected]);

  // Blur input when clicking anywhere outside this widget
  useEffect(() => {
    const handleGlobalPointerDown = (e) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) {
        if (inputRef.current) inputRef.current.blur();
      }
    };
    window.addEventListener('pointerdown', handleGlobalPointerDown, { capture: true });
    return () => window.removeEventListener('pointerdown', handleGlobalPointerDown, { capture: true });
  }, []);

  const emitConfetti = (origin) => {
    // Lighter, focused burst. If origin is provided, emit from there; otherwise center-top.
    const colors = ['#a3e635', '#60a5fa', '#f472b6', '#facc15', '#34d399', '#f87171'];
    confetti({
      particleCount: 24,
      startVelocity: 32,
      spread: 65,
      ticks: 100,
      scalar: 0.8,
      colors,
      origin: origin || { x: 0.5, y: 0.25 },
    });
  };

  const addItem = () => {
    const trimmed = (newText || '').trim();
    if (!trimmed) return;
    const now = Date.now();
    const newItem = {
      id: `${now}-${Math.random().toString(36).slice(2)}`,
      text: trimmed,
      done: false,
      createdAt: now,
    };
    const next = [...(items || []), newItem];
    if (onChange) onChange({ items: next });
    setNewText('');
  };

  const toggleItem = (event, id) => {
    const now = Date.now();
    const next = (items || []).map((it) =>
      it.id === id
        ? { ...it, done: !it.done, completedAt: !it.done ? now : null }
        : it
    );
    // Fire confetti when moving to done
    const becameDone = next.find((it) => it.id === id)?.done;
    if (becameDone) {
      let origin;
      try {
        const target = event?.target;
        if (target && target.getBoundingClientRect) {
          const rect = target.getBoundingClientRect();
          origin = {
            x: (rect.left + rect.width / 2) / window.innerWidth,
            y: (rect.top + rect.height / 2) / window.innerHeight,
          };
        }
      } catch (_) {
        // fall back silently
      }
      emitConfetti(origin);
    }
    if (onChange) onChange({ items: next });
  };

  const removeItem = (id) => {
    const next = (items || []).filter((it) => it.id !== id);
    if (onChange) onChange({ items: next });
  };

  return (
    <div ref={containerRef} className={className ? `${className} p-3` : 'p-3'} onClick={(e) => e.stopPropagation()}>
      <div className="w-full h-full flex flex-col bg-white/90 dark:bg-gray-900/80 rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        {(title || '').trim() && (
          <div className="px-3 pt-3 pb-1 text-sm font-semibold text-gray-800 dark:text-gray-100 truncate select-text">
            {title}
          </div>
        )}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addItem();
              }
            }}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="Add an item and press Enter"
            className="flex-1 px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            aria-label="New list item"
          />
          <button
            className="px-3 py-2 text-sm rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              addItem();
            }}
            disabled={!newText.trim()}
            aria-label="Add item"
            title="Add item"
          >
            Add
          </button>
        </div>

        <div className="flex-1 overflow-auto p-2">
          {sortedItems.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-400 select-text">
              No items yet
            </div>
          ) : (
            <ul className="space-y-1">
              {sortedItems.map((it) => (
                <li
                  key={it.id}
                  className={`group flex items-center gap-3 px-2 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    it.done ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-gray-100'
                  }`}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={!!it.done}
                    onChange={(e) => toggleItem(e, it.id)}
                    className="w-4 h-4 accent-green-600 cursor-pointer"
                    aria-label={it.done ? 'Mark as not done' : 'Mark as done'}
                  />
                  <span className="flex-1 break-words select-text">
                    {it.text}
                  </span>
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeItem(it.id);
                    }}
                    title="Remove"
                    aria-label="Remove item"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default WidgetList;



