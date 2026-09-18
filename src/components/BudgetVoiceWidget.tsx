/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Mic, Plus, Sparkles, AlertCircle, CheckCircle2, TrendingUp, Zap, Volume2 } from 'lucide-react';

interface BudgetVoiceWidgetProps {
  remainingBudget: number;
  totalBudget: number;
  totalSpent: number;
  percentSpent: number;
  currencySymbol: string;
  monthName: string;
  onOpenVoiceModal: () => void;
  onOpenAddExpense?: () => void;
  className?: string;
  variant?: 'full' | 'compact';
}

export const BudgetVoiceWidget: React.FC<BudgetVoiceWidgetProps> = ({
  remainingBudget,
  totalBudget,
  totalSpent,
  percentSpent,
  currencySymbol,
  monthName,
  onOpenVoiceModal,
  onOpenAddExpense,
  className = '',
  variant = 'full'
}) => {
  // Calculate daily remaining pacing for the current month
  const dailyMetrics = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const currentDay = now.getDate();
    const daysRemaining = Math.max(1, totalDaysInMonth - currentDay + 1);

    const safeRemaining = Math.max(0, remainingBudget);
    const dailyAllowance = totalBudget > 0 ? totalBudget / totalDaysInMonth : 0;
    const currentDailyRemaining = safeRemaining / daysRemaining;

    return {
      daysRemaining,
      totalDaysInMonth,
      dailyAllowance,
      currentDailyRemaining
    };
  }, [remainingBudget, totalBudget]);

  const isOverBudget = remainingBudget < 0;
  const isNearLimit = percentSpent >= 80 && !isOverBudget;
  const isOnTrack = !isOverBudget && !isNearLimit;

  // Status badge config
  const statusBadge = useMemo(() => {
    if (isOverBudget) {
      return {
        label: `Over Budget by ${currencySymbol}${Math.abs(remainingBudget).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
        bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        icon: <AlertCircle size={12} className="stroke-[2.5]" />
      };
    }
    if (isNearLimit) {
      return {
        label: `${percentSpent}% Used • Watch Spending`,
        bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        icon: <AlertCircle size={12} className="stroke-[2.5]" />
      };
    }
    return {
      label: `${percentSpent}% Spent • On Track`,
      bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      icon: <CheckCircle2 size={12} className="stroke-[2.5]" />
    };
  }, [isOverBudget, isNearLimit, percentSpent, remainingBudget, currencySymbol]);

  if (variant === 'compact') {
    return (
      <div 
        id="widget_budget_voice_compact"
        className={`bg-linear-to-br from-[#161616] to-[#0f0f0f] border border-white/10 rounded-2xl p-3 shadow-xl flex items-center justify-between gap-3 ${className}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Remaining Budget</span>
            <span className={`text-[9.5px] px-1.5 py-0.2 rounded-full border font-semibold flex items-center gap-1 ${statusBadge.bg}`}>
              {statusBadge.icon}
              {percentSpent}%
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-xl font-black tracking-tight tnum ${isOverBudget ? 'text-rose-400' : 'text-emerald-400'}`}>
              {currencySymbol}{remainingBudget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-gray-400">/ {currencySymbol}{totalBudget.toLocaleString()}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenVoiceModal}
          id="btn_widget_compact_mic"
          className="relative group p-3 bg-linear-to-tr from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 active:scale-95 text-white rounded-xl shadow-lg shadow-emerald-950/50 transition-all cursor-pointer border-0 flex items-center justify-center shrink-0"
          title="1-Tap Voice Expense Entry"
        >
          <span className="absolute -inset-0.5 rounded-xl bg-emerald-400/30 blur-xs group-hover:opacity-100 opacity-60 transition-opacity animate-pulse" />
          <Mic size={18} className="relative z-10 stroke-[2.5]" />
        </button>
      </div>
    );
  }

  return (
    <div 
      id="widget_budget_voice"
      className={`relative overflow-hidden bg-linear-to-br from-[#181818] via-[#131313] to-[#0d0d0d] border border-white/10 rounded-2xl p-4 shadow-xl transition-all ${className}`}
    >
      {/* Background subtle radial aura */}
      <div 
        className={`absolute -top-12 -right-12 w-44 h-44 rounded-full blur-3xl pointer-events-none opacity-20 ${
          isOverBudget ? 'bg-rose-500' : isNearLimit ? 'bg-amber-500' : 'bg-emerald-500'
        }`} 
      />

      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 mb-3 relative z-10">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-gray-300 flex items-center gap-1">
            <Zap size={12} className="text-emerald-400" />
            Budget & Voice Quick Widget
          </span>
        </div>

        <div className={`px-2 py-0.5 rounded-full border text-[10px] font-bold flex items-center gap-1.5 ${statusBadge.bg}`}>
          {statusBadge.icon}
          <span>{statusBadge.label}</span>
        </div>
      </div>

      {/* Main interactive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center relative z-10">
        {/* Left: Remaining Budget Stats */}
        <div className="sm:col-span-7 space-y-2">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">
              Remaining in {monthName}
            </span>
            <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
              <span className={`text-2xl sm:text-3xl font-black tracking-tight tnum ${
                isOverBudget ? 'text-rose-400' : 'text-emerald-400'
              }`}>
                {currencySymbol}{remainingBudget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-gray-400 font-medium">
                left of {currencySymbol}{totalBudget.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-white/5 p-0.5">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  isOverBudget 
                    ? 'bg-rose-500 shadow-rose-500/50' 
                    : isNearLimit 
                    ? 'bg-amber-400 shadow-amber-400/50' 
                    : 'bg-linear-to-r from-emerald-500 to-teal-400 shadow-emerald-500/50'
                }`}
                style={{ width: `${Math.min(100, Math.max(3, percentSpent))}%` }}
              />
            </div>
            
            <div className="flex justify-between items-center text-[10px] text-gray-400 pt-0.5">
              <span>Spent: <b className="text-white tnum">{currencySymbol}{totalSpent.toFixed(2)}</b></span>
              <span className="text-gray-300 font-semibold tnum">
                {dailyMetrics.daysRemaining} days left • <b className="text-emerald-400 font-bold">{currencySymbol}{dailyMetrics.currentDailyRemaining.toFixed(2)}/day</b>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Dedicated Voice & Quick Add Action Cluster */}
        <div className="sm:col-span-5 flex items-center justify-end gap-2 pt-1 sm:pt-0 border-t sm:border-t-0 border-white/5">
          {/* Main 1-Tap Voice Button */}
          <button
            type="button"
            onClick={onOpenVoiceModal}
            id="btn_widget_voice_entry"
            className="flex-1 sm:flex-initial py-3 px-4 sm:px-5 bg-linear-to-tr from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-950/60 transition-all cursor-pointer border-0 flex items-center justify-center gap-2 group"
            title="Press to dictate expense with your microphone"
          >
            <div className="relative flex items-center justify-center">
              <span className="absolute -inset-1 rounded-full bg-white/40 blur-xs group-hover:scale-125 transition-transform animate-ping" />
              <div className="p-1 bg-black/20 rounded-full relative z-10">
                <Mic size={16} className="text-white stroke-[2.5]" />
              </div>
            </div>
            <div className="text-left leading-tight">
              <span className="block text-[12px] font-black tracking-wide">Voice Add</span>
              <span className="block text-[9px] text-emerald-100/90 font-medium">Tap & speak</span>
            </div>
          </button>

          {/* Quick Manual Add Button */}
          {onOpenAddExpense && (
            <button
              type="button"
              onClick={onOpenAddExpense}
              id="btn_widget_manual_add"
              className="py-3 px-3.5 bg-white/5 hover:bg-white/10 active:scale-95 text-gray-200 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-white/10 flex items-center justify-center gap-1.5 shrink-0"
              title="Open standard manual expense form"
            >
              <Plus size={15} className="stroke-[2.5]" />
              <span className="hidden xs:inline text-[11px]">Add</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
