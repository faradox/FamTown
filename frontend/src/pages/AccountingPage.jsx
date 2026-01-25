/**
 * AccountingPage - Main accounting dashboard
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { startOfMonth, endOfMonth, startOfYear, format, subMonths, addMonths } from 'date-fns';
import { getAppTheme, ThemeIcon } from '../themes/appTheme';
import { categoriesAPI, entriesAPI, templatesAPI } from '../services/accountingAPI';
import { useAccountingStore } from '../stores/useAccountingStore';
import { useViewConfigStore } from '../stores/useViewConfigStore';
import QuickEntryForm from '../components/accounting/QuickEntryForm';
import RecentEntries from '../components/accounting/RecentEntries';
import SummaryCards from '../components/accounting/SummaryCards';
import ExpensesPieChart from '../components/accounting/ExpensesPieChart';
import TrendChart from '../components/accounting/TrendChart';
import FloatingMenu from '../components/common/FloatingMenu';
import ConfigModal from '../components/common/ConfigModal';
import toast from 'react-hot-toast';

const AccountingPage = () => {
  const navigate = useNavigate();
  const theme = getAppTheme();
  const { labels, menu, icons } = theme.accounting;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [yearlySummary, setYearlySummary] = useState(null);

  const {
    categories,
    setCategories,
    setCategoriesLoading,
    entries,
    setEntries,
    setEntriesLoading,
    setEntriesPagination,
    summary,
    setSummary,
    setSummaryLoading,
    templates,
    setTemplates,
    setTemplatesLoading,
  } = useAccountingStore();

  const {
    viewConfigs,
    getBackgroundStyle,
    setBackgroundColor,
    uploadBackgroundImage,
    resetViewConfig,
    hasUserOverride,
    loadAll,
  } = useViewConfigStore();

  const backgroundStyle = getBackgroundStyle('accounting');

  // Calculate period for current month
  const periodStart = startOfMonth(currentDate);
  const periodEnd = endOfMonth(currentDate);
  const fromDateStr = format(periodStart, 'yyyy-MM-dd');
  const toDateStr = format(periodEnd, 'yyyy-MM-dd');
  const yearStart = startOfYear(currentDate);
  const yearFromDateStr = format(yearStart, 'yyyy-MM-dd');

  // Load all data on mount
  useEffect(() => {
    loadAll();
    loadCategories();
    loadTemplates();
  }, []);

  // Load entries and summary when period changes
  useEffect(() => {
    loadEntries();
    loadSummary();
    loadYearlySummary();
  }, [fromDateStr, toDateStr, yearFromDateStr]);

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

  const loadEntries = async () => {
    setEntriesLoading(true);
    try {
      const response = await entriesAPI.list({
        fromDate: fromDateStr,
        toDate: toDateStr,
        pageSize: 20,
        sort: 'date_desc',
      });
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

  const loadSummary = async () => {
    setSummaryLoading(true);
    try {
      const response = await entriesAPI.summary(fromDateStr, toDateStr);
      setSummary(response.data);
    } catch (error) {
      console.error('Error loading summary:', error);
      toast.error('Failed to load summary');
    } finally {
      setSummaryLoading(false);
    }
  };

  const loadYearlySummary = async () => {
    try {
      const response = await entriesAPI.summary(yearFromDateStr, toDateStr);
      setYearlySummary(response.data);
    } catch (error) {
      console.error('Error loading yearly summary:', error);
      toast.error('Failed to load yearly summary');
    }
  };

  const loadTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const response = await templatesAPI.list();
      setTemplates(response.data);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const handleEntryCreated = useCallback(() => {
    // Reload entries and summary after new entry
    loadEntries();
    loadSummary();
    loadYearlySummary();
  }, [fromDateStr, toDateStr, yearFromDateStr]);

  const previousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const menuItems = [
    {
      icon: <ThemeIcon icon={menu.entries.icon} className="w-6 h-6 text-xl" label={menu.entries.label} />,
      label: menu.entries.label,
      color: menu.entries.color,
      onClick: () => navigate('/accounting/entries'),
    },
    {
      icon: <ThemeIcon icon={menu.categories.icon} className="w-6 h-6 text-xl" label={menu.categories.label} />,
      label: menu.categories.label,
      color: menu.categories.color,
      onClick: () => navigate('/accounting/categories'),
    },
    {
      icon: <ThemeIcon icon={menu.templates.icon} className="w-6 h-6 text-xl" label={menu.templates.label} />,
      label: menu.templates.label,
      color: menu.templates.color,
      onClick: () => navigate('/accounting/templates'),
    },
    {
      icon: <ThemeIcon icon={menu.profile.icon} className="w-6 h-6 text-xl" label={menu.profile.label} />,
      label: menu.profile.label,
      color: menu.profile.color,
      onClick: () => navigate('/profile'),
    },
    {
      icon: <ThemeIcon icon={menu.settings.icon} className="w-6 h-6 text-xl" label={menu.settings.label} />,
      label: menu.settings.label,
      color: menu.settings.color,
      onClick: () => setIsConfigOpen(true),
    },
  ];

  return (
    <div className="min-h-screen" style={backgroundStyle}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header with month navigation */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {labels.appTitle}
          </h1>
          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg shadow px-1 py-1 sm:gap-2 sm:px-2">
            <button
              onClick={previousMonth}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 sm:p-2"
              title="Previous month"
            >
              <ThemeIcon icon={icons.chevronLeft} className="w-4 h-4 sm:w-5 sm:h-5" label="Previous month" />
            </button>
            <span className="text-sm font-semibold text-gray-900 dark:text-white px-2 min-w-[110px] text-center sm:text-lg sm:px-4 sm:min-w-[160px]">
              {format(currentDate, 'MMMM yyyy')}
            </span>
            <button
              onClick={nextMonth}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 sm:p-2"
              title="Next month"
            >
              <ThemeIcon icon={icons.chevronRight} className="w-4 h-4 sm:w-5 sm:h-5" label="Next month" />
            </button>
          </div>
        </div>

        {/* Summary Cards - always first */}
        <div className="mb-6">
          <SummaryCards
            summary={summary}
            savingsSummary={yearlySummary}
            currentDate={currentDate}
            isLoading={!summary}
          />
        </div>

        {/* Mobile layout: Quick Entry, Recent Entries, then Charts */}
        <div className="lg:hidden space-y-6">
          <QuickEntryForm onEntryCreated={handleEntryCreated} />
          <RecentEntries entries={entries} maxItems={10} />
          <ExpensesPieChart
            summary={summary}
            categories={categories}
            isLoading={!summary}
          />
          <TrendChart
            summary={summary}
            currentDate={currentDate}
            categories={categories}
            isLoading={!summary}
          />
        </div>

        {/* Desktop layout: Charts first, then Quick Entry + Recent Entries side by side */}
        <div className="hidden lg:block space-y-6">
          {/* Charts Section */}
          <div className="grid grid-cols-2 gap-6">
            <ExpensesPieChart
              summary={summary}
              categories={categories}
              isLoading={!summary}
            />
            <TrendChart
              summary={summary}
              currentDate={currentDate}
              categories={categories}
              isLoading={!summary}
            />
          </div>

          {/* Quick Entry & Recent Entries */}
          <div className="grid grid-cols-2 gap-6">
            <QuickEntryForm onEntryCreated={handleEntryCreated} />
            <RecentEntries entries={entries} maxItems={10} />
          </div>
        </div>
      </div>

      <FloatingMenu items={menuItems} />
      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        viewName="accounting"
        onSetColor={setBackgroundColor}
        onUploadImage={uploadBackgroundImage}
        onReset={resetViewConfig}
        currentConfig={viewConfigs['accounting']}
        hasUserConfig={hasUserOverride('accounting')}
      />
    </div>
  );
};

export default AccountingPage;
