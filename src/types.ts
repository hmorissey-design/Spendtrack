/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Expense {
  id: string;
  amount: number;
  category: string; // ID of the category
  date: string; // YYYY-MM-DD
  note: string;
  paymentMethod: 'cash' | 'card' | 'digital_wallet' | 'other';
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  color: string; // Tailwind color class or hex
  textColor: string; // Text color class
  isDefault?: boolean;
  limit?: number; // Target budget amount for this category in dollars
}

export interface MonthlyBudget {
  month: string; // YYYY-MM
  limitAmount: number;
  categoryLimits?: Record<string, number>; // Optional category-specific limits
}

export type ActiveTab = 'dashboard' | 'history' | 'analytics' | 'budget_plan' | 'help' | 'dev_hub';

export interface AccentTheme {
  id: string;
  name: string;
  colors: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    950: string;
  };
}

