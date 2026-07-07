/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, TrendingUp, HelpCircle, AlertCircle, RefreshCw, DollarSign, Wallet, ShieldCheck, Heart } from 'lucide-react';
import { Expense, Category } from '../types';

interface ContextualTipCardProps {
  expenses: Expense[];
  categories: Category[];
  totalBudget: number;
  totalSpent: number;
}

interface FinancialTip {
  id: string;
  category?: string; // Optional trigger category id
  title: string;
  description: string;
  iconType: 'sparkles' | 'trend' | 'alert' | 'wallet' | 'shield' | 'heart';
}

const GENERAL_TIPS: FinancialTip[] = [
  {
    id: 'rule_50_30_20',
    title: "The 50/30/20 Budgeting Rule",
    description: "Allocate 50% of income to Needs (rent, bills), 30% to Wants (dining out, hobbies), and 20% to Savings or paying off debt.",
    iconType: 'wallet'
  },
  {
    id: 'rule_24_hour',
    title: "The 24-Hour Purchase Rule",
    description: "Wait 24 hours before buying non-essential items over $50. This cooling-off period eliminates impulsive online shopping.",
    iconType: 'sparkles'
  },
  {
    id: 'sub_audit',
    title: "Quarterly Subscription Audit",
    description: "Review streaming, gaming, and app subscriptions. Cancel any service you haven't actively used in the last 30 days.",
    iconType: 'shield'
  },
  {
    id: 'emergency_fund',
    title: "High-Yield Emergency Fund",
    description: "Aim to build 3-6 months of basic living expenses. Keep it in a High-Yield Savings Account (HYSA) so it grows safely.",
    iconType: 'shield'
  },
  {
    id: 'rule_72',
    title: "The Compound Rule of 72",
    description: "Divide 72 by your annual return rate to estimate how many years it will take to double your investment capital.",
    iconType: 'trend'
  },
  {
    id: 'pwa_offline',
    title: "100% Private & Secure",
    description: "ExpenseTrack runs completely offline as a PWA. Your transactions and budgets are kept locally on your phone.",
    iconType: 'heart'
  },
  {
    id: 'cash_envelope',
    title: "The Cash Envelope Trick",
    description: "For highly impulsive categories (like entertainment), withdraw cash for the month. Once the envelope is empty, stop spending.",
    iconType: 'wallet'
  }
];

