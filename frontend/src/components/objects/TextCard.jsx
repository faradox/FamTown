/**
 * TextCard component for displaying texts
 */

import React, { useState, useEffect, useRef } from 'react';
import { Heart, Lightbulb, ChefHat, Film, Quote, Pin, Plus, Minus, Palette, X, Pencil, MoreHorizontal } from 'lucide-react';
import { textsAPI } from '../../services/objectsAPI';
import { useObjectsStore } from '../../stores/useObjectsStore';
import toast from 'react-hot-toast';

const TextCard = ({ text, onClick, onPin, onDelete, isSelected, fontSize = 14, backgroundColor, onFontSizeChange, onBackgroundColorChange, forceDarkText = false, className = '', autoEdit = false, onAutoEditComplete, fullView = false }) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [isEditing, setIsEditing] = useState(autoEdit);
  const [editedContent, setEditedContent] = useState(text.content);
  const textareaRef = useRef(null);
  const colorInputRef = useRef(null);
  const { updateText } = useObjectsStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const shouldUseInlineBackground = backgroundColor !== undefined && backgroundColor !== '#ffffff';

  // Auto-enter edit mode when autoEdit prop is true
  useEffect(() => {
    if (autoEdit && !isEditing) {
      setIsEditing(true);
    }
  }, [autoEdit]);

  // Update edited content when text prop changes
  useEffect(() => {
    setEditedContent(text.content);
  }, [text.content]);

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length);
    }
  }, [isEditing]);

  // Close pickers when editing starts
  useEffect(() => {
    if (isEditing) {
      setShowColorPicker(false);
      setShowTypePicker(false);
    }
  }, [isEditing]);

  // Close type picker when color picker opens and vice versa
  useEffect(() => {
    if (showColorPicker) {
      setShowTypePicker(false);
    }
  }, [showColorPicker]);

  useEffect(() => {
    if (showTypePicker) {
      setShowColorPicker(false);
    }
  }, [showTypePicker]);

  const textTypes = [
    { value: 'wish', label: 'Wish', icon: Heart },
    { value: 'insight', label: 'Insight', icon: Lightbulb },
    { value: 'recipe', label: 'Recipe', icon: ChefHat },
    { value: 'movie_idea', label: 'Movie Idea', icon: Film },
    { value: 'quote', label: 'Quote', icon: Quote },
  ];

  const getTypeIcon = () => {
    switch (text.textType) {
      case 'wish':
        return <Heart className="w-5 h-5" />;
      case 'insight':
        return <Lightbulb className="w-5 h-5" />;
      case 'recipe':
        return <ChefHat className="w-5 h-5" />;
      case 'movie_idea':
        return <Film className="w-5 h-5" />;
      case 'quote':
        return <Quote className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const getTypeColor = () => {
    switch (text.textType) {
      case 'wish':
        return 'bg-pink-200 text-pink-900 dark:bg-pink-900 dark:text-pink-300';
      case 'insight':
        return 'bg-yellow-200 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-300';
      case 'recipe':
        return 'bg-green-200 text-green-900 dark:bg-green-900 dark:text-green-300';
      case 'movie_idea':
        return 'bg-purple-200 text-purple-900 dark:bg-purple-900 dark:text-purple-300';
      case 'quote':
        return 'bg-blue-200 text-blue-900 dark:bg-blue-900 dark:text-blue-300';
      default:
        return 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getTypeLabel = () => {
    return text.textType.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const handlePinClick = (e) => {
    e.stopPropagation();
    if (onPin) {
      onPin(text);
    }
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(text);
    }
  };

  const handleFontSizeIncrease = (e) => {
    e.stopPropagation();
    if (onFontSizeChange) {
      onFontSizeChange(Math.min(fontSize + 2, 32));
    }
  };

  const handleFontSizeDecrease = (e) => {
    e.stopPropagation();
    if (onFontSizeChange) {
      onFontSizeChange(Math.max(fontSize - 2, 10));
    }
  };

  const handleColorClick = (e) => {
    e.stopPropagation();
    if (colorInputRef.current) {
      colorInputRef.current.click();
    }
  };

  const handleColorChange = (e) => {
    e.stopPropagation();
    const color = e.target.value;
    if (onBackgroundColorChange) {
      onBackgroundColorChange(color);
    }
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    setIsEditing(true);
    setIsMenuOpen(false);
  };

  const handleSaveEdit = async () => {
    if (editedContent.trim() !== text.content) {
      try {
        const response = await textsAPI.update(text.id, { content: editedContent.trim() });
        updateText(text.id, response.data);
        toast.success('Text updated successfully');
      } catch (error) {
        console.error('Error updating text:', error);
        toast.error('Failed to update text');
      }
    }
    setIsEditing(false);

    // Notify parent that auto-edit is complete (to clear the flag)
    if (autoEdit && onAutoEditComplete) {
      onAutoEditComplete();
    }
  };

  const handleCancelEdit = (e) => {
    e.stopPropagation();
    setEditedContent(text.content);
    setIsEditing(false);

    // Notify parent that auto-edit is complete (to clear the flag)
    if (autoEdit && onAutoEditComplete) {
      onAutoEditComplete();
    }
  };

  const handleTextareaKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleCancelEdit(e);
    }
    // Allow normal Enter key behavior (new line)
    // Ctrl+Enter or Cmd+Enter to save
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSaveEdit();
    }
  };

  const handleTypeIconClick = (e) => {
    e.stopPropagation();
    setShowTypePicker(!showTypePicker);
  };

  const handleTypeSelect = async (newType) => {
    try {
      const response = await textsAPI.update(text.id, { textType: newType });
      updateText(text.id, response.data);
      setShowTypePicker(false);
      toast.success('Type updated successfully');
    } catch (error) {
      console.error('Error updating text type:', error);
      toast.error('Failed to update type');
    }
  };

  return (
    <div
      onClick={onClick}
      style={{ 
        ...(shouldUseInlineBackground ? { backgroundColor } : {}),
        position: 'relative', 
        overflow: 'visible' 
      }}
      className={`rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer relative border border-gray-200 dark:border-gray-700 ${
        shouldUseInlineBackground ? '' : 'bg-white dark:bg-gray-800'
      } ${className}`}
    >
      {!isSelected && (onPin || onDelete) && (
        <div className="absolute top-2 right-2 z-20" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setIsMenuOpen((v) => !v)}
            className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
            title="More actions"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden">
              <button
                onClick={handleEditClick}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 flex items-center gap-2"
              >
                <Pencil className="w-4 h-4" />
                Edit
              </button>
              {onPin && (
                <button
                  onClick={(e) => { handlePinClick(e); setIsMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 flex items-center gap-2"
                >
                  <Pin className="w-4 h-4" />
                  Pin to Townsquare
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => { handleDeleteClick(e); setIsMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/30 text-red-700 dark:text-red-300 flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {isSelected && onFontSizeChange && onBackgroundColorChange && (
        <div className="absolute top-2 right-2 flex gap-1 z-10">
          <button
            onClick={handleEditClick}
            className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
            title="Edit text"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={handleFontSizeDecrease}
            className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
            title="Decrease font size"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={handleFontSizeIncrease}
            className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
            title="Increase font size"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={handleColorClick}
            className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
            title="Change background color"
          >
            <Palette className="w-4 h-4" />
          </button>
          <input
            ref={colorInputRef}
            type="color"
            value={backgroundColor || '#ffffff'}
            onChange={handleColorChange}
            className="hidden"
          />
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          <button
            onClick={handleTypeIconClick}
            className={`p-2 rounded-lg ${getTypeColor()} hover:opacity-80 transition-opacity cursor-pointer`}
            title="Change type"
          >
            {getTypeIcon()}
          </button>
          {showTypePicker && (
            <div
              className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl min-w-[150px]"
              style={{ zIndex: 9999 }}
              onClick={(e) => e.stopPropagation()}
            >
              {textTypes.map((type) => {
                const IconComponent = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => handleTypeSelect(type.value)}
                    className={`w-full flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      text.textType === type.value ? 'bg-gray-100 dark:bg-gray-700' : ''
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{type.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
              <textarea
                ref={textareaRef}
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                onKeyDown={handleTextareaKeyDown}
                className={`w-full min-h-[100px] p-2 rounded border-2 border-blue-500 focus:outline-none resize-none ${
                  forceDarkText ? 'text-gray-900 bg-white' : 'text-black dark:text-gray-100 bg-white dark:bg-gray-700'
                }`}
                style={{ fontSize: `${fontSize}px` }}
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1 text-sm rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 transition-colors"
                >
                  Cancel (Esc)
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1 text-sm rounded bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                >
                  Save (Ctrl+Enter)
                </button>
              </div>
            </div>
          ) : (
            <p
              className={`whitespace-pre-wrap ${fullView ? '' : 'line-clamp-4'} ${
                forceDarkText ? 'text-gray-900' : 'text-black dark:text-gray-100'
              }`}
              style={{ fontSize: `${fontSize}px` }}
            >
              {text.content}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TextCard;

