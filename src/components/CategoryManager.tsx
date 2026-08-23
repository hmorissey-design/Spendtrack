import React, { useState, useMemo } from 'react';
import { 
  DollarSign, X, CheckCircle, Plus, Edit, Eye, EyeOff, Tag,
  Utensils, ShoppingBag, Film, Car, Sparkles, Coffee, Briefcase, 
  Gift, Heart, Home, Laptop, Dumbbell, Plane, Users, Phone, 
  HelpCircle, Beer, Flame, Train, PiggyBank, Calendar, SlidersHorizontal
} from 'lucide-react';
import { LocalDb } from '../utils/db';
import { Category, MonthlyBudget } from '../types';

const COLOR_PRESETS = [
  // Greens
  { label: 'Emerald Spark', value: 'emerald', bgClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', textClass: 'text-emerald-400', hex: '#10b981' },
  { label: 'Forest Green', value: 'green', bgClass: 'bg-green-600/10 text-green-400 border border-green-600/20', textClass: 'text-green-400', hex: '#22c55e' },
  { label: 'Bright Lime', value: 'lime', bgClass: 'bg-lime-500/10 text-lime-400 border border-lime-500/20', textClass: 'text-lime-400', hex: '#84cc16' },

  // Reds / Pinks
  { label: 'Crimson Rose', value: 'rose', bgClass: 'bg-rose-500/10 text-rose-400 border border-rose-500/20', textClass: 'text-rose-400', hex: '#f43f5e' },
  { label: 'Ruby Red', value: 'red', bgClass: 'bg-red-500/10 text-red-400 border border-red-500/20', textClass: 'text-red-400', hex: '#ef4444' },
  { label: 'Hot Pink', value: 'pink', bgClass: 'bg-pink-500/10 text-pink-400 border border-pink-500/20', textClass: 'text-pink-400', hex: '#ec4899' },

  // Purples / Indigos
  { label: 'Cosmic Purple', value: 'purple', bgClass: 'bg-purple-500/10 text-purple-400 border border-purple-500/20', textClass: 'text-purple-400', hex: '#8b5cf6' },
  { label: 'Deep Violet', value: 'violet', bgClass: 'bg-violet-600/10 text-violet-400 border border-violet-600/20', textClass: 'text-violet-400', hex: '#7c3aed' },
  { label: 'Royal Indigo', value: 'indigo', bgClass: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20', textClass: 'text-indigo-400', hex: '#6366f1' },

  // Blues / Cyans
  { label: 'Ocean Blue', value: 'blue', bgClass: 'bg-blue-500/10 text-blue-400 border border-blue-500/20', textClass: 'text-blue-400', hex: '#3b82f6' },
  { label: 'Sky Blue', value: 'sky', bgClass: 'bg-sky-500/10 text-sky-400 border border-sky-500/20', textClass: 'text-sky-400', hex: '#0ea5e9' },
  { label: 'Ocean Teal', value: 'teal', bgClass: 'bg-teal-500/10 text-teal-400 border border-teal-500/20', textClass: 'text-teal-400', hex: '#0d9488' },

  // Yellows / Oranges
  { label: 'Amber Glow', value: 'amber', bgClass: 'bg-amber-500/10 text-amber-400 border border-amber-500/20', textClass: 'text-amber-400', hex: '#f59e0b' },
  { label: 'Gold Yellow', value: 'yellow', bgClass: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20', textClass: 'text-yellow-400', hex: '#eab308' },
  { label: 'Sunset Orange', value: 'orange', bgClass: 'bg-orange-500/10 text-orange-400 border border-orange-500/20', textClass: 'text-orange-400', hex: '#f97316' },

  // Grays / Earthy
  { label: 'Carbon Gray', value: 'slate', bgClass: 'bg-slate-500/10 text-slate-300 border border-slate-500/20', textClass: 'text-slate-400', hex: '#64748b' },
  { label: 'Earthy Stone', value: 'stone', bgClass: 'bg-stone-500/10 text-stone-300 border border-stone-500/20', textClass: 'text-stone-400', hex: '#78716c' },
  { label: 'Cool Zinc', value: 'zinc', bgClass: 'bg-zinc-500/10 text-zinc-300 border border-zinc-500/20', textClass: 'text-zinc-400', hex: '#71717a' },
];

const ICON_PRESETS = [
  'Utensils', 'ShoppingBag', 'Film', 'Car', 'Sparkles', 'Coffee', 'Briefcase', 'Gift', 'Heart', 'Home', 'Laptop', 'Dumbbell', 'Plane', 'Users', 'Phone', 'HelpCircle', 'Beer', 'Flame', 'Train', 'PiggyBank', 'Calendar'
];

export function renderCategoryIcon(iconName: string, size = 16) {
  switch (iconName) {
    case 'PiggyBank': return <PiggyBank size={size} />;
    case 'Calendar': return <Calendar size={size} />;
    case 'Utensils': return <Utensils size={size} />;
    case 'ShoppingBag': return <ShoppingBag size={size} />;
    case 'Film': return <Film size={size} />;
    case 'Car': return <Car size={size} />;
    case 'Sparkles': return <Sparkles size={size} />;
    case 'Coffee': return <Coffee size={size} />;
    case 'Briefcase': return <Briefcase size={size} />;
    case 'Gift': return <Gift size={size} />;
    case 'Heart': return <Heart size={size} />;
    case 'Home': return <Home size={size} />;
    case 'Laptop': return <Laptop size={size} />;
    case 'Dumbbell': return <Dumbbell size={size} />;
    case 'Plane': return <Plane size={size} />;
    case 'Users': return <Users size={size} />;
    case 'Phone': return <Phone size={size} />;
    case 'HelpCircle': return <HelpCircle size={size} />;
    case 'Beer': return <Beer size={size} />;
    case 'Flame': return <Flame size={size} />;
    case 'Train': return <Train size={size} />;
    default: return <Tag size={size} />;
  }
}

interface CategoryManagerProps {
  categories: Category[];
  fixedExpenses?: Array<{ id: string; label: string; amount: number; isHidden?: boolean }>;
  currentBudget: MonthlyBudget;
  onCategoryAdded: (catData: Omit<Category, 'id'>, isDefault?: boolean) => boolean | void;
  onCategoryUpdated: (cat: Category, isDefault?: boolean) => boolean | void;
  onCategoryDeleted: (id: string) => void;
  onFixedExpenseUpdated?: (id: string, updates: Partial<{ label: string; amount: number; isHidden: boolean }>) => void;
  onSavingsGoalUpdated?: (id: string, updates: Partial<{ label: string; amount: number; targetAmount?: number; currentAmount?: number; allocationPercent?: number; isHidden?: boolean }>) => void;
  defaultCategoryId: string;
  currencySymbol: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CategoryManager({
  categories,
  fixedExpenses = [],
  currentBudget,
  onCategoryAdded,
  onCategoryUpdated,
  onCategoryDeleted,
  onFixedExpenseUpdated,
  onSavingsGoalUpdated,
  defaultCategoryId,
  currencySymbol,
  isOpen,
  onClose
}: CategoryManagerProps) {
  // Local notification states
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter tab state: 'all' | 'spending' | 'fixed'
  const [activeTab, setActiveTab] = useState<'all' | 'spending' | 'fixed'>('all');

  // Creator state
  const [editingCategory, setEditingCategory] = useState<Category | 'new' | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formLimit, setFormLimit] = useState<string>('0');
  const [formIcon, setFormIcon] = useState<string>('Tag');
  const [formColor, setFormColor] = useState<string>('emerald');
  const [formIsHidden, setFormIsHidden] = useState<boolean>(false);

  // Build complete list of categories (Daily Spending, Known/Fixed Expenses, Business)
  const unifiedCategories = useMemo(() => {
    // 1. Get standard categories from props / LocalDb
    const list: Array<Category & { categoryType: 'spending' | 'fixed' | 'business' }> = categories
      .filter(c => !c.id.startsWith('SAVINGS_'))
      .map(c => {
        let categoryType: 'spending' | 'fixed' | 'business' = 'spending';
        if (c.id === 'cat_business_expense') {
          categoryType = 'business';
        }
        return {
          ...c,
          categoryType
        };
      });

    // 2. Synthesize Known/Fixed Expense categories if not present
    fixedExpenses.forEach(fix => {
      const synthId = `FIXED_${fix.id}`;
      const exists = list.some(c => c.id === synthId || c.name.toLowerCase() === fix.label.toLowerCase());
      if (!exists) {
        list.push({
          id: synthId,
          name: fix.label,
          icon: 'Calendar',
          color: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
          textColor: 'text-sky-400',
          limit: fix.amount,
          isDefault: false,
          categoryType: 'fixed',
          isHidden: fix.isHidden
        });
      }
    });

    return list;
  }, [categories, fixedExpenses]);

  // Filter categories according to active tab
  const filteredCategories = useMemo(() => {
    if (activeTab === 'spending') {
      return unifiedCategories.filter(c => c.categoryType === 'spending' || c.categoryType === 'business');
    }
    if (activeTab === 'fixed') {
      return unifiedCategories.filter(c => c.categoryType === 'fixed');
    }
    return unifiedCategories;
  }, [unifiedCategories, activeTab]);

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormLimit(cat.id === 'cat_uncategorized' ? '0' : (cat.limit || 0).toString());
    setFormIcon(cat.icon || 'Tag');
    setFormIsHidden(!!cat.isHidden);
    
    // Reverse-guess form color state from preset
    const match = COLOR_PRESETS.find(p => (cat.color || '').includes(p.value));
    setFormColor(match ? match.value : 'emerald');
    setErrorMsg(null);
  };

  const handleOpenCreateNew = () => {
    setEditingCategory('new');
    setFormName('');
    setFormLimit('0');
    setFormIcon('Sparkles');
    
    const assignedPreset = COLOR_PRESETS[categories.length % COLOR_PRESETS.length];
    setFormColor(assignedPreset.value);
    
    setFormIsHidden(false);
    setErrorMsg(null);
  };

  const handleToggleHideCategory = (cat: any) => {
    if (cat.id.startsWith('FIXED_')) {
      const realId = cat.id.replace('FIXED_', '');
      if (onFixedExpenseUpdated) {
        onFixedExpenseUpdated(realId, { isHidden: !cat.isHidden });
      }
    } else if (cat.id.startsWith('SAVINGS_')) {
      const realId = cat.id.replace('SAVINGS_', '');
      if (onSavingsGoalUpdated) {
        onSavingsGoalUpdated(realId, { isHidden: !cat.isHidden });
      }
    } else {
      const updated = { ...cat, isHidden: !cat.isHidden };
      onCategoryUpdated(updated);
    }
    setSuccessMsg(`"${cat.name}" is now ${!cat.isHidden ? 'hidden' : 'visible'}.`);
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  const handleSaveCategoryForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setErrorMsg('Please enter a category name.');
      return;
    }
    
    const isUncategorized = typeof editingCategory === 'object' && editingCategory !== null && editingCategory.id === 'cat_uncategorized';
    const isFixed = typeof editingCategory === 'object' && editingCategory !== null && (editingCategory.id.startsWith('FIXED_') || (editingCategory as any).categoryType === 'fixed');
    const isSavings = typeof editingCategory === 'object' && editingCategory !== null && (editingCategory.id.startsWith('SAVINGS_') || (editingCategory as any).categoryType === 'savings');
    
    let parsedLimit = isUncategorized ? 0 : parseFloat(formLimit);
    if (!isUncategorized && (isNaN(parsedLimit) || parsedLimit < 0)) {
      setErrorMsg('Please enter a valid positive numeric limit.');
      return;
    }
    parsedLimit = Math.round(parsedLimit * 100) / 100;

    const selectedPreset = COLOR_PRESETS.find(p => p.value === formColor) || COLOR_PRESETS[0];

    if (editingCategory === 'new') {
      const newCatData: Omit<Category, 'id'> = {
        name: formName.trim(),
        limit: parsedLimit,
        icon: formIcon,
        color: selectedPreset.bgClass,
        textColor: selectedPreset.textClass,
        isHidden: formIsHidden,
      };
      const success = onCategoryAdded(newCatData);
      if (success === false) return;
      setSuccessMsg('Created custom budget category.');
    } else if (editingCategory) {
      if (isFixed) {
        const realId = editingCategory.id.replace('FIXED_', '');
        if (onFixedExpenseUpdated) {
          onFixedExpenseUpdated(realId, { label: formName.trim(), amount: parsedLimit, isHidden: formIsHidden });
        }
        setSuccessMsg('Updated Known Expense successfully.');
      } else if (isSavings) {
        const realId = editingCategory.id.replace('SAVINGS_', '');
        if (onSavingsGoalUpdated) {
          onSavingsGoalUpdated(realId, { label: formName.trim().replace(/^SAVINGS\s*-\s*/i, ''), isHidden: formIsHidden });
        }
        setSuccessMsg('Updated Savings Goal successfully.');
      } else {
        const updatedCat: Category = {
          ...editingCategory,
          name: formName.trim(),
          limit: parsedLimit,
          icon: formIcon,
          color: selectedPreset.bgClass,
          textColor: selectedPreset.textClass,
          isHidden: formIsHidden,
        };
        const success = onCategoryUpdated(updatedCat);
        if (success === false) return;
        setSuccessMsg('Updated category successfully.');
      }
    }

    setEditingCategory(null);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Main Categories & Budgets Dialogue Box Manager Overlay */}
      <div className="fixed inset-0 bg-black/95 backdrop-blur-lg flex items-center justify-center z-[100] p-4 md:p-6 overflow-y-auto animate-in fade-in duration-250">
        <div className="w-full max-w-lg bg-[#111111] border border-white/10 rounded-2xl p-5 md:p-6 space-y-4 text-white shadow-2xl relative my-auto animate-in zoom-in-95 duration-200" id="dialogue_categories_budgets_manager">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div>
              <h4 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                <DollarSign size={16} className="text-emerald-400" /> Categories & Category Budgets
              </h4>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Manage spending categories, set targets, and toggle category visibility (hide/unhide).
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-white p-1.5 rounded-full cursor-pointer bg-white/5 hover:bg-white/10 border-0 transition-colors"
              title="Close manager"
            >
              <X size={18} />
            </button>
          </div>

          {successMsg && (
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-lg flex items-center gap-1.5 font-sans">
              <CheckCircle size={14} className="text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-lg">
              <span>⚠️ {errorMsg}</span>
            </div>
          )}

          {/* Filter tabs row */}
          <div className="flex items-center gap-1.5 bg-black/40 p-1.5 rounded-xl border border-white/5 font-sans overflow-x-auto text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'all' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              All ({unifiedCategories.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('spending')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'spending' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Daily Spending ({unifiedCategories.filter(c => c.categoryType === 'spending' || c.categoryType === 'business').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('fixed')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'fixed' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Known Expenses ({unifiedCategories.filter(c => c.categoryType === 'fixed').length})
            </button>
          </div>

          {/* Master action to spawn a new creator form inline placed at the top */}
          {!editingCategory && (
            <button
              onClick={handleOpenCreateNew}
              className="w-full py-2 bg-emerald-950/20 hover:bg-emerald-950/40 border border-dashed border-emerald-500/30 text-emerald-400 hover:text-emerald-300 text-xs font-bold tracking-wider uppercase rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center"
            >
              <Plus size={14} className="stroke-[2.5]" /> Add Custom Category
            </button>
          )}

          {/* Categories scrollable deck list */}
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {filteredCategories.map((cat) => {
              const displayLimit = cat.limit || 0;
              const isBusiness = cat.id === 'cat_business_expense';
              const isFixed = cat.categoryType === 'fixed';
              const isDefault = cat.id === defaultCategoryId;
              const displayName = cat.name;

              return (
                <div 
                  key={cat.id} 
                  className={`p-3 rounded-xl border flex items-center justify-between gap-2.5 transition-all ${
                    cat.isHidden 
                      ? 'bg-black/20 border-white/5 opacity-60' 
                      : 'bg-black/40 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center shrink-0 ${
                      cat.color?.includes('/') ? cat.color : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {renderCategoryIcon(cat.icon || (isFixed ? 'Calendar' : 'Tag'), 16)}
                    </div>

                    <div className="min-w-0 text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-gray-200 truncate">{displayName}</span>
                        
                        {/* Type Badges */}
                        {isFixed && (
                          <span className="text-[8px] bg-sky-500/10 text-sky-400 px-1.5 py-0.2 rounded-md font-bold uppercase tracking-wider shrink-0 border border-sky-500/20">
                            Known Expense
                          </span>
                        )}
                        {isBusiness && (
                          <span className="text-[8px] bg-purple-500/10 text-purple-400 px-1.5 py-0.2 rounded-md font-bold uppercase tracking-wider shrink-0 border border-purple-500/20">
                            Business
                          </span>
                        )}
                        {isDefault && (
                          <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.2 rounded-md font-bold uppercase tracking-wider shrink-0 border border-emerald-500/20">
                            Default
                          </span>
                        )}
                        {cat.isHidden && (
                          <span className="text-[8px] bg-amber-500/10 text-amber-400 px-1.5 py-0.2 rounded-md font-bold uppercase tracking-wider shrink-0 border border-amber-500/20 flex items-center gap-1">
                            <EyeOff size={9} /> Hidden
                          </span>
                        )}
                      </div>

                      {cat.id === 'cat_uncategorized' ? (
                        <span className="text-xs text-slate-400 font-medium block mt-0.5 font-sans italic">
                          No Budget Limit
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-400 font-bold block mt-0.5 tnum">
                          {isFixed ? 'Commitment' : 'Budget Limit'}: <span className="text-sm font-extrabold">{currencySymbol}{displayLimit.toLocaleString()}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Hide / Unhide Quick Eye Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleHideCategory(cat)}
                      title={cat.isHidden ? 'Unhide category' : 'Hide category'}
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                        cat.isHidden 
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20' 
                          : 'bg-white/5 text-gray-400 border-white/5 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {cat.isHidden ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>

                    {/* Edit button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(cat)}
                      className="p-1.5 bg-[#1C1C1C] hover:bg-[#252525] hover:text-emerald-400 text-gray-400 rounded-lg cursor-pointer border border-white/5 transition-colors"
                      title="Edit category label or options"
                    >
                      <Edit size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all border-0 cursor-pointer shadow-lg shadow-emerald-950/20 text-center"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Modal-like overlay for Editing/Adding Category - Elegant Full Screen Backdrop */}
      {editingCategory && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-lg flex items-center justify-center z-[110] p-4 md:p-6 overflow-y-auto animate-in fade-in duration-250">
          <div className="w-full max-w-md bg-[#111111] border border-white/10 rounded-2xl p-6 space-y-5 text-white shadow-2xl relative my-auto animate-in zoom-in-95 duration-200" id="full_screen_category_builder">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">
                {editingCategory === 'new' ? 'Add New Category' : `Edit Category: ${formName}`}
              </h4>
              <button 
                onClick={() => setEditingCategory(null)} 
                className="text-gray-400 hover:text-white p-1.5 rounded-full cursor-pointer bg-white/5 hover:bg-white/10 border-0 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCategoryForm} className="space-y-5 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1.5 font-sans">Category Label</label>
                <input 
                  type="text" 
                  value={formName}
                  disabled={editingCategory !== 'new' && editingCategory?.id === 'cat_uncategorized'}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Subscriptions, Gym, Pet Food"
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white font-sans text-xs focus:ring-1 focus:ring-emerald-500 outline-hidden focus:border-emerald-500 focus:bg-[#0A0A0A] disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                  autoFocus
                />
              </div>

              {editingCategory !== 'new' && editingCategory?.id === 'cat_uncategorized' ? (
                <div className="bg-black/35 p-3.5 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block font-sans">
                    Budget Cap Limit
                  </span>
                  <p className="text-[11px] text-gray-400 font-medium leading-normal">
                    Uncategorized expenses do not have a budget limit available.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1.5 font-sans">Budget Cap Limit ({currencySymbol})</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-gray-500">{currencySymbol}</span>
                    <input 
                      type="number" 
                      value={formLimit}
                      min="0"
                      step="0.01"
                      onChange={(e) => setFormLimit(e.target.value)}
                      placeholder="0"
                      className="w-full pl-7.5 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500 outline-hidden focus:border-emerald-500 focus:bg-[#0A0A0A] text-right font-bold"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Hide category option */}
              {editingCategory !== 'new' && editingCategory?.id !== 'cat_uncategorized' && (
                <div className="bg-black/35 p-3 rounded-xl border border-white/5 space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={formIsHidden}
                      onChange={(e) => setFormIsHidden(e.target.checked)}
                      className="rounded bg-black/40 border-white/10 text-emerald-500 focus:ring-emerald-500 cursor-pointer h-4 w-4"
                    />
                    <span className="text-[10px] font-bold text-slate-200 uppercase tracking-widest font-sans">
                      Hide this category
                    </span>
                  </label>
                  <p className="text-[9px] text-gray-500 leading-normal ml-6">
                    Hiding this category removes it from active dropdowns and lists. Historical data and older months where this category was used remain untouched.
                  </p>
                </div>
              )}

              {/* Icon selector preset grid */}
              <div>
                <label className="block text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-2 font-sans font-sans">Pick Icon Preset</label>
                <div className="grid grid-cols-6 gap-2 bg-black/20 p-2.5 rounded-xl border border-white/5 max-h-[110px] overflow-y-auto">
                  {ICON_PRESETS.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormIcon(icon)}
                      className={`h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all border ${
                        formIcon === icon 
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' 
                          : 'bg-black/35 border-white/5 hover:border-white/10 text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {renderCategoryIcon(icon, 16)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color style selector presets */}
              <div>
                <label className="block text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-2 font-sans font-sans">Choose Visual Theme</label>
                <div className="grid grid-cols-5 gap-2 bg-black/20 p-2.5 rounded-xl border border-white/5 max-h-[110px] overflow-y-auto">
                  {COLOR_PRESETS.map(preset => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setFormColor(preset.value)}
                      className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer text-[10px] font-semibold transition-all border ${
                        formColor === preset.value
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                          : 'bg-black/35 border-white/5 hover:border-white/10 text-gray-400'
                      }`}
                      style={{ color: preset.hex }}
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: preset.hex }} />
                      <span className="sr-only">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions footer block */}
              <div className="flex gap-2.5 border-t border-white/5 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="flex-1 py-2.5 bg-black/40 hover:bg-[#1A1A1A] hover:text-white text-gray-400 font-bold text-xs uppercase tracking-widest rounded-xl transition-all border border-white/5 cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all border-0 cursor-pointer shadow-lg shadow-emerald-950/20 text-center"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

