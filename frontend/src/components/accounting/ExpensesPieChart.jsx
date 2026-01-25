/**
 * ExpensesPieChart - Donut chart showing expense breakdown by category
 */

import React, { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { getAppTheme, ThemeIcon } from '../../themes/appTheme';

const ExpensesPieChart = ({ summary, categories = [], isLoading = false }) => {
  const theme = getAppTheme();
  const { labels, icons, palettes } = theme.accounting;
  const [viewMode, setViewMode] = useState('top-level'); // 'top-level' or 'detailed'
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Format amount with German locale
  const formatAmount = (amount) => {
    const num = parseFloat(amount || 0);
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(num);
  };

  // Get category info by ID
  const getCategoryInfo = (categoryId) => {
    return categories.find((c) => c.id === categoryId);
  };

  // Build chart data from summary.byCategory
  const buildChartData = () => {
    if (!summary?.byCategory || summary.byCategory.length === 0) {
      return [];
    }

    if (viewMode === 'detailed') {
      // Show all categories as-is
      return summary.byCategory.map((item, index) => {
        const category = getCategoryInfo(item.categoryId);
        return {
          name: item.name,
          value: parseFloat(item.total),
          percentage: item.percentage,
          color: category?.color || palettes.categories[index % palettes.categories.length],
        };
      });
    }

    // Top-level view: aggregate by parent category
    const parentTotals = {};
    const expenseCategories = categories.filter((c) => c.type === 'expense');

    summary.byCategory.forEach((item) => {
      const category = getCategoryInfo(item.categoryId);
      if (!category) return;

      // Find parent (or use self if top-level)
      const parentId = category.parentId || category.id;
      const parent = expenseCategories.find((c) => c.id === parentId) || category;

      if (!parentTotals[parent.id]) {
        parentTotals[parent.id] = {
          name: parent.name,
          value: 0,
          color: parent.color,
        };
      }
      parentTotals[parent.id].value += parseFloat(item.total);
    });

    // Convert to array and calculate percentages
    const totalExpense = parseFloat(summary.totalExpense || 0);
    return Object.values(parentTotals)
      .map((item, index) => ({
        ...item,
        percentage: totalExpense > 0 ? (item.value / totalExpense) * 100 : 0,
        color: item.color || palettes.categories[index % palettes.categories.length],
      }))
      .sort((a, b) => b.value - a.value);
  };

  const chartData = buildChartData();

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 border border-gray-200 dark:border-gray-700">
          <p className="font-semibold text-gray-900 dark:text-white">{data.name}</p>
          <p className="text-gray-600 dark:text-gray-400">
            {formatAmount(data.value)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            {data.percentage.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom legend
  const CustomLegend = ({ payload }) => {
    if (!payload) return null;
    return (
      <div className="flex flex-wrap justify-center gap-2 mt-2 px-2">
        {payload.slice(0, 6).map((entry, index) => (
          <div key={index} className="flex items-center gap-1 text-xs">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600 dark:text-gray-400 truncate max-w-[80px]">
              {entry.value}
            </span>
          </div>
        ))}
        {payload.length > 6 && (
          <span className="text-xs text-gray-500 dark:text-gray-500">
            +{payload.length - 6} more
          </span>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-8 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="w-48 h-48 rounded-full border-8 border-gray-200 dark:border-gray-700 animate-pulse" />
        </div>
      </div>
    );
  }

  const hasData = chartData.length > 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {labels.expenseBreakdownTitle}
        </h3>
        {/* View mode dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
          >
            {viewMode === 'top-level' ? labels.expenseBreakdownViewTop : labels.expenseBreakdownViewDetailed}
            <ThemeIcon icon={icons.chevronDown} className="w-4 h-4" label="" />
          </button>
          {isDropdownOpen && (
            <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-10">
              <button
                onClick={() => {
                  setViewMode('top-level');
                  setIsDropdownOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 rounded-t-lg ${
                  viewMode === 'top-level'
                    ? 'text-blue-600 dark:text-blue-400 font-medium'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {labels.expenseBreakdownViewTop}
              </button>
              <button
                onClick={() => {
                  setViewMode('detailed');
                  setIsDropdownOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 rounded-b-lg ${
                  viewMode === 'detailed'
                    ? 'text-blue-600 dark:text-blue-400 font-medium'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {labels.expenseBreakdownViewDetailed}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      {hasData ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">
            {labels.expenseBreakdownEmpty}
          </p>
        </div>
      )}
    </div>
  );
};

export default ExpensesPieChart;
