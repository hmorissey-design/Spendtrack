/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Expense, Category, MonthlyBudget } from '../types';

const STORAGE_KEYS = {
  EXPENSES: 'personal_finance_app_expenses',
  CATEGORIES: 'personal_finance_app_categories',
  BUDGET: 'personal_finance_app_budget',
  HAS_INITIALIZED: 'personal_finance_app_has_init',
  DEFAULT_CATEGORY: 'personal_finance_app_default_category_id',
  CURRENCY_SYMBOL: 'personal_finance_app_currency_symbol',
};

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat_uncategorized', name: 'Uncategorized', icon: 'Tag', color: 'bg-slate-100/15 text-slate-400 border border-slate-500/10', textColor: 'text-slate-400', isDefault: true, limit: 0 },
  { id: 'cat_groceries', name: 'Groceries', icon: 'ShoppingBag', color: 'bg-emerald-100 text-emerald-800', textColor: 'text-emerald-600', isDefault: true, limit: 0 },
  { id: 'cat_bars', name: 'Bars', icon: 'Beer', color: 'bg-amber-100 text-amber-900', textColor: 'text-amber-700', isDefault: true, limit: 0 },
  { id: 'cat_restaurants', name: 'Restaurants', icon: 'Utensils', color: 'bg-rose-100 text-rose-800', textColor: 'text-rose-600', isDefault: true, limit: 0 },
  { id: 'cat_entertainment', name: 'Entertainment', icon: 'Film', color: 'bg-purple-100 text-purple-800', textColor: 'text-purple-600', isDefault: true, limit: 0 },
  { id: 'cat_business_expense', name: 'Business Expense', icon: 'Briefcase', color: 'bg-indigo-100 text-indigo-800', textColor: 'text-indigo-600', isDefault: true, limit: 0 },
];

export const INITIAL_BUDGET = 1000; // $1,000 starting layout (user customizable)

export const LocalDb = {
  /**
   * Initializes the local private database.
   * If first install, configures an empty schema structure with defaults.
   */
  initialize(): void {
    const isInit = localStorage.getItem(STORAGE_KEYS.HAS_INITIALIZED);
    if (!isInit) {
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
      
      const currentMonth = new Date().toISOString().substring(0, 7); // "YYYY-MM"
      const budget: MonthlyBudget = {
        month: currentMonth,
        limitAmount: INITIAL_BUDGET,
        categoryLimits: {},
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
        color: 'bg-slate-100/15 text-slate-400 border border-slate-500/10',
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
        color: 'bg-indigo-100 text-indigo-800',
        textColor: 'text-indigo-600',
        isDefault: true,
        limit: 0
      };
      parsed = [...parsed, businessCat];
      modified = true;
    }
    
    const migrated = parsed.map(cat => {
      if (cat.limit === undefined || cat.limit === null) {
        modified = true;
        const matchingDefault = DEFAULT_CATEGORIES.find(d => d.id === cat.id);
        return {
          ...cat,
          limit: matchingDefault?.limit !== undefined ? matchingDefault.limit : 0
        };
      }
      return cat;
    });
    if (modified) {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(migrated));
    }
    return migrated;
  },

  getCategories(month?: string): Category[] {
    this.initialize();
    const raw = this.getCategoriesOnly();
    const activeMonth = month || new Date().toISOString().substring(0, 7);
    
    return raw.map(cat => {
      const limitVal = this.getLimitForCategoryForMonth(cat.id, activeMonth);
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
    const categories = this.getCategoriesOnly();
    const filtered = categories.filter(c => c.id !== id);
    this.saveCategories(filtered);

    // Re-route deleted category expenses to 'cat_uncategorized'
    const expenses = this.getExpenses();
    let updated = false;
    const migratedExpenses = expenses.map(e => {
      if (e.category === id) {
        updated = true;
        return { ...e, category: 'cat_uncategorized' };
      }
      return e;
    });
    if (updated) {
      this.saveExpenses(migratedExpenses);
    }
  },

  // BUDGETS METHODS
  getBudgets(): MonthlyBudget[] {
    this.initialize();
    const data = localStorage.getItem(STORAGE_KEYS.BUDGET);
    return data ? JSON.parse(data) : [];
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
      version: '1.0.0',
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
