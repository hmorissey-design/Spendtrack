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

export type ActiveTab = 'dashboard' | 'history' | 'analytics' | 'budget_plan' | 'help';
