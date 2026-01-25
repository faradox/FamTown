/**
 * CategorySelect - Hierarchical category dropdown for accounting
 */

import React, { useState, useRef, useEffect } from 'react';
import { getAppTheme, ThemeIcon } from '../../themes/appTheme';
import { useAccountingStore } from '../../stores/useAccountingStore';

const CategoryIcon = ({ name, className = 'w-4 h-4' }) => {
  const theme = getAppTheme();
  const icon = theme.accounting.categoryIcons[name];
  if (!icon) return null;
  return <ThemeIcon icon={icon} className={className} label={name} />;
};

const CategorySelect = ({
  value,
  onChange,
  type,
  placeholder,
  className = '',
}) => {
  const theme = getAppTheme();
  const { labels, icons } = theme.accounting;
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const { getHierarchicalCategories, getCategoryById } = useAccountingStore();

  const categories = getHierarchicalCategories(type);
  const selectedCategory = value ? getCategoryById(value) : null;
  const resolvedPlaceholder = placeholder || labels.categoryPlaceholder;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter categories based on search
  const filteredCategories = categories.map(parent => ({
    ...parent,
    children: parent.children.filter(child =>
      child.name.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  })).filter(parent =>
    parent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.children.length > 0
  );

  const handleSelect = (categoryId) => {
    onChange(categoryId);
    setIsOpen(false);
    setSearchTerm('');
  };

  // Get display name with parent prefix for children
  const getDisplayName = () => {
    if (!selectedCategory) return resolvedPlaceholder;
    if (selectedCategory.parentId) {
      const parent = getCategoryById(selectedCategory.parentId);
      return parent ? `${parent.name} > ${selectedCategory.name}` : selectedCategory.name;
    }
    return selectedCategory.name;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-left flex items-center justify-between focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <span className={selectedCategory ? '' : 'text-gray-400'}>
          {getDisplayName()}
        </span>
        <ThemeIcon icon={icons.chevronDown} className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} label="" />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-72 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <ThemeIcon icon={icons.search} className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" label="" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={labels.categorySearchPlaceholder}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
          </div>

          {/* Category list */}
          <div className="overflow-y-auto max-h-56">
            {filteredCategories.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                {labels.categoryEmpty}
              </div>
            ) : (
              filteredCategories.map((parent) => (
                <div key={parent.id}>
                  {/* Parent category */}
                  <button
                    type="button"
                    onClick={() => handleSelect(parent.id)}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${
                      value === parent.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {parent.icon && (
                      <CategoryIcon name={parent.icon} className="w-4 h-4" />
                    )}
                    <span className="font-medium">{parent.name}</span>
                  </button>

                  {/* Child categories */}
                  {parent.children.map((child) => (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => handleSelect(child.id)}
                      className={`w-full px-3 py-2 pl-8 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        value === child.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {child.name}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CategorySelect;
