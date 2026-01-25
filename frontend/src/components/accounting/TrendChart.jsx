/**
 * TrendChart - Bar/line chart showing income vs expense over time
 */

import React, { useState, useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { de } from 'date-fns/locale';
import { getAppTheme, ThemeIcon } from '../../themes/appTheme';

const TrendChart = ({ summary, currentDate, categories = [], isLoading = false }) => {
  const theme = getAppTheme();
  const { labels, icons, palettes, colors } = theme.accounting;
  const [chartType, setChartType] = useState('bar'); // 'bar' or 'line'
  const [chartView, setChartView] = useState('summary'); // 'summary' or 'categories'

  const fallbackColors = palettes.trendFallback;
  const incomeColor = colors.chartLegendIncome;
  const expenseColor = colors.chartLegendExpense;

  // Format amount with German locale (compact)
  const formatAmountCompact = (amount) => {
    const num = parseFloat(amount || 0);
    if (num >= 1000) {
      return new Intl.NumberFormat('de-DE', {
        notation: 'compact',
        compactDisplay: 'short',
      }).format(num);
    }
    return new Intl.NumberFormat('de-DE').format(num);
  };

  // Format amount with German locale (full)
  const formatAmount = (amount) => {
    const num = parseFloat(amount || 0);
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(num);
  };

  const daysInMonth = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return allDays.map((date) => ({
      date: format(date, 'yyyy-MM-dd'),
      dayLabel: format(date, 'd', { locale: de }),
      dayFull: format(date, 'd. MMM', { locale: de }),
    }));
  }, [currentDate]);

  // Build chart data from summary.dailyTotals
  const chartData = useMemo(() => {
    if (!summary?.dailyTotals) {
      return [];
    }

    // Create a map of existing data
    const dailyMap = {};
    summary.dailyTotals.forEach((day) => {
      dailyMap[day.date] = {
        date: day.date,
        income: parseFloat(day.income || 0),
        expense: parseFloat(day.expense || 0),
      };
    });

    return daysInMonth.map((day) => {
      const dayData = dailyMap[day.date] || { income: 0, expense: 0 };
      return {
        ...day,
        income: dayData.income,
        expense: dayData.expense,
        net: dayData.income - dayData.expense,
      };
    });
  }, [summary?.dailyTotals, daysInMonth]);

  const categorySeries = useMemo(() => {
    const totals = summary?.dailyCategoryTotals || [];
    if (totals.length === 0) {
      return [];
    }

    const categoryMap = new Map(categories.map((cat) => [cat.id, cat]));
    const seen = new Map();

    totals.forEach((row) => {
      if (!seen.has(row.categoryId)) {
        const category = categoryMap.get(row.categoryId);
        seen.set(row.categoryId, {
          id: row.categoryId,
          name: category?.name || row.categoryName,
          color: category?.color || null,
          sortOrder: category?.sortOrder ?? 0,
        });
      }
    });

    return Array.from(seen.values())
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item, index) => ({
        ...item,
        color: item.color || fallbackColors[index % fallbackColors.length],
      }));
  }, [summary?.dailyCategoryTotals, categories]);

  const detailedChartData = useMemo(() => {
    if (!summary?.dailyCategoryTotals) {
      return [];
    }

    const dailyMap = {};
    summary.dailyCategoryTotals.forEach((row) => {
      if (!dailyMap[row.date]) {
        dailyMap[row.date] = {};
      }
      dailyMap[row.date][row.categoryId] = parseFloat(row.total || 0);
    });

    return daysInMonth.map((day) => {
      const totals = dailyMap[day.date] || {};
      const row = { ...day };
      categorySeries.forEach((category) => {
        row[category.id] = totals[category.id] || 0;
      });
      return row;
    });
  }, [summary?.dailyCategoryTotals, daysInMonth, categorySeries]);

  // Calculate max value for Y axis
  const summaryMaxValue = useMemo(() => {
    if (chartData.length === 0) return 100;
    const max = Math.max(
      ...chartData.map((d) => Math.max(d.income, d.expense))
    );
    return Math.ceil(max * 1.1) || 100; // Add 10% padding
  }, [chartData]);

  const detailedMaxValue = useMemo(() => {
    if (detailedChartData.length === 0) return 100;
    const max = Math.max(
      ...detailedChartData.map((day) =>
        Math.max(0, ...categorySeries.map((category) => day[category.id] || 0))
      )
    );
    return Math.ceil(max * 1.1) || 100;
  }, [detailedChartData, categorySeries]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 border border-gray-200 dark:border-gray-700">
          <p className="font-semibold text-gray-900 dark:text-white mb-2">
            {data?.dayFull}
          </p>
          {chartView === 'summary' ? (
            <div className="space-y-1">
              <p className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: incomeColor }} />
                <span className="text-gray-600 dark:text-gray-400">{labels.entryTypeIncome}:</span>
                <span className={`font-medium ${colors.entryType.income.text}`}>
                  {formatAmount(data?.income)}
                </span>
              </p>
              <p className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: expenseColor }} />
                <span className="text-gray-600 dark:text-gray-400">{labels.entryTypeExpense}:</span>
                <span className={`font-medium ${colors.entryType.expense.text}`}>
                  {formatAmount(data?.expense)}
                </span>
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {payload
                .filter((item) => (item?.value || 0) > 0)
                .map((item) => (
                  <p key={item.dataKey} className="flex items-center gap-2 text-sm">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-gray-600 dark:text-gray-400">
                      {item.name}:
                    </span>
                    <span className="font-medium text-gray-800 dark:text-gray-100">
                      {formatAmount(item.value)}
                    </span>
                  </p>
                ))}
              {payload.every((item) => (item?.value || 0) === 0) && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {labels.noEntriesLabel}
                </p>
              )}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom legend
  const CustomLegend = ({ items }) => (
    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="w-full h-48 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const hasSummaryData = chartData.some((d) => d.income > 0 || d.expense > 0);
  const hasCategoryData = detailedChartData.some((day) =>
    categorySeries.some((category) => day[category.id] > 0)
  );
  const hasData = chartView === 'summary' ? hasSummaryData : hasCategoryData;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {chartView === 'summary' ? labels.trendSummaryTitle : labels.trendCategoriesTitle}
        </h3>
        <div className="flex items-center gap-2">
          <select
            value={chartView}
            onChange={(event) => setChartView(event.target.value)}
            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
          >
            <option value="summary">{labels.trendViewSummaryOption}</option>
            <option value="categories">{labels.trendViewCategoriesOption}</option>
          </select>
          {/* Chart type toggle */}
          <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
            <button
              onClick={() => setChartType('bar')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-sm transition-colors ${
                chartType === 'bar'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              title="Bar chart"
            >
              <ThemeIcon icon={icons.chartBar} className="w-4 h-4" label="Bar chart" />
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-sm transition-colors ${
                chartType === 'line'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              title="Line chart"
            >
              <ThemeIcon icon={icons.chartLine} className="w-4 h-4" label="Line chart" />
            </button>
          </div>
        </div>
      </div>

      {/* Chart */}
      {hasData ? (
        <div className="space-y-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartView === 'summary' ? chartData : detailedChartData}
                margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#E5E7EB"
                  className="dark:stroke-gray-700"
                />
                <XAxis
                  dataKey="dayLabel"
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={20}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatAmountCompact}
                  width={45}
                  domain={[0, chartView === 'summary' ? summaryMaxValue : detailedMaxValue]}
                />
                <Tooltip content={<CustomTooltip />} />

                {chartView === 'summary' ? (
                  chartType === 'bar' ? (
                    <>
                      <Bar
                        dataKey="income"
                        fill={incomeColor}
                        radius={[2, 2, 0, 0]}
                        maxBarSize={20}
                      />
                      <Bar
                        dataKey="expense"
                        fill={expenseColor}
                        radius={[2, 2, 0, 0]}
                        maxBarSize={20}
                      />
                    </>
                  ) : (
                    <>
                      <Line
                        type="monotone"
                        dataKey="income"
                        stroke={incomeColor}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: incomeColor }}
                      />
                      <Line
                        type="monotone"
                        dataKey="expense"
                        stroke={expenseColor}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: expenseColor }}
                      />
                    </>
                  )
                ) : chartType === 'bar' ? (
                  categorySeries.map((category) => (
                    <Bar
                      key={category.id}
                      dataKey={category.id}
                      name={category.name}
                      stackId="categories"
                      fill={category.color}
                      maxBarSize={20}
                    />
                  ))
                ) : (
                  categorySeries.map((category) => (
                    <Line
                      key={category.id}
                      type="monotone"
                      dataKey={category.id}
                      name={category.name}
                      stroke={category.color}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 3, fill: category.color }}
                    />
                  ))
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div>
            <CustomLegend
              items={
                chartView === 'summary'
                  ? [
                      { label: labels.entryTypeIncome, color: colors.chartLegendIncome },
                      { label: labels.entryTypeExpense, color: colors.chartLegendExpense },
                    ]
                  : categorySeries.map((category) => ({
                      label: category.name,
                      color: category.color,
                    }))
              }
            />
          </div>
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">
            {labels.trendNoData}
          </p>
        </div>
      )}
    </div>
  );
};

export default TrendChart;
