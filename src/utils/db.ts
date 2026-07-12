/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Expense, Category, MonthlyBudget } from '../types';

const getLocalMonthString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

// Safe localStorage fallback wrapper for strict incognito / private browser modes
const safeStorage = (() => {
  const memoryStorage: Record<string, string> = {};
  return {
    getItem(key: string): string | null {
      try {
        return window.localStorage.getItem(key);
      } catch (e) {
        return memoryStorage[key] || null;
      }
    },
    setItem(key: string, value: string): void {
      try {
        window.localStorage.setItem(key, value);
      } catch (e) {
        memoryStorage[key] = value;
      }
    },
    removeItem(key: string): void {
      try {
        window.localStorage.removeItem(key);
      } catch (e) {
        delete memoryStorage[key];
      }
    }
  };
})();

// Shadow global localStorage safely to capture all database operations
const localStorage = safeStorage;

const STORAGE_KEYS = {
  EXPENSES: 'personal_finance_app_expenses',
  CATEGORIES: 'personal_finance_app_categories',
  BUDGET: 'personal_finance_app_budget',
  HAS_INITIALIZED: 'personal_finance_app_has_init',
  DEFAULT_CATEGORY: 'personal_finance_app_default_category_id',
  CURRENCY_SYMBOL: 'personal_finance_app_currency_symbol',
};

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat_uncategorized', name: 'Uncategorized', icon: 'Tag', color: 'bg-slate-500/10 text-slate-300 border border-slate-500/20', textColor: 'text-slate-400', isDefault: true, limit: 0 },
  { id: 'cat_bars', name: 'Bar', icon: 'Beer', color: 'bg-amber-500/10 text-amber-400 border border-amber-500/20', textColor: 'text-amber-400', isDefault: true, limit: 0 },
  { id: 'cat_restaurants', name: 'Restaurants', icon: 'Utensils', color: 'bg-rose-500/10 text-rose-400 border border-rose-500/20', textColor: 'text-rose-400', isDefault: true, limit: 0 },
  { id: 'cat_coffee_shops', name: 'Coffee shops', icon: 'Coffee', color: 'bg-orange-500/10 text-orange-400 border border-orange-500/20', textColor: 'text-orange-400', isDefault: true, limit: 0 },
  { id: 'cat_smoking', name: 'Smoking', icon: 'Flame', color: 'bg-red-500/10 text-red-400 border border-red-500/20', textColor: 'text-red-400', isDefault: true, limit: 0 },
  { id: 'cat_entertainment', name: 'Entertainment', icon: 'Film', color: 'bg-purple-500/10 text-purple-400 border border-purple-500/20', textColor: 'text-purple-400', isDefault: true, limit: 0 },
  { id: 'cat_groceries', name: 'Groceries', icon: 'ShoppingBag', color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', textColor: 'text-emerald-400', isDefault: true, limit: 0 },
  { id: 'cat_gas_auto', name: 'Gas auto', icon: 'Car', color: 'bg-blue-500/10 text-blue-400 border border-blue-500/20', textColor: 'text-blue-400', isDefault: true, limit: 0 },
  { id: 'cat_business_expense', name: 'Business Expense', icon: 'Briefcase', color: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20', textColor: 'text-indigo-400', isDefault: true, limit: 0 },
];

const getCurrentMonthDayString = (day: number) => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  return `${year}-${month}-${dayStr}`;
};

const getDaysAgoString = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDefaultExpenses = (): Expense[] => {
  // Return an empty array on first install so users start with a clean state as requested
  return [];
};

export const INITIAL_BUDGET = 0; // $0 starting layout (user customizable)

