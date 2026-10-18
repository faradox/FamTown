/**
 * QuickEntryForm - Fast entry creation form for dashboard
 */

import React, { useState } from 'react';
import { getAppTheme, ThemeIcon } from '../../themes/appTheme';
import { entriesAPI, templatesAPI } from '../../services/accountingAPI';
import { useAccountingStore } from '../../stores/useAccountingStore';
import CategorySelect from './CategorySelect';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const QuickEntryForm = ({ onEntryCreated }) => {
  const theme = getAppTheme();
  const { labels, icons, colors } = theme.accounting;
  const [entryType, setEntryType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { templates, addEntry } = useAccountingStore();

  // Filter templates by current entry type
  const relevantTemplates = templates.filter(t => t.entryType === entryType);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!categoryId) {
      toast.error('Please select a category');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await entriesAPI.create({
        entryType,
        amount: parseFloat(amount),
        categoryId,
        description: description || undefined,
        date,
      });
      addEntry(response.data);
      toast.success('Entry added successfully');

      // Reset form
      setAmount('');
      setDescription('');
      setCategoryId('');
      setDate(format(new Date(), 'yyyy-MM-dd'));

      onEntryCreated?.();
    } catch (error) {
      console.error('Error creating entry:', error);
      toast.error('Failed to create entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTemplateClick = async (template) => {
    // If template has amount, apply it directly
    if (template.amount) {
      setIsSubmitting(true);
      try {
        const response = await templatesAPI.apply(template.id, {
          amount: parseFloat(template.amount),
          date,
        });
        addEntry(response.data);
        toast.success(`Added ${template.name}`);
        onEntryCreated?.();
      } catch (error) {
        console.error('Error applying template:', error);
        toast.error('Failed to apply template');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Pre-fill form with template values
      setEntryType(template.entryType);
      setCategoryId(template.categoryId);
      setDescription(template.description || '');
      // Focus the amount input
      document.getElementById('quick-entry-amount')?.focus();
    }
  };

  // Format amount with German locale
  const formatAmount = (value) => {
    if (!value) return '';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {labels.quickEntryTitle}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Entry Type Toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setEntryType('expense');
              setCategoryId('');
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              entryType === 'expense'
                ? `${colors.entryType.expense.solid} text-white`
                : `${colors.neutralAction} hover:bg-gray-300 dark:hover:bg-gray-600`
            }`}
          >
            {labels.entryTypeExpense}
          </button>
          <button
            type="button"
            onClick={() => {
              setEntryType('income');
              setCategoryId('');
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              entryType === 'income'
                ? `${colors.entryType.income.solid} text-white`
                : `${colors.neutralAction} hover:bg-gray-300 dark:hover:bg-gray-600`
            }`}
          >
            {labels.entryTypeIncome}
          </button>
        </div>

        {/* Amount and Category Row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="quick-entry-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {labels.amountLabel}
            </label>
            <div className="relative">
              <input
                id="quick-entry-amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                className="w-full px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                EUR
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {labels.categoryLabel}
            </label>
            <CategorySelect
              value={categoryId}
              onChange={setCategoryId}
              type={entryType}
              placeholder={labels.categoryPlaceholder}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {labels.descriptionLabel}
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={labels.descriptionPlaceholder}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Date and Submit Row */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {labels.dateLabel}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-2 rounded-lg font-medium text-white transition-colors flex items-center gap-2 ${
                entryType === 'expense'
                  ? colors.entryType.expense.solid
                  : colors.entryType.income.solid
              } disabled:opacity-50`}
            >
              <ThemeIcon icon={icons.add} className="w-5 h-5" label={labels.addLabel} />
              {labels.addLabel}
            </button>
          </div>
        </div>

        {/* Templates */}
        {relevantTemplates.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {labels.templatesLabel} ({relevantTemplates.length})
            </label>
            {/* Scrollable container - vertical on mobile, horizontal wrap on desktop */}
            <div className="max-h-32 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2">
              {/* Mobile: vertical list */}
              <div className="flex flex-col gap-1.5 md:hidden">
                {relevantTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleTemplateClick(template)}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 text-sm text-left bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 flex justify-between items-center"
                  >
                    <span className="truncate">{template.name}</span>
                    {template.amount && (
                      <span className="ml-2 text-gray-500 dark:text-gray-400 flex-shrink-0">
                        {formatAmount(template.amount)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {/* Desktop: horizontal wrap */}
              <div className="hidden md:flex flex-wrap gap-2">
                {relevantTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleTemplateClick(template)}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                  >
                    {template.name}
                    {template.amount && (
                      <span className="ml-1 text-gray-500 dark:text-gray-400">
                        ({formatAmount(template.amount)})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default QuickEntryForm;
