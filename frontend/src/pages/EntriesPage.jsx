/**
 * EntriesPage - Full entry list with filters and pagination
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { getAppTheme, ThemeIcon } from '../themes/appTheme';
import { categoriesAPI, entriesAPI } from '../services/accountingAPI';
import { useAccountingStore } from '../stores/useAccountingStore';
import { useViewConfigStore } from '../stores/useViewConfigStore';
import CategorySelect from '../components/accounting/CategorySelect';
import toast from 'react-hot-toast';

const EntriesPage = () => {
  const navigate = useNavigate();
  const theme = getAppTheme();
  const { labels, icons, colors } = theme.accounting;

  // Filters state
  const [filters, setFilters] = useState({
    type: '',
    categoryId: '',
    fromDate: '',
    toDate: '',
    search: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(25);
  const [sort, setSort] = useState('date_desc');
  const [expandedEntryId, setExpandedEntryId] = useState(null);

  // Edit modal state
  const [editingEntry, setEditingEntry] = useState(null);
  const [editForm, setEditForm] = useState({
    entryType: '',
    amount: '',
    categoryId: '',
    description: '',
    date: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const {
    categories,
    setCategories,
    setCategoriesLoading,
    entries,
    setEntries,
    setEntriesLoading,
    entriesPagination,
    setEntriesPagination,
    updateEntry,
    deleteEntry,
  } = useAccountingStore();

  const { getBackgroundStyle, loadAll } = useViewConfigStore();
  const backgroundStyle = getBackgroundStyle('accounting');

  // Load categories on mount
  useEffect(() => {
    loadAll();
    loadCategories();
  }, []);

  // Load entries when filters or pagination changes
  useEffect(() => {
    loadEntries();
  }, [currentPage, sort, filters.type, filters.categoryId, filters.fromDate, filters.toDate]);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (currentPage === 1) {
        loadEntries();
      } else {
        setCurrentPage(1);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [filters.search]);

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

  const loadEntries = async () => {
    setEntriesLoading(true);
    try {
      const params = {
        page: currentPage,
        pageSize,
        sort,
      };
      if (filters.type) params.type = filters.type;
      if (filters.categoryId) params.categoryId = filters.categoryId;
      if (filters.fromDate) params.fromDate = filters.fromDate;
      if (filters.toDate) params.toDate = filters.toDate;
      if (filters.search) params.search = filters.search;

      const response = await entriesAPI.list(params);
      setEntries(response.data.items);
      setEntriesPagination({
        total: response.data.total,
        page: response.data.page,
        pageSize: response.data.pageSize,
        totalPages: response.data.totalPages,
      });
    } catch (error) {
      console.error('Error loading entries:', error);
      toast.error('Failed to load entries');
    } finally {
      setEntriesLoading(false);
    }
  };

  const handleDelete = async (entry) => {
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

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setEditForm({
      entryType: entry.entryType,
      amount: entry.amount,
      categoryId: entry.categoryId,
      description: entry.description || '',
      date: entry.date,
    });
  };

  const handleUpdate = async () => {
    if (!editForm.amount || parseFloat(editForm.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!editForm.categoryId) {
      toast.error('Please select a category');
      return;
    }

    setIsUpdating(true);
    try {
      const response = await entriesAPI.update(editingEntry.id, {
        entryType: editForm.entryType,
        amount: parseFloat(editForm.amount),
        categoryId: editForm.categoryId,
        description: editForm.description || undefined,
        date: editForm.date,
      });
      updateEntry(editingEntry.id, response.data);
      setEditingEntry(null);
      toast.success('Entry updated');
    } catch (error) {
      console.error('Error updating entry:', error);
      toast.error('Failed to update entry');
    } finally {
      setIsUpdating(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      type: '',
      categoryId: '',
      fromDate: '',
      toDate: '',
      search: '',
    });
    setCurrentPage(1);
  };

  const hasActiveFilters = filters.type || filters.categoryId || filters.fromDate || filters.toDate || filters.search;

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
      year: 'numeric',
    }).format(date);
  };

  return (
    <div className="min-h-screen" style={backgroundStyle}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/accounting')}
            className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            <ThemeIcon icon={icons.back} className="w-5 h-5" label="Back" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {labels.entriesTitle}
          </h1>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
          <div className="p-4 flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <ThemeIcon icon={icons.search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" label="" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder={labels.searchPlaceholder}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                hasActiveFilters
                  ? colors.filterActive
                  : colors.filterInactive
              }`}
            >
              <ThemeIcon icon={icons.filter} className="w-4 h-4" label={labels.filtersLabel} />
              {labels.filtersLabel}
              {hasActiveFilters && (
                <span className="ml-1 w-2 h-2 rounded-full bg-blue-500" />
              )}
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {labels.filtersClear}
              </button>
            )}
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="px-4 pb-4 pt-2 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {labels.filtersTypeLabel}
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => {
                    setFilters({ ...filters, type: e.target.value, categoryId: '' });
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{labels.filtersTypeAll}</option>
                  <option value="income">{labels.filtersTypeIncome}</option>
                  <option value="expense">{labels.filtersTypeExpense}</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {labels.filtersCategoryLabel}
                </label>
                <CategorySelect
                  value={filters.categoryId}
                  onChange={(val) => {
                    setFilters({ ...filters, categoryId: val });
                    setCurrentPage(1);
                  }}
                  type={filters.type || undefined}
                  placeholder={labels.filtersCategoryAll}
                />
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {labels.filtersFromLabel}
                </label>
                <input
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) => {
                    setFilters({ ...filters, fromDate: e.target.value });
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {labels.filtersToLabel}
                </label>
                <input
                  type="date"
                  value={filters.toDate}
                  onChange={(e) => {
                    setFilters({ ...filters, toDate: e.target.value });
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>

        {/* Entries Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                    {labels.entriesTableDate}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                    {labels.entriesTableType}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                    {labels.entriesTableCategory}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                    {labels.entriesTableDescription}
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                    {labels.entriesTableAmount}
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                    {labels.entriesTableActions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      {labels.entriesNone}
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <React.Fragment key={entry.id}>
                      <tr
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer sm:cursor-default"
                        onClick={() =>
                          setExpandedEntryId((current) =>
                            current === entry.id ? null : entry.id
                          )
                        }
                      >
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white hidden sm:table-cell">
                          {formatDate(entry.date)}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            entry.entryType === 'income'
                              ? `${colors.entryType.income.soft} ${colors.entryType.income.text}`
                              : `${colors.entryType.expense.soft} ${colors.entryType.expense.text}`
                          }`}>
                            {entry.entryType === 'income' ? (
                              <ThemeIcon icon={icons.income} className="w-3 h-3" label={labels.entryTypeIncome} />
                            ) : (
                              <ThemeIcon icon={icons.expense} className="w-3 h-3" label={labels.entryTypeExpense} />
                            )}
                            {entry.entryType === 'income' ? labels.entryTypeIncome : labels.entryTypeExpense}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {entry.categoryName}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate hidden sm:table-cell">
                          {entry.description || '-'}
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-semibold ${
                          entry.entryType === 'income'
                            ? colors.entryType.income.text
                            : colors.entryType.expense.text
                        }`}>
                          {formatAmount(entry.amount, entry.entryType)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                handleEdit(entry);
                              }}
                              className="p-1.5 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 rounded transition-colors"
                              title="Edit"
                            >
                              <ThemeIcon icon={icons.edit} className="w-4 h-4" label="Edit" />
                            </button>
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDelete(entry);
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded transition-colors"
                              title="Delete"
                            >
                              <ThemeIcon icon={icons.delete} className="w-4 h-4" label="Delete" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedEntryId === entry.id && (
                        <tr className="sm:hidden">
                          <td colSpan={6} className="px-4 pb-4">
                            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 p-3 text-sm text-gray-700 dark:text-gray-200">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold text-gray-900 dark:text-white">
                                  {formatDate(entry.date)}
                                </span>
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                  entry.entryType === 'income'
                                    ? `${colors.entryType.income.soft} ${colors.entryType.income.text}`
                                    : `${colors.entryType.expense.soft} ${colors.entryType.expense.text}`
                                }`}>
                                  {entry.entryType === 'income' ? (
                                    <ThemeIcon icon={icons.income} className="w-3 h-3" label={labels.entryTypeIncome} />
                                  ) : (
                                    <ThemeIcon icon={icons.expense} className="w-3 h-3" label={labels.entryTypeExpense} />
                                  )}
                                  {entry.entryType === 'income' ? labels.entryTypeIncome : labels.entryTypeExpense}
                                </span>
                              </div>
                              <div className="text-gray-600 dark:text-gray-300">
                                {entry.description || 'No description'}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {entriesPagination.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, entriesPagination.total)} of {entriesPagination.total} entries
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ThemeIcon icon={icons.chevronLeft} className="w-4 h-4" label="Previous page" />
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Page {currentPage} of {entriesPagination.totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(entriesPagination.totalPages, currentPage + 1))}
                  disabled={currentPage === entriesPagination.totalPages}
                  className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ThemeIcon icon={icons.chevronRight} className="w-4 h-4" label="Next page" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {labels.entryEditTitle}
              </h2>
              <button
                onClick={() => setEditingEntry(null)}
                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <ThemeIcon icon={icons.close} className="w-5 h-5" label="Close" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Entry Type */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, entryType: 'expense', categoryId: '' })}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    editForm.entryType === 'expense'
                      ? `${colors.entryType.expense.solid} text-white`
                      : colors.neutralAction
                  }`}
                >
                  {labels.entryTypeExpense}
                </button>
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, entryType: 'income', categoryId: '' })}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    editForm.entryType === 'income'
                      ? `${colors.entryType.income.solid} text-white`
                      : colors.neutralAction
                  }`}
                >
                  {labels.entryTypeIncome}
                </button>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {labels.amountLabel}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {labels.categoryLabel}
                </label>
                <CategorySelect
                  value={editForm.categoryId}
                  onChange={(val) => setEditForm({ ...editForm, categoryId: val })}
                  type={editForm.entryType}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {labels.descriptionLabel}
                </label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {labels.dateLabel}
                </label>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditingEntry(null)}
                  disabled={isUpdating}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  {labels.entryCancelLabel}
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={isUpdating}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isUpdating ? labels.entrySavingLabel : labels.entrySaveLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EntriesPage;