export const LocalDb = {
  /**
   * Initializes the local private database.
   * If first install, configures an empty schema structure with defaults.
   */
  initialize(): void {
    const isInit = localStorage.getItem(STORAGE_KEYS.HAS_INITIALIZED);
    if (!isInit) {
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(getDefaultExpenses()));
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
      
      const currentMonth = getLocalMonthString(); // "YYYY-MM"
      const budget: MonthlyBudget = {
        month: currentMonth,
        limitAmount: INITIAL_BUDGET,
        categoryLimits: {
          'cat_groceries': 0,
          'cat_restaurants': 0,
          'cat_bars': 0,
          'cat_coffee_shops': 0,
          'cat_smoking': 0,
          'cat_entertainment': 0,
          'cat_gas_auto': 0,
          'cat_business_expense': 0,
        },
      };
      localStorage.setItem(STORAGE_KEYS.BUDGET, JSON.stringify([budget]));
      localStorage.setItem(STORAGE_KEYS.HAS_INITIALIZED, 'true');
    }
  },

  /**
   * Cleans the database, leaving it perfectly empty (except for defaults)
   */
  resetToFreshInstall(): void {
    localStorage.removeItem(STORAGE_KEYS.EXPENSES);
    localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
    localStorage.removeItem(STORAGE_KEYS.BUDGET);
    localStorage.removeItem(STORAGE_KEYS.HAS_INITIALIZED);
    // When clearing for fresh install, we initialize with completely empty expenses, unlike default demo seed
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
    
    const currentMonth = getLocalMonthString(); // "YYYY-MM"
    const budget: MonthlyBudget = {
      month: currentMonth,
      limitAmount: INITIAL_BUDGET,
      categoryLimits: {
        'cat_groceries': 0,
        'cat_restaurants': 0,
        'cat_bars': 0,
        'cat_coffee_shops': 0,
        'cat_smoking': 0,
        'cat_entertainment': 0,
        'cat_gas_auto': 0,
        'cat_business_expense': 0,
      },
    };
    localStorage.setItem(STORAGE_KEYS.BUDGET, JSON.stringify([budget]));
    localStorage.setItem(STORAGE_KEYS.HAS_INITIALIZED, 'true');
  },

  /**
   * Clears existing data and populates 10 diverse, beautiful demo transactions within the current month
   */
  resetToDemoData(): void {
    localStorage.removeItem(STORAGE_KEYS.EXPENSES);
    localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
    localStorage.removeItem(STORAGE_KEYS.BUDGET);
    localStorage.removeItem(STORAGE_KEYS.HAS_INITIALIZED);
    this.initialize();
  },

  // EXPENSES METHODS
  getExpenses(): Expense[] {
    this.initialize();
    const data = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    return data ? JSON.parse(data) : [];
  },

  saveExpenses(expenses: Expense[]): void {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  },

  addExpense(expense: Omit<Expense, 'id' | 'createdAt'>): Expense {
    const expenses = this.getExpenses();
    const newExpense: Expense = {
      ...expense,
      id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
    };
    expenses.unshift(newExpense); // Insert new expense first
    this.saveExpenses(expenses);
    return newExpense;
  },

  deleteExpense(id: string): void {
    const expenses = this.getExpenses();
    const filtered = expenses.filter(e => e.id !== id);
    this.saveExpenses(filtered);
  },

  updateExpense(updatedExpense: Expense): void {
    const expenses = this.getExpenses();
    const index = expenses.findIndex(e => e.id === updatedExpense.id);
    if (index !== -1) {
      expenses[index] = updatedExpense;
      this.saveExpenses(expenses);
    }
  },

  // CATEGORIES METHODS
  getCategoriesOnly(): Category[] {
    const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    let parsed: Category[] = data ? JSON.parse(data) : DEFAULT_CATEGORIES;
    
    let modified = false;

    // Auto-migrate to guarantee "Uncategorized" exists
    if (Array.isArray(parsed) && !parsed.some(c => c.id === 'cat_uncategorized')) {
      const uncategorizedCat = DEFAULT_CATEGORIES.find(d => d.id === 'cat_uncategorized') || {
        id: 'cat_uncategorized',
        name: 'Uncategorized',
        icon: 'Tag',
        color: 'bg-slate-500/10 text-slate-300 border border-slate-500/20',
        textColor: 'text-slate-400',
        isDefault: true,
        limit: 0
      };
      parsed = [uncategorizedCat, ...parsed];
      modified = true;
    }

    // Auto-migrate to guarantee "Business Expense" exists (so users' existing installs get updated smoothly)
    if (Array.isArray(parsed) && !parsed.some(c => c.id === 'cat_business_expense')) {
      const businessCat = DEFAULT_CATEGORIES.find(d => d.id === 'cat_business_expense') || {
        id: 'cat_business_expense',
        name: 'Business Expense',
        icon: 'Briefcase',
        color: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
        textColor: 'text-indigo-400',
        isDefault: true,
        limit: 0
      };
      parsed = [...parsed, businessCat];
      modified = true;
    }
    
    const hasMigratedLimits = localStorage.getItem('expensetrack_legacy_limits_migrated') === 'true';

    const migrated = parsed.map(cat => {
      let updated = { ...cat };
      if (cat.limit === undefined || cat.limit === null) {
        modified = true;
        const matchingDefault = DEFAULT_CATEGORIES.find(d => d.id === cat.id);
        updated.limit = matchingDefault?.limit !== undefined ? matchingDefault.limit : 0;
      }

      if (!hasMigratedLimits) {
        // Auto-migrate legacy non-zero default category limits to 0 (based on ID or name)
        const legacyIdDefaults: Record<string, number> = {
          'cat_groceries': 300,
          'cat_restaurants': 200,
          'cat_bars': 150,
          'cat_coffee_shops': 100,
          'cat_smoking': 100,
          'cat_entertainment': 100,
          'cat_gas_auto': 150,
        };
        const legacyNameDefaults: Record<string, number> = {
          'groceries': 300,
          'restaurants': 200,
          'bar': 150,
          'bars': 150,
          'coffee shops': 100,
          'coffee & snacks': 100,
          'smoking': 100,
          'entertainment': 100,
          'gas auto': 150,
          'charity': 100,
        };

        const normName = updated.name ? updated.name.toLowerCase().trim() : '';
        const matchedLegacyDefault = legacyIdDefaults[updated.id] !== undefined
          ? legacyIdDefaults[updated.id]
          : legacyNameDefaults[normName];

        if (updated.limit !== undefined && matchedLegacyDefault !== undefined && updated.limit === matchedLegacyDefault) {
          updated.limit = 0;
          modified = true;
        }
      }

      // Auto-migrate legacy light theme default colors to premium translucent dark theme ones
      const legacyColorMap: Record<string, { color: string; textColor: string }> = {
        'bg-slate-100/15 text-slate-400 border border-slate-500/10': { color: 'bg-slate-500/10 text-slate-300 border border-slate-500/20', textColor: 'text-slate-400' },
        'bg-emerald-100 text-emerald-800': { color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', textColor: 'text-emerald-400' },
        'bg-amber-100 text-amber-900': { color: 'bg-amber-500/10 text-amber-400 border border-amber-500/20', textColor: 'text-amber-400' },
        'bg-rose-100 text-rose-800': { color: 'bg-rose-500/10 text-rose-400 border border-rose-500/20', textColor: 'text-rose-400' },
        'bg-purple-100 text-purple-800': { color: 'bg-purple-500/10 text-purple-400 border border-purple-500/20', textColor: 'text-purple-400' },
        'bg-indigo-100 text-indigo-800': { color: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20', textColor: 'text-indigo-400' },
      };

      if (legacyColorMap[cat.color]) {
        modified = true;
        updated.color = legacyColorMap[cat.color].color;
        updated.textColor = legacyColorMap[cat.color].textColor;
      }

      return updated;
    });

    if (!hasMigratedLimits) {
      localStorage.setItem('expensetrack_legacy_limits_migrated', 'true');
    }

    if (modified) {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(migrated));
    }
    return migrated;
  },

  getCategories(month?: string): Category[] {
    this.initialize();
    const raw = this.getCategoriesOnly();
    const activeMonth = month || getLocalMonthString();
    
    const mapped = raw.map(cat => {
      const limitVal = this.getLimitForCategoryForMonth(cat.id, activeMonth);
      return {
        ...cat,
        limit: limitVal
      };
    });

    const expenses = this.getExpenses();
    const monthExpenses = expenses.filter(e => e.date.substring(0, 7) === activeMonth);

    const filtered = mapped.filter(cat => {
      if (!cat.isHidden) return true;
      const hasExpenses = monthExpenses.some(e => e.category === cat.id);
      const hasLimit = (cat.limit || 0) > 0;
      return hasExpenses || hasLimit;
    });

    // Dynamically append savings goals categories!
    const savingsStored = localStorage.getItem('expensetrack_savings_goals');
    let savingsCats: Category[] = [];
    if (savingsStored) {
      try {
        const goals = JSON.parse(savingsStored);
        if (Array.isArray(goals)) {
          savingsCats = goals.map(goal => ({
            id: `SAVINGS_${goal.id}`,
            name: `SAVINGS - ${goal.label}`,
            icon: 'PiggyBank',
            color: 'bg-pink-500/20 text-pink-450 border border-pink-500/35',
            textColor: 'text-pink-450',
            isDefault: false,
            limit: 0
          }));
        }
      } catch (e) {}
    }

    // Also scan for any historical SAVINGS_ category used in expenses to prevent them from showing as uncategorized or blank
    expenses.forEach(exp => {
      if (exp.category.startsWith('SAVINGS_')) {
        const goalId = exp.category.substring(8);
        const alreadyExists = savingsCats.some(c => c.id === exp.category);
        if (!alreadyExists) {
          // Fallback for deleted goals
          let label = goalId;
          if (goalId === 'emergency_fund') label = 'Reserve';
          else if (goalId === 'vacation_fund') label = 'Vacation Goal';
          else if (goalId.startsWith('savings_')) {
            label = 'Deleted Goal';
          }
          savingsCats.push({
            id: exp.category,
            name: `SAVINGS - ${label}`,
            icon: 'PiggyBank',
            color: 'bg-pink-500/20 text-pink-450 border border-pink-500/35',
            textColor: 'text-pink-450',
            isDefault: false,
            limit: 0
          });
        }
      }
    });

    return [...filtered, ...savingsCats];
  },

  getAllCategoriesWithLimits(month: string): Category[] {
    this.initialize();
    const raw = this.getCategoriesOnly();
    return raw.map(cat => {
      const limitVal = this.getLimitForCategoryForMonth(cat.id, month);
      return {
        ...cat,
        limit: limitVal
      };
    });
  },

  getLimitForCategoryForMonth(categoryId: string, targetMonth: string): number {
    const budgets = this.getBudgets();
    const sorted = [...budgets].sort((a, b) => a.month.localeCompare(b.month));
    const records = sorted.filter(b => b.month <= targetMonth && b.categoryLimits?.[categoryId] !== undefined);
    
    if (records.length > 0) {
      const mostRecent = records[records.length - 1];
      return mostRecent.categoryLimits?.[categoryId] ?? 0;
    }
    
    const rawCats = this.getCategoriesOnly();
    const matching = rawCats.find(c => c.id === categoryId);
    return matching?.limit !== undefined ? matching.limit : 0;
  },

  saveCategories(categories: Category[]): void {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  },

  addCategory(category: Omit<Category, 'id'>, month?: string): Category {
    const categories = this.getCategoriesOnly();
    const newCategory: Category = {
      ...category,
      id: `cat_${Date.now()}`,
      limit: category.limit !== undefined ? category.limit : 0,
    };
    categories.push(newCategory);
    this.saveCategories(categories);
    
    if (month) {
      this.saveCategoryLimitForMonth(newCategory.id, newCategory.limit, month);
    }
    return newCategory;
  },

  updateCategory(updatedCategory: Category, month?: string): void {
    const categories = this.getCategoriesOnly();
    const index = categories.findIndex(c => c.id === updatedCategory.id);
    if (index !== -1) {
      categories[index] = {
        ...updatedCategory,
        limit: month ? (categories[index].limit ?? 0) : (updatedCategory.limit !== undefined ? updatedCategory.limit : 0)
      };
      this.saveCategories(categories);
    }
    
    if (month) {
      this.saveCategoryLimitForMonth(updatedCategory.id, updatedCategory.limit ?? 0, month);
    }
  },

  deleteCategory(id: string): void {
    if (id === 'cat_uncategorized') return; // Core constraint
    
    // Check if the category is used in past transactions or has budget history
    const expenses = this.getExpenses();
    const hasTransactions = expenses.some(e => e.category === id);
    
    const budgets = this.getBudgets();
    const hasBudgetHistory = budgets.some(b => b.categoryLimits?.[id] !== undefined && b.categoryLimits[id] > 0);

    const categories = this.getCategoriesOnly();
    
    if (hasTransactions || hasBudgetHistory) {
      // It has history! Do not delete it from db, just hide it!
      const index = categories.findIndex(c => c.id === id);
      if (index !== -1) {
        categories[index] = {
          ...categories[index],
          isHidden: true
        };
        this.saveCategories(categories);
      }
    } else {
      // No history, we can safely delete it completely
      const filtered = categories.filter(c => c.id !== id);
      this.saveCategories(filtered);
    }
  },

  // BUDGETS METHODS
  getBudgets(): MonthlyBudget[] {
    this.initialize();
    const data = localStorage.getItem(STORAGE_KEYS.BUDGET);
    if (!data) return [];
    try {
      const parsed: MonthlyBudget[] = JSON.parse(data);
      const hasMigratedLimits = localStorage.getItem('expensetrack_legacy_limits_migrated') === 'true';

      if (hasMigratedLimits) {
        return parsed;
      }
      
      const legacyIdDefaults: Record<string, number> = {
        'cat_groceries': 300,
        'cat_restaurants': 200,
        'cat_bars': 150,
        'cat_coffee_shops': 100,
        'cat_smoking': 100,
        'cat_entertainment': 100,
        'cat_gas_auto': 150,
      };
      const legacyNameDefaults: Record<string, number> = {
        'groceries': 300,
        'restaurants': 200,
        'bar': 150,
        'bars': 150,
        'coffee shops': 100,
        'coffee & snacks': 100,
        'smoking': 100,
        'entertainment': 100,
        'gas auto': 150,
        'charity': 100,
      };

      // Extract raw categories list to get names for lookup
      let rawCategories: any[] = [];
      try {
        const catData = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
        if (catData) rawCategories = JSON.parse(catData);
      } catch (err) {}
      
      const catIdToNameMap: Record<string, string> = {};
      rawCategories.forEach((c: any) => {
        if (c && c.id) {
          catIdToNameMap[c.id] = c.name || '';
        }
      });

      let modified = false;
      const migrated = parsed.map(budget => {
        if (budget.categoryLimits) {
          const updatedLimits = { ...budget.categoryLimits };
          let limitModified = false;
          
          Object.entries(updatedLimits).forEach(([catId, currentLimit]) => {
            const catName = catIdToNameMap[catId] || '';
            const normName = catName.toLowerCase().trim();
            
            const matchedLegacyDefault = legacyIdDefaults[catId] !== undefined
              ? legacyIdDefaults[catId]
              : legacyNameDefaults[normName];
              
            if (currentLimit !== undefined && matchedLegacyDefault !== undefined && currentLimit === matchedLegacyDefault) {
              updatedLimits[catId] = 0;
              limitModified = true;
            }
          });

          if (limitModified) {
            modified = true;
            // Recount budget total
            const rawCats = this.getCategoriesOnly();
            let totalSum = 0;
            rawCats.forEach(cat => {
              const catLimit = updatedLimits[cat.id] !== undefined ? updatedLimits[cat.id] : 0;
              totalSum += catLimit;
            });
            return {
              ...budget,
              categoryLimits: updatedLimits,
              limitAmount: totalSum
            };
          }
        }
        return budget;
      });
      if (modified) {
        localStorage.setItem(STORAGE_KEYS.BUDGET, JSON.stringify(migrated));
      }
      return migrated;
    } catch (e) {
      try {
        return JSON.parse(data);
      } catch (err) {
        return [];
      }
    }
  },

  getBudgetForMonth(month: string): MonthlyBudget {
    const budgets = this.getBudgets();
    const budget = budgets.find(b => b.month === month);
    if (budget) {
      // Ensure it has category limits populated for existing categories as fallback
      const rawCats = this.getCategoriesOnly();
      const categoryLimits = { ...(budget.categoryLimits || {}) };
      let updated = false;
      rawCats.forEach(cat => {
        if (categoryLimits[cat.id] === undefined) {
          categoryLimits[cat.id] = this.getLimitForCategoryForMonth(cat.id, month);
          updated = true;
        }
      });
      if (updated) {
        budget.categoryLimits = categoryLimits;
      }
      return budget;
    }

    // Search chronologically for most recent budget <= month for carry-forward defaults
    const sorted = [...budgets].sort((a, b) => a.month.localeCompare(b.month));
    const pastBudgets = sorted.filter(b => b.month <= month);
    if (pastBudgets.length > 0) {
      const mostRecent = pastBudgets[pastBudgets.length - 1];
      const carryLimits = { ...(mostRecent.categoryLimits || {}) };
      // populate remaining active categories
      const rawCats = this.getCategoriesOnly();
      rawCats.forEach(cat => {
        if (carryLimits[cat.id] === undefined) {
          carryLimits[cat.id] = this.getLimitForCategoryForMonth(cat.id, month);
        }
      });
      return {
        month,
        limitAmount: mostRecent.limitAmount,
        categoryLimits: carryLimits,
      };
    }

    // Default fallback
    const rawCats = this.getCategoriesOnly();
    const defaultLimits: Record<string, number> = {};
    let defaultTotal = 0;
    rawCats.forEach(cat => {
      defaultLimits[cat.id] = cat.limit || 0;
      defaultTotal += cat.limit || 0;
    });

    return {
      month,
      limitAmount: defaultTotal > 0 ? defaultTotal : INITIAL_BUDGET,
      categoryLimits: defaultLimits,
    };
  },

  setBudget(month: string, limitAmount: number, categoryLimits: Record<string, number> = {}): void {
    const budgets = this.getBudgets();
    const index = budgets.findIndex(b => b.month === month);
    
    const newBudget: MonthlyBudget = {
      month,
      limitAmount,
      categoryLimits,
    };

    if (index !== -1) {
      budgets[index] = newBudget;
    } else {
      budgets.push(newBudget);
    }
    localStorage.setItem(STORAGE_KEYS.BUDGET, JSON.stringify(budgets));
  },

  saveCategoryLimitForMonth(categoryId: string, limit: number, month: string): void {
    const budgets = this.getBudgets();
    let index = budgets.findIndex(b => b.month === month);
    
    if (index === -1) {
      const parentBudget = this.getBudgetForMonth(month);
      const newBudget: MonthlyBudget = {
        month,
        limitAmount: parentBudget.limitAmount,
        categoryLimits: {
          ...(parentBudget.categoryLimits || {}),
          [categoryId]: limit
        }
      };
      budgets.push(newBudget);
    } else {
      budgets[index].categoryLimits = {
        ...(budgets[index].categoryLimits || {}),
        [categoryId]: limit
      };
    }
    
    // Recount total budget limit from category limits sum for this month
    const activeBudIndex = budgets.findIndex(b => b.month === month);
    if (activeBudIndex !== -1) {
      const activeLimits = budgets[activeBudIndex].categoryLimits || {};
      const rawCats = this.getCategoriesOnly();
      let totalSum = 0;
      rawCats.forEach(cat => {
        const catLimit = activeLimits[cat.id] !== undefined 
          ? activeLimits[cat.id] 
          : this.getLimitForCategoryForMonth(cat.id, month);
        totalSum += catLimit;
      });
      budgets[activeBudIndex].limitAmount = totalSum;
    }
    
    localStorage.setItem(STORAGE_KEYS.BUDGET, JSON.stringify(budgets));
  },

  // EXPORT / IMPORT (Backup functions)
  exportDatabase(): string {
    const data = {
      expenses: this.getExpenses(),
      categories: this.getCategories(),
      budgets: this.getBudgets(),
      incomeStreams: JSON.parse(localStorage.getItem('expensetrack_income_streams') || '[]'),
      fixedExpenses: JSON.parse(localStorage.getItem('expensetrack_fixed_expenses') || '[]'),
      savingsGoals: JSON.parse(localStorage.getItem('expensetrack_savings_goals') || '[]'),
      version: '1.0.1',
      exportedAt: Date.now(),
    };
    return JSON.stringify(data, null, 2);
  },

  importDatabase(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.expenses) && Array.isArray(data.categories)) {
        localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(data.expenses));
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(data.categories));
        if (Array.isArray(data.budgets)) {
          localStorage.setItem(STORAGE_KEYS.BUDGET, JSON.stringify(data.budgets));
        }
        if (Array.isArray(data.incomeStreams)) {
          localStorage.setItem('expensetrack_income_streams', JSON.stringify(data.incomeStreams));
        }
        if (Array.isArray(data.fixedExpenses)) {
          localStorage.setItem('expensetrack_fixed_expenses', JSON.stringify(data.fixedExpenses));
        } else if (Array.isArray(data.knownExpenses)) {
          // Backward compatibility for knownExpenses naming in future versions
          localStorage.setItem('expensetrack_fixed_expenses', JSON.stringify(data.knownExpenses));
        }
        if (Array.isArray(data.savingsGoals)) {
          localStorage.setItem('expensetrack_savings_goals', JSON.stringify(data.savingsGoals));
        }
        localStorage.setItem('expensetrack_fixed_defaults_cleaned', 'true');
        localStorage.setItem(STORAGE_KEYS.HAS_INITIALIZED, 'true');
        return true;
      }
    } catch (e) {
      console.error("Database import failed", e);
    }
    return false;
  },

  getDefaultCategoryId(): string {
    this.initialize();
    const id = localStorage.getItem(STORAGE_KEYS.DEFAULT_CATEGORY);
    if (id) return id;
    
    const categories = this.getCategories();
    return categories[0]?.id || 'cat_uncategorized';
  },

  setDefaultCategoryId(id: string): void {
    localStorage.setItem(STORAGE_KEYS.DEFAULT_CATEGORY, id);
  },

  getCurrencySymbol(): string {
    return localStorage.getItem(STORAGE_KEYS.CURRENCY_SYMBOL) || '$';
  },

  setCurrencySymbol(symbol: string): void {
    localStorage.setItem(STORAGE_KEYS.CURRENCY_SYMBOL, symbol);
  }
};
