/**
 * SummaryCards - Financial summary statistics cards for dashboard
 */

import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { format, parseISO, startOfYear, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { de } from 'date-fns/locale';
import { getAppTheme, ThemeIcon } from '../../themes/appTheme';

const SummaryCards = ({ summary, savingsSummary, currentDate, isLoading = false }) => {
  const [isSavingsOpen, setIsSavingsOpen] = useState(false);
  const theme = getAppTheme();
  const { summaryCards, labels } = theme.accounting;
  // Format amount with German locale
  const formatAmount = (amount) => {
    const num = parseFloat(amount || 0);
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(num);
  };

  const cards = [
    {
      label: summaryCards.income.label,
      value: summary?.totalIncome || '0',
      icon: summaryCards.income.icon,
      color: summaryCards.income.color,
      bgColor: summaryCards.income.bgColor,
    },
    {
      label: summaryCards.expense.label,
      value: summary?.totalExpense || '0',
      icon: summaryCards.expense.icon,
      color: summaryCards.expense.color,
      bgColor: summaryCards.expense.bgColor,
    },
    {
      label: summaryCards.net.label,
      value: summary?.net || '0',
      icon: summaryCards.net.icon,
      color: parseFloat(summary?.net || 0) >= 0
        ? summaryCards.net.positiveColor
        : summaryCards.net.negativeColor,
      bgColor: parseFloat(summary?.net || 0) >= 0
        ? summaryCards.net.positiveBg
        : summaryCards.net.negativeBg,
    },
    {
      label: summaryCards.savings.label,
      value: savingsSummary?.net || '0',
      icon: summaryCards.savings.icon,
      color: summaryCards.savings.color,
      bgColor: summaryCards.savings.bgColor,
      isSavings: true,
    },
  ];

  const savingsSeries = useMemo(() => {
    if (!savingsSummary?.dailyTotals || !currentDate) {
      return [];
    }

    const monthlyNet = new Map();
    savingsSummary.dailyTotals.forEach((day) => {
      const date = parseISO(day.date);
      const key = format(date, 'yyyy-MM');
      const netValue = parseFloat(day.income || 0) - parseFloat(day.expense || 0);
      monthlyNet.set(key, (monthlyNet.get(key) || 0) + netValue);
    });

    const start = startOfYear(currentDate);
    const end = endOfMonth(currentDate);
    const months = eachMonthOfInterval({ start, end });

    let cumulative = 0;
    return months.map((month) => {
      const key = format(month, 'yyyy-MM');
      cumulative += monthlyNet.get(key) || 0;
      return {
        monthLabel: format(month, 'MMM', { locale: de }),
        value: cumulative,
      };
    });
  }, [savingsSummary?.dailyTotals, currentDate]);

  const hasSavingsSeries = savingsSeries.length > 0;

  // Format amount compactly for mobile
  const formatAmountCompact = (amount) => {
    const num = parseFloat(amount || 0);
    const absNum = Math.abs(num);
    if (absNum >= 1000) {
      return new Intl.NumberFormat('de-DE', {
        notation: 'compact',
        compactDisplay: 'short',
        maximumFractionDigits: 1,
      }).format(num);
    }
    return new Intl.NumberFormat('de-DE', {
      maximumFractionDigits: 0,
    }).format(num);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-2 md:p-4 animate-pulse">
            <div className="flex flex-col md:flex-row items-center gap-1 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1 text-center md:text-left">
                <div className="h-3 md:h-4 w-12 md:w-16 bg-gray-200 dark:bg-gray-700 rounded mb-1 md:mb-2 mx-auto md:mx-0" />
                <div className="h-4 md:h-6 w-16 md:w-24 bg-gray-200 dark:bg-gray-700 rounded mx-auto md:mx-0" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
      {cards.map((card) => {
        const isSavings = card.isSavings;
        return (
          <div
            key={card.label}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-2 md:p-4 relative"
            onClick={
              isSavings
                ? () => setIsSavingsOpen((open) => !open)
                : undefined
            }
            onMouseEnter={isSavings ? () => setIsSavingsOpen(true) : undefined}
            onMouseLeave={isSavings ? () => setIsSavingsOpen(false) : undefined}
          >
            <div className="flex flex-col md:flex-row items-center gap-1 md:gap-3">
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center ${card.bgColor}`}>
                <ThemeIcon icon={card.icon} className={`w-4 h-4 md:w-5 md:h-5 ${card.color}`} label={card.label} />
              </div>
              <div className="text-center md:text-left">
                <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                  {card.label}
                </div>
                {/* Compact on mobile, full on desktop */}
                <div className={`text-sm md:hidden font-bold ${card.color}`}>
                  {formatAmountCompact(card.value)}
                </div>
                <div className={`hidden md:block text-xl font-bold ${card.color}`}>
                  {formatAmount(card.value)}
                </div>
              </div>
            </div>

            {isSavings && isSavingsOpen && (
              <div className="absolute left-1/2 top-full mt-3 w-64 -translate-x-1/2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-gray-800 shadow-xl p-3 z-20">
                <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mb-2">
                  {labels.savingsTooltipTitle}
                </div>
                <div className="h-28">
                  {hasSavingsSeries ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={savingsSeries} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-gray-700" />
                        <XAxis
                          dataKey="monthLabel"
                          tick={{ fontSize: 10, fill: '#9CA3AF' }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: '#9CA3AF' }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={formatAmountCompact}
                          width={38}
                        />
                        <Tooltip
                          formatter={(value) => formatAmount(value)}
                          labelFormatter={(label) => `Month: ${label}`}
                          contentStyle={{
                            backgroundColor: '#111827',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#F9FAFB',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#10B981"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 3, fill: '#10B981' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
                      {labels.savingsTooltipEmpty}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SummaryCards;
