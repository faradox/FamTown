/**
 * FloatingMenu component - a floating action menu button that opens a menu above it
 */

import React, { useState, useRef, useEffect } from 'react';
import { Menu } from 'lucide-react';

const FloatingMenu = ({ items = [], className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div ref={menuRef} className={`fixed bottom-6 right-6 ${className}`}>
      {/* Menu items - appear above the button */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 flex flex-col-reverse gap-3 mb-2">
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                item.onClick();
                setIsOpen(false);
              }}
              className={`p-4 rounded-full shadow-lg transition-all transform hover:scale-110 ${
                item.color || 'bg-gray-600 hover:bg-gray-700'
              } text-white z-50`}
              title={item.label}
            >
              {item.icon}
            </button>
          ))}
        </div>
      )}

      {/* Main menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-4 rounded-full shadow-lg transition-all z-50 ${
          isOpen
            ? 'bg-gray-700 hover:bg-gray-800 rotate-90'
            : 'bg-blue-600 hover:bg-blue-700'
        } text-white`}
      >
        <Menu className="w-6 h-6" />
      </button>
    </div>
  );
};

export default FloatingMenu;
