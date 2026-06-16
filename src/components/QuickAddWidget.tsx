/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Category, Expense } from '../types';
import { Plus, Check, CreditCard, Wallet, HelpCircle, Coins } from 'lucide-react';

interface QuickAddWidgetProps {
  categories: Category[];
  onSubmit: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  currencySymbol: string;
}

export function QuickAddWidget({ categories, onSubmit, currencySymbol }: QuickAddWidgetProps) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(() => {
    return categories.some(c => c.id === 'cat_uncategorized')
      ? 'cat_uncategorized'
      : (categories[0]?.id || '');
  });
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'digital_wallet' | 'other'>('card');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    onSubmit({
      amount: parsedAmount,
      category,
      note: note.trim() || 'Quick Expense',
      date: new Date().toISOString().substring(0, 10), // Today
      paymentMethod,
    });

    setAmount('');
    setNote('');
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 2000);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#111111] rounded-2xl p-4 border border-white/5 shadow-2xs space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] uppercase font-bold tracking-widest text-[#059669] dark:text-emerald-450 font-mono flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Quick Add Transaction
        </h3>
        {isSuccess && (
          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in duration-200">
            <Check size={12} /> Logged Successfully!
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="block text-[8px] font-bold text-gray-500 uppercase tracking-widest mb-1">Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">{currencySymbol}</span>
            <input
              type="number"
              step="any"
              min="0.01"
              required
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-black/40 border border-white/5 rounded-xl py-1.5 pl-7 pr-3 text-sm font-bold text-white placeholder-gray-600 focus:outline-hidden focus:border-emerald-500/50 transition-colors font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-[8px] font-bold text-gray-500 uppercase tracking-widest mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-black/40 border border-white/5 rounded-xl py-1.5 px-3 text-sm font-semibold text-gray-300 focus:outline-hidden focus:border-emerald-500/50 transition-colors cursor-pointer"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id} className="bg-[#111111] text-gray-300">
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-2.5 items-center">
        <div className="col-span-8">
          <input
            type="text"
            placeholder="Note (e.g. Starbucks, Gas)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full bg-black/40 border border-white/5 rounded-xl py-1.5 px-3 text-xs text-gray-300 placeholder-gray-600 focus:outline-hidden focus:border-emerald-500/50 transition-colors"
          />
        </div>

        <div className="col-span-4">
          <button
            type="submit"
            className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 border-0"
          >
            <Plus size={14} className="stroke-[2.5]" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Pay Method mini selector pill row */}
      <div className="flex items-center gap-2 pt-0.5 border-t border-white/5">
        <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest font-sans">Payment:</span>
        <div className="flex gap-1.5">
          {(['card', 'cash', 'digital_wallet'] as const).map((method) => {
            const isActive = paymentMethod === method;
            const getIcon = () => {
              switch (method) {
                case 'card': return <CreditCard size={10} />;
                case 'cash': return <Coins size={10} />;
                case 'digital_wallet': return <Wallet size={10} />;
                default: return <HelpCircle size={10} />;
              }
            };
            const label = method === 'digital_wallet' ? 'wallet' : method;
            return (
              <button
                type="button"
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium border uppercase tracking-wider transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                    : 'bg-transparent border-white/5 text-gray-500 hover:text-gray-400'
                }`}
              >
                {getIcon()}
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </form>
  );
}
