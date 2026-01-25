/**
 * RecentEntries - List of recent accounting entries for dashboard
 */

import React from 'react';
import { getAppTheme, ThemeIcon } from '../../themes/appTheme';
import { useNavigate } from 'react-router-dom';
import { entriesAPI } from '../../services/accountingAPI';
import { useAccountingStore } from '../../stores/useAccountingStore';
import toast from 'react-hot-toast';

const RecentEntries = ({ entries = [], maxItems = 10 }) => {
  const navigate = useNavigate();
  const { deleteEntry } = useAccountingStore();
  const theme = getAppTheme();
  const { labels, icons, colors } = theme.accounting;

  // Format amount with German locale
  const formatAmount = (amount, type) => {
    const num = parseFloat(amount);
    const formatted = new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(num);
    return type === 'income' ? `+${formatted}` : `-${formatted}`;
  };

  // Format date with German locale
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
    }).format(date);
  };

  const handleDelete = async (entry, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this entry?')) {
      return;
    }

    try {
      await entriesAPI.delete(entry.id);
      deleteEntry(entry.id);
      toast.success('Entry deleted');
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error('Failed to delete entry');
    }
  };

  const displayedEntries = entries.slice(0, maxItems);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {labels.recentEntriesTitle}
        </h3>
        <button
          onClick={() => navigate('/accounting/entries')}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
        >
          {labels.viewAll}
        </button>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {displayedEntries.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
            {labels.entriesEmpty}
          </div>
        ) : (
          displayedEntries.map((entry) => (
            <div
              key={entry.id}
              className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              {/* Icon */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                entry.entryType === 'income'
                  ? `${colors.entryType.income.soft} ${colors.entryType.income.text}`
                  : `${colors.entryType.expense.soft} ${colors.entryType.expense.text}`
              }`}>
                {entry.entryType === 'income' ? (
                  <ThemeIcon icon={icons.income} className="w-4 h-4" label={labels.entryTypeIncome} />
                ) : (
                  <ThemeIcon icon={icons.expense} className="w-4 h-4" label={labels.entryTypeExpense} />
                )}
              </div>

              {/* Date */}
              <div className="w-12 text-sm text-gray-500 dark:text-gray-400">
                {formatDate(entry.date)}
              </div>

              {/* Description & Category */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {entry.description || entry.categoryName || 'No description'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {entry.categoryName}
                </div>
              </div>

              {/* Amount */}
              <div className={`text-sm font-semibold ${
                entry.entryType === 'income'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {formatAmount(entry.amount, entry.entryType)}
              </div>

              {/* Actions */}
              <div className="flex-shrink-0 flex gap-1">
                <button
                  onClick={(e) => handleDelete(entry, e)}
                  className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded transition-colors"
                  title="Delete entry"
                >
                  <ThemeIcon icon={icons.delete} className="w-4 h-4" label="Delete entry" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RecentEntries;