export function ContextualTipCard({ expenses, categories, totalBudget, totalSpent }: ContextualTipCardProps) {
  const [tipIndex, setTipIndex] = useState<number>(0);

  // Analyze expenses to see if there are contextual triggers
  const activeTips = useMemo(() => {
    const list: FinancialTip[] = [];

    // Trigger 1: Over budget or close to over budget
    if (totalBudget > 0) {
      const budgetPercent = (totalSpent / totalBudget) * 100;
      if (budgetPercent >= 85) {
        list.push({
          id: 'high_spending_alert',
          title: "Budget Exhaustion Warning",
          description: `You have spent ${budgetPercent.toFixed(0)}% of your monthly budget. Pause non-essential shopping to prevent exceeding your target.`,
          iconType: 'alert'
        });
      }
    }

    // Trigger 2: High Category Spendings
    if (expenses.length > 0 && categories.length > 0) {
      // Aggregate spendings by category
      const categorySpendMap: Record<string, number> = {};
      expenses.forEach(e => {
        categorySpendMap[e.category] = (categorySpendMap[e.category] || 0) + e.amount;
      });

      // Find the highest spend category
      let highestCatId = '';
      let highestCatSpent = 0;
      Object.entries(categorySpendMap).forEach(([catId, spent]) => {
        if (spent > highestCatSpent) {
          highestCatSpent = spent;
          highestCatId = catId;
        }
      });

      const highestCat = categories.find(c => c.id === highestCatId);
      if (highestCat && highestCatSpent > 0) {
        const catName = highestCat.name.toLowerCase();
        
        if (catName.includes('food') || catName.includes('grocer') || catName.includes('dining')) {
          list.push({
            id: 'contextual_food_tip',
            title: `Dining & Groceries Savings`,
            description: `Meal planning and buying store-brand groceries can cut your dining expense by up to 30%. Try packing a lunch today!`,
            iconType: 'wallet'
          });
        } else if (catName.includes('shop') || catName.includes('clothes') || catName.includes('purchase')) {
          list.push({
            id: 'contextual_shopping_tip',
            title: `Smart Shopping Strategy`,
            description: `Shopping represents a large slice of this month's spending. Try comparing prices or looking for coupon codes before checkout.`,
            iconType: 'sparkles'
          });
        } else if (catName.includes('transport') || catName.includes('fuel') || catName.includes('car')) {
          list.push({
            id: 'contextual_transport_tip',
            title: `Fuel & Commute Efficiency`,
            description: `Combine errands into single trips or check gas apps for local discounts to optimize transportation costs.`,
            iconType: 'trend'
          });
        } else if (catName.includes('utility') || catName.includes('bill') || catName.includes('rent')) {
          list.push({
            id: 'contextual_utility_tip',
            title: `Utility Bill Reduction`,
            description: `Unplug standby appliances (vampire power), adjust smart thermostats, and review cell plans to save on monthly fixed bills.`,
            iconType: 'shield'
          });
        }
      }
    }

    // Merge contextual triggers and general tips
    return [...list, ...GENERAL_TIPS];
  }, [expenses, categories, totalBudget, totalSpent]);

  // Adjust tip index if list changes and index exceeds length
  useEffect(() => {
    if (tipIndex >= activeTips.length) {
      setTipIndex(0);
    }
  }, [activeTips, tipIndex]);

  const currentTip = activeTips[tipIndex] || GENERAL_TIPS[0];

  const handleNextTip = () => {
    setTipIndex((prev) => (prev + 1) % activeTips.length);
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'sparkles':
        return <Sparkles className="text-yellow-400 shrink-0 stroke-[2]" size={16} />;
      case 'trend':
        return <TrendingUp className="text-emerald-400 shrink-0 stroke-[2]" size={16} />;
      case 'alert':
        return <AlertCircle className="text-rose-400 shrink-0 stroke-[2] animate-bounce" size={16} />;
      case 'wallet':
        return <Wallet className="text-blue-400 shrink-0 stroke-[2]" size={16} />;
      case 'shield':
        return <ShieldCheck className="text-[#10b981] shrink-0 stroke-[2]" size={16} />;
      case 'heart':
        return <Heart className="text-pink-400 shrink-0 stroke-[2]" size={16} />;
      default:
        return <HelpCircle className="text-gray-400 shrink-0 stroke-[2]" size={16} />;
    }
  };

  return (
    <div 
      className="w-full overflow-hidden rounded-xl border border-white/5 bg-[#111111]/80 backdrop-blur-md p-3 text-white transition-all shadow-md relative" 
      id="contextual_tip_card"
    >
      <div className="flex items-start gap-3">
        {/* Left Icon Panel */}
        <div className="p-2 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
          {renderIcon(currentTip.iconType)}
        </div>

        {/* Content Panel */}
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-400 font-mono">
              Smart Savings Tip
            </span>
            {currentTip.id.startsWith('contextual_') && (
              <span className="px-1 py-0.5 text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase rounded font-sans tracking-wide">
                Contextual
              </span>
            )}
            {currentTip.id === 'high_spending_alert' && (
              <span className="px-1 py-0.5 text-[8px] bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold uppercase rounded font-sans tracking-wide animate-pulse">
                Critical
              </span>
            )}
          </div>
          <h4 className="text-xs font-bold text-slate-200 mt-1 truncate">{currentTip.title}</h4>
          <p className="text-[11px] text-gray-400 mt-0.5 leading-normal italic font-medium">
            "{currentTip.description}"
          </p>
        </div>

        {/* Refresh button at absolute top-right */}
        <button
          onClick={handleNextTip}
          className="absolute top-2 right-2 p-1.5 rounded-lg text-gray-500 hover:text-emerald-400 hover:bg-white/5 active:scale-90 transition-all duration-150 cursor-pointer border-0 bg-transparent flex items-center justify-center"
          title="Show next smart financial tip"
        >
          <RefreshCw size={12} className="stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}
