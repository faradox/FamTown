/**
 * TemplatesPage - Template management for quick entry shortcuts
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAppTheme, ThemeIcon } from '../themes/appTheme';
import { categoriesAPI, templatesAPI } from '../services/accountingAPI';
import { useAccountingStore } from '../stores/useAccountingStore';
import { useViewConfigStore } from '../stores/useViewConfigStore';
import CategorySelect from '../components/accounting/CategorySelect';
import toast from 'react-hot-toast';

const TemplatesPage = () => {
  const navigate = useNavigate();
  const theme = getAppTheme();
  const { labels, icons, colors } = theme.accounting;

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    entryType: 'expense',
    amount: '',
    categoryId: '',
    description: '',
  });

  const {
    categories,
    setCategories,
    setCategoriesLoading,
    templates,
    setTemplates,
    setTemplatesLoading,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    getCategoryById,
  } = useAccountingStore();

  const { getBackgroundStyle, loadAll } = useViewConfigStore();
  const backgroundStyle = getBackgroundStyle('accounting');

  // Load data on mount
  useEffect(() => {
    loadAll();
    loadCategories();
    loadTemplates();
  }, []);

  const loadCategories = async () => {
    setCategoriesLoading(true);
    try {
      const response = await categoriesAPI.list();
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const loadTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const response = await templatesAPI.list();
      setTemplates(response.data);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setTemplatesLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      entryType: 'expense',
      amount: '',
      categoryId: '',
      description: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      entryType: template.entryType,
      amount: template.amount || '',
      categoryId: template.categoryId,
      description: template.description || '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTemplate(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    if (!formData.categoryId) {
      toast.error('Please select a category');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        entryType: formData.entryType,
        categoryId: formData.categoryId,
        amount: formData.amount ? parseFloat(formData.amount) : null,
        description: formData.description || null,
      };

      if (editingTemplate) {
        // Update existing
        const response = await templatesAPI.update(editingTemplate.id, payload);
        updateTemplate(editingTemplate.id, response.data);
        toast.success('Template updated');
      } else {
        // Create new
        const response = await templatesAPI.create(payload);
        addTemplate(response.data);
        toast.success('Template created');
      }

      closeModal();
    } catch (error) {
      console.error('Error saving template:', error);
      const message = error.response?.data?.detail || 'Failed to save template';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (template) => {
    if (!window.confirm(`Are you sure you want to delete "${template.name}"?`)) {
      return;
    }

    try {
      await templatesAPI.delete(template.id);
      deleteTemplate(template.id);
      toast.success('Template deleted');
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  // Format amount with German locale
  const formatAmount = (amount) => {
    if (!amount) return '-';
    const num = parseFloat(amount);
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(num);
  };

  // Group templates by type
  const expenseTemplates = templates.filter((t) => t.entryType === 'expense');
  const incomeTemplates = templates.filter((t) => t.entryType === 'income');

  const TemplateCard = ({ template }) => {
    const category = getCategoryById(template.categoryId);
    return (
      <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow">
        {/* Drag handle (placeholder for future drag-and-drop) */}
        <div className="text-gray-300 dark:text-gray-600 cursor-grab">
          <ThemeIcon icon={icons.drag} className="w-5 h-5" label="Drag" />
        </div>

        {/* Type indicator */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            template.entryType === 'income'
              ? colors.entryType.income.soft
              : colors.entryType.expense.soft
          }`}
        >
          {template.entryType === 'income' ? (
            <ThemeIcon icon={icons.income} className={`w-4 h-4 ${colors.entryType.income.text}`} label={labels.entryTypeIncome} />
          ) : (
            <ThemeIcon icon={icons.expense} className={`w-4 h-4 ${colors.entryType.expense.text}`} label={labels.entryTypeExpense} />
          )}
        </div>

        {/* Template info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 dark:text-white truncate">
            {template.name}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {category?.name || 'Unknown category'}
            {template.description && ` - ${template.description}`}
          </div>
        </div>

        {/* Amount */}
        <div
          className={`text-sm font-medium ${
            template.amount
              ? template.entryType === 'income'
                ? colors.entryType.income.text
                : colors.entryType.expense.text
              : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          {formatAmount(template.amount)}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEditModal(template)}
            className="p-2 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Edit"
          >
            <ThemeIcon icon={icons.edit} className="w-4 h-4" label="Edit" />
          </button>
          <button
            onClick={() => handleDelete(template)}
            className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Delete"
          >
            <ThemeIcon icon={icons.delete} className="w-4 h-4" label="Delete" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen" style={backgroundStyle}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/accounting')}
              className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              <ThemeIcon icon={icons.back} className="w-5 h-5" label="Back" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {labels.templatesTitle}
            </h1>
          </div>
          <button
            onClick={openCreateModal}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${colors.primaryAction}`}
          >
            <ThemeIcon icon={icons.add} className="w-5 h-5" label={labels.templatesNewButton} />
            {labels.templatesNewButton}
          </button>
        </div>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {labels.templatesDescription}
        </p>

        {/* Templates List */}
        {templates.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {labels.templatesEmptyTitle}
            </p>
            <button
              onClick={openCreateModal}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${colors.primaryAction}`}
            >
              <ThemeIcon icon={icons.add} className="w-5 h-5" label={labels.templatesEmptyButton} />
              {labels.templatesEmptyButton}
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Expense Templates */}
            {expenseTemplates.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500" />
                  {labels.templatesExpenseTitle} ({expenseTemplates.length})
                </h2>
                <div className="space-y-2">
                  {expenseTemplates.map((template) => (
                    <TemplateCard key={template.id} template={template} />
                  ))}
                </div>
              </div>
            )}

            {/* Income Templates */}
            {incomeTemplates.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500" />
                  {labels.templatesIncomeTitle} ({incomeTemplates.length})
                </h2>
                <div className="space-y-2">
                  {incomeTemplates.map((template) => (
                    <TemplateCard key={template.id} template={template} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingTemplate ? labels.templatesEditTitle : labels.templatesNewTitle}
              </h2>
              <button
                onClick={closeModal}
                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <ThemeIcon icon={icons.close} className="w-5 h-5" label="Close" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Template Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {labels.templatesNameLabel}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder={labels.templatesNamePlaceholder}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              {/* Entry Type */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      entryType: 'expense',
                      categoryId: '',
                    })
                  }
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    formData.entryType === 'expense'
                      ? `${colors.entryType.expense.solid} text-white`
                      : `${colors.neutralAction} hover:bg-gray-300 dark:hover:bg-gray-600`
                  }`}
                >
                  {labels.entryTypeExpense}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      entryType: 'income',
                      categoryId: '',
                    })
                  }
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    formData.entryType === 'income'
                      ? `${colors.entryType.income.solid} text-white`
                      : `${colors.neutralAction} hover:bg-gray-300 dark:hover:bg-gray-600`
                  }`}
                >
                  {labels.entryTypeIncome}
                </button>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {labels.categoryLabel}
                </label>
                <CategorySelect
                  value={formData.categoryId}
                  onChange={(val) =>
                    setFormData({ ...formData, categoryId: val })
                  }
                  type={formData.entryType}
                />
              </div>

              {/* Amount (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {labels.templatesAmountLabel}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    placeholder={labels.templatesAmountPlaceholder}
                    className="w-full px-3 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    EUR
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {labels.templatesAmountHint}
                </p>
              </div>

              {/* Description (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {labels.templatesDescriptionLabel}
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder={labels.templatesDescriptionPlaceholder}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
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
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${colors.primaryAction}`}
                >
                  {isSubmitting
                    ? labels.entrySavingLabel
                    : editingTemplate
                    ? labels.templatesUpdateLabel
                    : labels.templatesCreateLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplatesPage;
