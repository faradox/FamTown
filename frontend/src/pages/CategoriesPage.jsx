/**
 * CategoriesPage - Category management with tree view
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAppTheme, ThemeIcon } from '../themes/appTheme';
import { categoriesAPI } from '../services/accountingAPI';
import { useAccountingStore } from '../stores/useAccountingStore';
import { useViewConfigStore } from '../stores/useViewConfigStore';
import toast from 'react-hot-toast';

// Preset colors for categories
const PRESET_COLORS = [
  '#EF4444', // red
  '#F97316', // orange
  '#F59E0B', // amber
  '#84CC16', // lime
  '#22C55E', // green
  '#10B981', // emerald
  '#14B8A6', // teal
  '#06B6D4', // cyan
  '#0EA5E9', // sky
  '#3B82F6', // blue
  '#6366F1', // indigo
  '#8B5CF6', // violet
  '#A855F7', // purple
  '#D946EF', // fuchsia
  '#EC4899', // pink
  '#F43F5E', // rose
];

const CategoriesPage = () => {
  const navigate = useNavigate();
  const theme = getAppTheme();
  const { labels, icons, colors } = theme.accounting;

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parentCategory, setParentCategory] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'expense',
    color: '#3B82F6',
    parentId: null,
  });

  // Expanded categories state
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  const {
    categories,
    setCategories,
    setCategoriesLoading,
    getHierarchicalCategories,
    addCategory,
    updateCategory,
    deleteCategory,
  } = useAccountingStore();

  const { getBackgroundStyle, loadAll } = useViewConfigStore();
  const backgroundStyle = getBackgroundStyle('accounting');

  // Load data on mount
  useEffect(() => {
    loadAll();
    loadCategories();
  }, []);

  // Expand all categories by default
  useEffect(() => {
    const parentIds = categories
      .filter((c) => !c.parentId)
      .map((c) => c.id);
    setExpandedCategories(new Set(parentIds));
  }, [categories]);

  const loadCategories = async () => {
    setCategoriesLoading(true);
    try {
      const response = await categoriesAPI.list();
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setCategoriesLoading(false);
    }
  };

  const openCreateModal = (type, parent = null) => {
    setEditingCategory(null);
    setParentCategory(parent);
    setFormData({
      name: '',
      type: parent ? parent.type : type,
      color: '#3B82F6',
      parentId: parent?.id || null,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (category) => {
    setEditingCategory(category);
    setParentCategory(null);
    setFormData({
      name: category.name,
      type: category.type,
      color: category.color || '#3B82F6',
      parentId: category.parentId,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setParentCategory(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        type: formData.type,
        color: formData.color,
        parentId: formData.parentId,
      };

      if (editingCategory) {
        // Update existing
        const response = await categoriesAPI.update(editingCategory.id, payload);
        updateCategory(editingCategory.id, response.data);
        toast.success('Category updated');
      } else {
        // Create new
        const response = await categoriesAPI.create(payload);
        addCategory(response.data);
        toast.success('Category created');

        // Expand parent if creating a child
        if (formData.parentId) {
          setExpandedCategories((prev) => new Set([...prev, formData.parentId]));
        }
      }

      closeModal();
    } catch (error) {
      console.error('Error saving category:', error);
      const message = error.response?.data?.detail || 'Failed to save category';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (category) => {
    // Check if it's a default category
    if (category.isDefault) {
      toast.error('Cannot delete default categories');
      return;
    }

    // Check if it has children
    const hasChildren = categories.some((c) => c.parentId === category.id);
    if (hasChildren) {
      toast.error('Cannot delete a category that has subcategories');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${category.name}"?`)) {
      return;
    }

    try {
      await categoriesAPI.delete(category.id);
      deleteCategory(category.id);
      toast.success('Category deleted');
    } catch (error) {
      console.error('Error deleting category:', error);
      const message = error.response?.data?.detail || 'Failed to delete category';
      toast.error(message);
    }
  };

  const toggleExpanded = (categoryId) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Get hierarchical categories for display
  const expenseCategories = getHierarchicalCategories('expense');
  const incomeCategories = getHierarchicalCategories('income');

  const CategoryItem = ({ category, isChild = false }) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.has(category.id);

    return (
      <div>
        <div
          className={`flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
            isChild ? 'ml-6' : ''
          }`}
        >
          {/* Expand/Collapse button (for parents) */}
          {!isChild && hasChildren ? (
            <button
              onClick={() => toggleExpanded(category.id)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {isExpanded ? (
                <ThemeIcon icon={icons.collapse} className="w-4 h-4" label="" />
              ) : (
                <ThemeIcon icon={icons.expand} className="w-4 h-4" label="" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}

          {/* Color indicator */}
          <div
            className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600 flex-shrink-0"
            style={{ backgroundColor: category.color || '#9CA3AF' }}
          />

          {/* Category name */}
          <span
            className={`flex-1 text-gray-900 dark:text-white ${
              isChild ? 'text-sm' : 'font-medium'
            }`}
          >
            {category.name}
            {category.isDefault && (
              <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                (default)
              </span>
            )}
          </span>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Add child (only for parents) */}
            {!isChild && (
                <button
                  onClick={() => openCreateModal(category.type, category)}
                  className="p-1.5 text-gray-400 hover:text-green-500 dark:hover:text-green-400 rounded transition-colors"
                  title="Add subcategory"
                >
                  <ThemeIcon icon={icons.add} className="w-4 h-4" label="Add subcategory" />
                </button>
            )}
            <button
              onClick={() => openEditModal(category)}
              className="p-1.5 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 rounded transition-colors"
              title="Edit"
            >
              <ThemeIcon icon={icons.edit} className="w-4 h-4" label="Edit" />
            </button>
            {!category.isDefault && (
              <button
                onClick={() => handleDelete(category)}
                className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded transition-colors"
                title="Delete"
              >
                <ThemeIcon icon={icons.delete} className="w-4 h-4" label="Delete" />
              </button>
            )}
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="border-l-2 border-gray-200 dark:border-gray-700 ml-5">
            {category.children.map((child) => (
              <CategoryItem key={child.id} category={child} isChild />
            ))}
          </div>
        )}
      </div>
    );
  };

  const CategoryColumn = ({ type, categories: catList }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      {/* Header */}
      <div
        className={`px-4 py-3 rounded-t-lg flex items-center justify-between ${
          type === 'expense'
            ? 'bg-red-50 dark:bg-red-900/20'
            : 'bg-green-50 dark:bg-green-900/20'
        }`}
      >
        <h2
          className={`text-lg font-semibold ${
            type === 'expense'
              ? 'text-red-700 dark:text-red-400'
              : 'text-green-700 dark:text-green-400'
          }`}
        >
          {type === 'expense' ? labels.categoriesExpenseTitle : labels.categoriesIncomeTitle}
        </h2>
        <button
          onClick={() => openCreateModal(type)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors ${
            type === 'expense'
              ? colors.entryType.expense.solid
              : colors.entryType.income.solid
          }`}
        >
          <ThemeIcon icon={icons.add} className="w-4 h-4" label={labels.categoriesAddLabel} />
          {labels.categoriesAddLabel}
        </button>
      </div>

      {/* Categories list */}
      <div className="p-2 max-h-[600px] overflow-y-auto">
        {catList.length === 0 ? (
          <p className="text-center py-8 text-gray-500 dark:text-gray-400">
            {labels.categoriesNone.replace('{type}', type === 'expense' ? labels.categoriesTypeExpense : labels.categoriesTypeIncome)}
          </p>
        ) : (
          catList.map((category) => (
            <CategoryItem key={category.id} category={category} />
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={backgroundStyle}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/accounting')}
            className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            <ThemeIcon icon={icons.back} className="w-5 h-5" label="Back" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {labels.categoriesTitle}
          </h1>
        </div>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {labels.categoriesDescription}
        </p>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CategoryColumn type="expense" categories={expenseCategories} />
          <CategoryColumn type="income" categories={incomeCategories} />
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingCategory
                  ? labels.categoriesEditTitle
                  : parentCategory
                  ? labels.categoriesNewChildTitle.replace('{name}', parentCategory.name)
                  : labels.categoriesNewTitle}
              </h2>
              <button
                onClick={closeModal}
                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <ThemeIcon icon={icons.close} className="w-5 h-5" label="Close" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {labels.categoriesNameLabel}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder={labels.categoriesNamePlaceholder}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              {/* Type (only for new top-level categories) */}
              {!editingCategory && !parentCategory && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'expense' })}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    formData.type === 'expense'
                      ? `${colors.entryType.expense.solid} text-white`
                      : `${colors.neutralAction} hover:bg-gray-300 dark:hover:bg-gray-600`
                  }`}
                >
                  {labels.entryTypeExpense}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'income' })}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    formData.type === 'income'
                      ? `${colors.entryType.income.solid} text-white`
                      : `${colors.neutralAction} hover:bg-gray-300 dark:hover:bg-gray-600`
                  }`}
                >
                  {labels.entryTypeIncome}
                </button>
              </div>
              )}

              {/* Color Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <ThemeIcon icon={icons.palette} className="w-4 h-4" label={labels.categoriesChartColorLabel} />
                  {labels.categoriesChartColorLabel}
                </label>
                <div className="grid grid-cols-8 gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        formData.color === color
                          ? 'border-gray-900 dark:border-white scale-110'
                          : 'border-transparent hover:scale-110'
                      }`}
                      style={{ backgroundColor: color }}
                    >
                      {formData.color === color && (
                        <ThemeIcon icon={icons.check} className="w-4 h-4 mx-auto text-white drop-shadow" label="Selected" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  {labels.entryCancelLabel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSubmitting
                    ? labels.entrySavingLabel
                    : editingCategory
                    ? labels.categoriesUpdateLabel
                    : labels.categoriesCreateLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriesPage;
