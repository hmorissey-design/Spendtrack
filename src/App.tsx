/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, 
  History, 
  PieChart, 
  Sliders, 
  Code, 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  TrendingUp, 
  DollarSign, 
  Sparkles, 
  AlertCircle, 
  CheckCircle, 
  ShieldCheck, 
  Wallet,
  Calendar,
  X,
  CreditCard,
  Building,
  Briefcase,
  Pencil,
  FileSpreadsheet,
  FileText,
  Download,
  HelpCircle
} from 'lucide-react';
import { jsPDF } from 'jspdf';

import { ActiveTab, Expense, Category, MonthlyBudget } from './types';
import { LocalDb, DEFAULT_CATEGORIES } from './utils/db';
import { AndroidFrame } from './components/AndroidFrame';
import { AdMobBanner } from './components/AdMobBanner';
import { ExpenseForm } from './components/ExpenseForm';
import { QuickAddWidget } from './components/QuickAddWidget';
import { BudgetSettings, renderCategoryIcon } from './components/BudgetSettings';
import { VoiceAssistant } from './components/VoiceAssistant';
import appLogo from './assets/images/expensetrack_logo_1781299964788.jpg';

// Recharts components imports
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  PieChart as RePieChart,
  Pie,
  Cell
} from 'recharts';

export default function App() {
  // Check if opened before
  const isFirstLaunch = useMemo(() => {
    try {
      return !localStorage.getItem('expensetrack_first_open');
    } catch (e) {
      return false;
    }
  }, []);

  // Detect session state to distinguish launching fresh (closed state) vs accidental page refresh
  const isSessionActive = useMemo(() => {
    try {
      const active = sessionStorage.getItem('expensetrack_session_active');
      if (!active) {
        sessionStorage.setItem('expensetrack_session_active', 'true');
        return false; // This is a fresh app boot from a closed state
      }
      return true; // The app was already open and is being refreshed
    } catch (e) {
      return false;
    }
  }, []);

  // Initialize states
  const [activeTab, setActiveTab ] = useState<ActiveTab>('dashboard');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return new Date().toISOString().substring(0, 7); // e.g. "YYYY-MM"
  });
  const [currentBudget, setCurrentBudget] = useState<MonthlyBudget>({ month: '', limitAmount: 1000 });
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [defaultCategoryId, setDefaultCategoryIdState] = useState<string>('');
  const [currencySymbol, setCurrencySymbol] = useState<string>(() => {
    return LocalDb.getCurrencySymbol();
  });

  const [logoClicks, setLogoClicks] = useState<number>(0);
  const [isDevMode, setIsDevMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('expensetrack_developer_mode') === 'true';
    } catch (e) {
      return false;
    }
  });

  const [devModeNotification, setDevModeNotification] = useState<string | null>(null);

  const handleLogoClick = () => {
    setLogoClicks(prev => {
      const next = prev + 1;
      if (next >= 5) {
        const nextDevMode = !isDevMode;
        try {
          localStorage.setItem('expensetrack_developer_mode', nextDevMode ? 'true' : 'false');
        } catch (e) {}
        setIsDevMode(nextDevMode);
        setDevModeNotification(nextDevMode ? "🛠️ Developer settings unlocked!" : "🔒 Developer settings locked.");
        setTimeout(() => setDevModeNotification(null), 3000);
        return 0; // reset
      }
      return next;
    });
  };

  const [enableVoiceAssistant, setEnableVoiceAssistant] = useState<boolean>(() => {
    try {
      return localStorage.getItem('expensetrack_enable_voice_assistant') === 'true';
    } catch (e) {
      return false;
    }
  });

  const handleToggleVoiceAssistant = (enabled: boolean) => {
    try {
      localStorage.setItem('expensetrack_enable_voice_assistant', enabled ? 'true' : 'false');
    } catch (e) {}
    setEnableVoiceAssistant(enabled);
  };

  const handleCurrencyChange = (newSymbol: string) => {
    LocalDb.setCurrencySymbol(newSymbol);
    setCurrencySymbol(newSymbol);
  };

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Start/End date dropdown calendar states
  const [showStartDateCalendar, setShowStartDateCalendar] = useState<boolean>(false);
  const [startCalendarYear, setStartCalendarYear] = useState<number>(() => new Date().getFullYear());
  const [startCalendarMonth, setStartCalendarMonth] = useState<number>(() => new Date().getMonth());

  const [showEndDateCalendar, setShowEndDateCalendar] = useState<boolean>(false);
  const [endCalendarYear, setEndCalendarYear] = useState<number>(() => new Date().getFullYear());
  const [endCalendarMonth, setEndCalendarMonth] = useState<number>(() => new Date().getMonth());

  const startDateCalendarRef = useRef<HTMLDivElement | null>(null);
  const endDateCalendarRef = useRef<HTMLDivElement | null>(null);

  // Click Outside to close custom start calendar drop down
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (startDateCalendarRef.current && !startDateCalendarRef.current.contains(event.target as Node)) {
        setShowStartDateCalendar(false);
      }
    }
    if (showStartDateCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showStartDateCalendar]);

  // Click Outside to close custom end calendar drop down
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (endDateCalendarRef.current && !endDateCalendarRef.current.contains(event.target as Node)) {
        setShowEndDateCalendar(false);
      }
    }
    if (showEndDateCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showEndDateCalendar]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-');
    let y = parseInt(year);
    let m = parseInt(month) - 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
    const newMonth = `${y}-${m.toString().padStart(2, '0')}`;
    setSelectedMonth(newMonth);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-');
    let y = parseInt(year);
    let m = parseInt(month) + 1;
    if (m === 13) {
      m = 1;
      y += 1;
    }
    const newMonth = `${y}-${m.toString().padStart(2, '0')}`;
    setSelectedMonth(newMonth);
  };

  // Trigger state refresh from Local Database
  const loadDatabaseState = (monthStr?: string) => {
    LocalDb.initialize();
    const activeMonth = monthStr || selectedMonth;
    
    setExpenses(LocalDb.getExpenses());
    setCategories(LocalDb.getCategories(activeMonth));
    setCurrentBudget(LocalDb.getBudgetForMonth(activeMonth));
    setDefaultCategoryIdState(LocalDb.getDefaultCategoryId());
    setCurrencySymbol(LocalDb.getCurrencySymbol());
  };

  // Run on initial mount and when month changes
  useEffect(() => {
    loadDatabaseState(selectedMonth);
    try {
      if (!localStorage.getItem('expensetrack_first_open')) {
        localStorage.setItem('expensetrack_first_open', 'true');
      }
    } catch (e) {
      console.warn('LocalStorage not available:', e);
    }
  }, [selectedMonth]);

  // Action Handlers
  const handleDefaultCategoryChange = (id: string) => {
    LocalDb.setDefaultCategoryId(id);
    setDefaultCategoryIdState(id);
  };
  const handleAddExpense = (newExpenseData: Omit<Expense, 'id' | 'createdAt'>) => {
    LocalDb.addExpense(newExpenseData);
    const dateMonth = newExpenseData.date.substring(0, 7); // Get "YYYY-MM"
    if (dateMonth !== selectedMonth) {
      setSelectedMonth(dateMonth);
    } else {
      loadDatabaseState(selectedMonth);
    }
    setShowAddForm(false);
  };

  const handleSaveEditedExpense = (updatedData: Omit<Expense, 'id' | 'createdAt'>) => {
    if (editingExpense) {
      const fullUpdatedExpense: Expense = {
        ...editingExpense,
        ...updatedData
      };
      LocalDb.updateExpense(fullUpdatedExpense);
      const dateMonth = updatedData.date.substring(0, 7); // Get "YYYY-MM"
      if (dateMonth !== selectedMonth) {
        setSelectedMonth(dateMonth);
      } else {
        loadDatabaseState(selectedMonth);
      }
      setEditingExpense(null);
    }
  };

  const handleDeleteExpense = (id: string) => {
    LocalDb.deleteExpense(id);
    loadDatabaseState(selectedMonth);
  };

  const handleExportToCSV = () => {
    if (filteredExpenses.length === 0) {
      alert("No expenses matching current filters to export.");
      return;
    }

    const headers = ["Date", "Note", "Category", "Payment Method", "Amount (USD)"];
    const rows = filteredExpenses.map(exp => {
      const cat = categories.find(c => c.id === exp.category);
      const categoryName = cat ? cat.name : "Uncategorized";
      const paymentMethod = exp.paymentMethod === 'card' ? 'Card' : exp.paymentMethod === 'digital_wallet' ? 'Wallet' : exp.paymentMethod === 'cash' ? 'Cash' : 'Other';
      return [
        exp.date,
        exp.note,
        categoryName,
        paymentMethod,
        exp.amount
      ];
    });

    const csvContent = [headers, ...rows]
      .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const dateStr = new Date().toISOString().substring(0, 10);
    link.setAttribute("download", `expensetrack_expenses_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportToPDF = () => {
    if (filteredExpenses.length === 0) {
      alert("No expenses matching current filters to export.");
      return;
    }

    const doc = new jsPDF();

    // 1. Header Letterhead Style Custom Branding
    doc.setFillColor(15, 118, 110); // #0F766E
    doc.roundedRect(14, 14, 8, 8, 1, 1, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("E", 16.5, 19.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 118, 110);
    doc.text("EXPENSE TRACK STATEMENT", 25, 19);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("Business Expense Ledger", 14, 31);

    // Audit-Ready Pill Status Header
    doc.setFillColor(209, 250, 229); // emerald-100
    doc.setDrawColor(167, 243, 208); // emerald-200
    doc.roundedRect(153, 14, 43, 7, 1, 1, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(6, 95, 70); // emerald-800
    doc.text("AUDIT-READY STANDARD", 156, 18.5);

    // Underline divider
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.5);
    doc.line(14, 36, 196, 36);

    // 2. Info Grid Meta Blocks (Left Aligned Statement Period)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text("STATEMENT PERIOD", 14, 43);

    const [yearPart, monthPart] = selectedMonth.split('-');
    const mDate = new Date(parseInt(yearPart), parseInt(monthPart) - 1, 1);
    const mName = mDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    let periodText = mName;
    if (filterStartDate || filterEndDate) {
      const formatStringDate = (dateStr: string) => {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const d = parseInt(parts[2], 10);
          return new Date(y, m, d).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
        }
        return dateStr;
      };

      if (filterStartDate && filterEndDate) {
        periodText = `${formatStringDate(filterStartDate)} - ${formatStringDate(filterEndDate)}`;
      } else if (filterStartDate) {
        periodText = `From ${formatStringDate(filterStartDate)}`;
      } else if (filterEndDate) {
        periodText = `Through ${formatStringDate(filterEndDate)}`;
      }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text(periodText, 14, 48);

    const todayStr = new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Date Mapped: ${todayStr}`, 14, 52);

    // 3. Stats Block KPIs - shifting card Y up because the info grid only takes 52 max (saving 8px)
    const totalSpent = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Card 1: Total Ledger
    doc.setFillColor(241, 245, 249); // slate-100
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(14, 58, 56, 14, 1, 1, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("TOTAL LEDGER", 17, 63);

    doc.setFont("courier", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(`${currencySymbol}${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 17, 69);

    // Card 2: Transactions count
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(74, 58, 56, 14, 1, 1, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("TRANSACTIONS COUNT", 77, 63);

    doc.setFont("courier", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${filteredExpenses.length} Items`, 77, 69);

    // Card 3: Deductible Rate Tag
    doc.setFillColor(240, 253, 250); // teal-50
    doc.setDrawColor(204, 251, 241); // teal-100
    doc.roundedRect(134, 58, 62, 14, 1, 1, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(13, 148, 136); // teal-600
    doc.text("DEDUCTIBLE RATE", 137, 63);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 118, 110); // teal-800
    doc.text("100% Taxable", 137, 69);

    let y = 84;

    // Header values
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, y - 5, 182, 8, 1, 1, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);

    doc.text("Date", 16, y);
    doc.text("Merchant Name / details", 38, y);
    doc.text("Category", 110, y);
    doc.text("Method", 152, y);
    doc.text("Amount", 172, y);

    doc.setDrawColor(203, 213, 225);
    doc.line(14, y + 4, 196, y + 4);

    y += 10;

    // Table rows
    const sorted = [...filteredExpenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    sorted.forEach((exp, idx) => {
      if (y > 265) {
        doc.addPage();
        y = 25;

        doc.setFillColor(241, 245, 249);
        doc.roundedRect(14, y - 5, 182, 8, 1, 1, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);

        doc.text("Date", 16, y);
        doc.text("Merchant Name / details", 38, y);
        doc.text("Category", 110, y);
        doc.text("Method", 152, y);
        doc.text("Amount", 172, y);

        doc.setDrawColor(203, 213, 225);
        doc.line(14, y + 4, 196, y + 4);

        y += 10;
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 4, 182, 6.5, "F");
      }

      const cat = categories.find(c => c.id === exp.category);
      const catName = cat ? cat.name : "Uncategorized";
      const payment = exp.paymentMethod === 'card' ? 'CARD' : exp.paymentMethod === 'digital_wallet' ? 'WALLET' : exp.paymentMethod === 'cash' ? 'CASH' : 'OTHER';

      let displayNote = exp.note;
      if (displayNote.length > 38) {
        displayNote = displayNote.substring(0, 35) + "...";
      }

      doc.setFont("courier", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(exp.date, 16, y);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(displayNote, 38, y);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(catName.toUpperCase(), 110, y);

      doc.setFont("helvetica", "medium");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(payment, 152, y);

      const amtVal = `${currencySymbol}${exp.amount.toFixed(2)}`;
      doc.setFont("courier", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(amtVal, 172, y);

      // Slate divider line
      doc.setDrawColor(241, 245, 249);
      doc.line(14, y + 3, 196, y + 3);

      y += 7.5;
    });

    // 4. Audit Footer Box & Check Signature
    if (y > 245) {
      doc.addPage();
      y = 25;
    }

    y += 3;
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(241, 245, 249); // slate-100
    doc.roundedRect(14, y, 182, 16, 1, 1, "FD");

    // Right side Verified check
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text("ACCOUNTING CHECK", 145, y + 4);

    doc.setFont("times", "italic");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("Ledger Verified", 145, y + 9);

    doc.setDrawColor(203, 213, 225);
    doc.line(145, y + 11, 185, y + 11);

    doc.setFont("courier", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text("SYSTEM SIGNED", 145, y + 14);

    const fileDate = new Date().toISOString().substring(0, 10);
    doc.save(`expensetrack_report_${fileDate}.pdf`);
  };

  const handleUpdateBudget = (limit: number, limits: Record<string, number>) => {
    LocalDb.setBudget(selectedMonth, limit, limits);
    loadDatabaseState(selectedMonth);
  };

  const handleResetDatabase = () => {
    LocalDb.resetToFreshInstall();
    loadDatabaseState(selectedMonth);
  };

  const handleAddCategory = (catData: Omit<Category, 'id'>, isDefault?: boolean) => {
    const created = LocalDb.addCategory(catData, selectedMonth);
    if (isDefault) {
      LocalDb.setDefaultCategoryId(created.id);
    }
    loadDatabaseState(selectedMonth);
  };

  const handleUpdateCategory = (cat: Category, isDefault?: boolean) => {
    LocalDb.updateCategory(cat, selectedMonth);
    if (isDefault) {
      LocalDb.setDefaultCategoryId(cat.id);
    }
    loadDatabaseState(selectedMonth);
  };

  const handleDeleteCategory = (id: string) => {
    LocalDb.deleteCategory(id);
    loadDatabaseState(selectedMonth);
  };

  // Helper values checking budget progress
  const totals = useMemo(() => {
    const currentMonthPrefix = selectedMonth; // use selectedMonth prefix
    
    // Filter expenses in the current month to show true budgeting outcomes, excluding Business Expense completely from any computations
    const currentMonthExpenses = expenses.filter(e => e.date.startsWith(currentMonthPrefix) && e.category !== 'cat_business_expense');
    const totalSpent = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
    
    // The Total Budget limit should be the total of individual category budgets (excluding business expenses)
    const limit = categories.filter(c => c.id !== 'cat_business_expense').reduce((sum, c) => sum + (c.limit || 0), 0);
    
    const percent = limit > 0 ? Math.round((totalSpent / limit) * 100) : 0;
    const remaining = limit - totalSpent;
 
    // Parse month name elegantly
    const [yearPart, monthPart] = selectedMonth.split('-');
    const parsedDate = new Date(parseInt(yearPart), parseInt(monthPart) - 1, 15);
    const monthName = parsedDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
 
    return {
      totalSpent,
      percent,
      remaining,
      limit,
      currentMonthExpenses,
      monthName
    };
  }, [expenses, categories, selectedMonth]);
 
  // Derived category statistics for insights
  const categoryStats = useMemo(() => {
    const stats: Record<string, { total: number; count: number; color: string; label: string; limit: number }> = {};
    
    // Initialize stats and exclude Business Expense from budget stats report
    categories.filter(c => c.id !== 'cat_business_expense').forEach(c => {
      stats[c.id] = { total: 0, count: 0, color: c.color, label: c.name, limit: c.limit || 0 };
    });

    // Populate stats
    totals.currentMonthExpenses.forEach(e => {
      if (!stats[e.category]) {
        // Fallback for custom or deleted categories
        stats[e.category] = { total: 0, count: 0, color: 'bg-gray-100 text-gray-800', label: 'Uncategorized', limit: 0 };
      }
      stats[e.category].total += e.amount;
      stats[e.category].count += 1;
    });

    return Object.entries(stats)
      .map(([id, s]) => ({ id, ...s }))
      .filter(s => s.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [categories, totals.currentMonthExpenses]);

  // Recharts Chart Data Calculations
  const trendChartData = useMemo(() => {
    const [yearPart, monthPart] = selectedMonth.split('-');
    const currentYear = parseInt(yearPart);
    const currentMonth = parseInt(monthPart); // 1-indexed

    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

    // Create daily slots container
    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const dateString = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
      return {
        day: dayNum,
        dateString,
        dailySpend: 0,
        cumulativeSpend: 0
      };
    });

    // Bucket expenses into dailySpend
    totals.currentMonthExpenses.forEach(e => {
      const dayPart = parseInt(e.date.split('-')[2]);
      if (dayPart >= 1 && dayPart <= daysInMonth) {
        days[dayPart - 1].dailySpend += e.amount;
      }
    });

    // Accumulate sum over days
    let cumulative = 0;
    const finalData = days.map(d => {
      cumulative += d.dailySpend;
      return {
        ...d,
        cumulativeSpend: Math.round(cumulative * 100) / 100,
        dailySpend: Math.round(d.dailySpend * 100) / 100
      };
    });

    // Filter out future days ONLY if the selectedMonth is the current live actual month
    const todayStr = new Date().toISOString().substring(0, 7);
    if (selectedMonth === todayStr) {
      const todayDay = new Date().getDate();
      return finalData.filter(d => d.day <= todayDay);
    }
    return finalData;
  }, [totals.currentMonthExpenses, selectedMonth]);

  // Recharts custom label for category breakdowns
  const categoryPieData = useMemo(() => {
    return categoryStats.map(s => ({
      id: s.id,
      name: s.label,
      value: Math.round(s.total * 100) / 100,
      color: s.color.includes('rose') ? '#f43f5e' :
             s.color.includes('emerald') ? '#10b981' :
             s.color.includes('blue') ? '#3b82f6' :
             s.color.includes('amber') ? '#f59e0b' :
             s.color.includes('purple') ? '#8b5cf6' :
             s.color.includes('slate') ? '#64748b' : '#a855f7'
    }));
  }, [categoryStats]);

  // Search and filtered expenses for list rendering
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const matchesSearch = searchQuery === '' || 
        (e.note && e.note.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (categories.find(c => c.id === e.category)?.name.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = filterCategory === 'all' || e.category === filterCategory;
      const matchesPayment = filterPayment === 'all' || e.paymentMethod === filterPayment;

      const hasCustomDateRange = !!(filterStartDate || filterEndDate);
      const matchesMonth = hasCustomDateRange || e.date.substring(0, 7) === selectedMonth;

      const matchesStartDate = !filterStartDate || e.date >= filterStartDate;
      const matchesEndDate = !filterEndDate || e.date <= filterEndDate;

      return matchesSearch && matchesCategory && matchesPayment && matchesMonth && matchesStartDate && matchesEndDate;
    });
  }, [expenses, searchQuery, filterCategory, filterPayment, filterStartDate, filterEndDate, selectedMonth, categories]);

  // Dynamic status details
  const statusConfig = useMemo(() => {
    // Determine the percentage of the month that has passed
    let percentOfMonthPassed = 100;
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth() + 1; // 1-indexed

    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);

    if (year > todayYear || (year === todayYear && month > todayMonth)) {
      percentOfMonthPassed = 0;
    } else if (year === todayYear && month === todayMonth) {
      const currentDay = today.getDate();
      const totalDays = new Date(year, month, 0).getDate();
      percentOfMonthPassed = (currentDay / totalDays) * 100;
    } else {
      percentOfMonthPassed = 100;
    }

    const isSpendingTooFast = totals.percent >= (percentOfMonthPassed + 10);

    if (totals.percent >= 100) {
      return {
        title: "Over Budget Limit!",
        desc: "Discretionary expenses have exceeded set goals. Limit your expenditures immediately.",
        color: "text-rose-400 border-rose-500/20 bg-rose-500/5",
        pillColor: "bg-rose-500 text-white",
        ringColor: "border-rose-500"
      };
    } else if (totals.percent >= 80) {
      return {
        title: "Approaching Limit",
        desc: "You have used more than 80% of discretionary limits. Control optional purchases.",
        color: "text-amber-400 border-amber-500/20 bg-amber-500/5",
        pillColor: "bg-amber-500 text-white",
        ringColor: "border-amber-500"
      };
    } else if (isSpendingTooFast) {
      return {
        title: "Warning: Spending Too Fast",
        desc: `Your spending (${totals.percent}%) is pacing significantly ahead of the month (${Math.round(percentOfMonthPassed)}% passed). Slow down to stay on track.`,
        color: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
        pillColor: "bg-yellow-500 text-black font-bold",
        ringColor: "border-yellow-500"
      };
    } else {
      return {
        title: "Looking Good",
        desc: "Total spending is within your target",
        color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
        pillColor: "bg-emerald-500 text-white",
        ringColor: "border-emerald-500"
      };
    }
  }, [totals.percent, selectedMonth]);

  return (
    <AndroidFrame 
      currentTime="01:15" 
      onRefreshDatabase={handleResetDatabase}
    >
      <div className="flex-1 flex flex-col h-full overflow-hidden select-none" id="android_app_root">
        {/* App Title & Top Header */}
        <div className="bg-[#0A0A0A] text-white pt-5 pb-4 px-4 flex items-center justify-between shrink-0 border-b border-white/5 relative">
          <div className="flex items-center gap-2.5 cursor-pointer select-none active:opacity-85" onClick={handleLogoClick}>
            <div className="w-8 h-8 rounded-xl overflow-hidden border border-emerald-500/20 flex items-center justify-center bg-black shrink-0 relative shadow-md shadow-emerald-950/20">
              <img 
                src={appLogo} 
                alt="ExpenseTrack Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight uppercase tracking-widest text-[#eeeeee]">Expense<span className="text-emerald-400">Track</span></h1>
            </div>
          </div>

          {/* Toast developer mode notifications */}
          {devModeNotification && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-black/90 border border-emerald-500/30 text-emerald-400 rounded-full text-[10px] font-mono font-bold z-40 shadow-xl tracking-wider animate-in fade-in slide-in-from-top-1 duration-200">
              {devModeNotification}
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-gray-300">
              {currencySymbol} {totals.remaining >= 0 ? `${totals.remaining.toFixed(0)} Left` : `${Math.abs(totals.remaining).toFixed(0)} Over`}
            </span>
          </div>
        </div>

        {/* Dynamic AdMob Slot on top of content to represent standard ad-supported Play Store app layouts */}
        <div className="bg-black/20 p-2.5 shrink-0">
          <AdMobBanner />
        </div>

        {/* Primary Screen Scrollable Frame */}
        <div className="flex-1 overflow-y-auto px-4 py-3 bg-[#0A0A0A] space-y-3">
          
          {/* Quick-add floating trigger sheet */}
          {showAddForm && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end md:items-center justify-center z-50 p-0 md:p-4 overflow-y-auto transition-all">
              <div className="w-full max-w-sm my-auto animate-in slide-in-from-bottom duration-250">
                <ExpenseForm 
                  categories={categories} 
                  onSubmit={handleAddExpense} 
                  onClose={() => setShowAddForm(false)} 
                  defaultCategoryId={defaultCategoryId}
                />
              </div>
            </div>
          )}

          {/* Edit-mode floating trigger sheet */}
          {editingExpense && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end md:items-center justify-center z-50 p-0 md:p-4 overflow-y-auto transition-all">
              <div className="w-full max-w-sm my-auto animate-in slide-in-from-bottom duration-250">
                <ExpenseForm 
                  categories={categories} 
                  onSubmit={handleSaveEditedExpense} 
                  onClose={() => setEditingExpense(null)} 
                  defaultCategoryId={defaultCategoryId}
                  expenseToEdit={editingExpense}
                />
              </div>
            </div>
          )}

          {/* Universal Month Switcher Bar */}
          {activeTab !== 'budget_plan' && (
            <div className="bg-[#111111] p-3 rounded-xl border border-white/5 flex items-center justify-between shadow-xs select-none">
              <button
                onClick={handlePrevMonth}
                className="p-1 px-3 hover:bg-white/5 text-emerald-400 hover:text-emerald-300 rounded-lg text-xs font-bold border border-white/5 bg-transparent cursor-pointer active:scale-95 transition-all text-center"
                title="Previous Month"
              >
                ◀ Prev
              </button>
              <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-[#eeeeee]">
                <Calendar size={13} className="text-emerald-500 animate-pulse" />
                <span>{totals.monthName}</span>
              </div>
              <button
                onClick={handleNextMonth}
                className="p-1 px-3 hover:bg-white/5 text-emerald-400 hover:text-emerald-300 rounded-lg text-xs font-bold border border-white/5 bg-transparent cursor-pointer active:scale-95 transition-all text-center"
                title="Next Month"
              >
                Next ▶
              </button>
            </div>
          )}

          {/* TAB 1: DASHBOARD VIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-4 animate-in fade-in duration-200" id="tab_dashboard">
              
              {/* Circular Gauge and Budget stats header */}
              <div className="bg-[#111111] rounded-2xl p-4 border border-white/5 shadow-2xs">
                <h2 className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-3 font-mono">
                  {totals.monthName} Status
                </h2>

                <div className="grid grid-cols-12 gap-3 items-center">
                  {/* Gauge */}
                  <div className="col-span-5 flex flex-col items-center justify-center">
                    <div className="relative w-24 h-24 flex items-center justify-center rounded-full border-4 border-[#1c1c1c] shadow-inner bg-black/40">
                      {/* Interactive ring highlight colored according to status */}
                      <span className={`absolute inset-0 rounded-full border-4 border-transparent transition-all ${
                        totals.percent >= 100 ? 'border-t-rose-500 border-r-rose-400' :
                        totals.percent >= 80 ? 'border-t-amber-500 border-r-amber-400' :
                        statusConfig.title.includes('Spending Too Fast') ? 'border-t-yellow-500 border-r-yellow-400' :
                        'border-t-emerald-500 border-r-emerald-400'
                      }`} style={{ transform: `rotate(${(totals.percent / 100) * 180}deg)` }}></span>
                      
                      <div className="text-center z-10">
                        <span className="text-xl font-bold font-mono text-white">{totals.percent}%</span>
                        <p className="text-[8px] text-gray-500 font-bold uppercase tracking-wider font-mono">Spent</p>
                      </div>
                    </div>
                  </div>

                  {/* Quantitative numbers */}
                  <div className="col-span-7 space-y-2">
                    <div>
                      <span className="text-[10px] font-semibold text-gray-405 block">Spent this month</span>
                      <span className="text-3xl font-extrabold font-mono text-white block mt-0.5">{currencySymbol}{totals.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex gap-4 border-t border-[#1C1C1C] pt-2">
                      <div>
                        <span className="text-[9px] font-bold text-gray-405 uppercase tracking-tight block">Budget Limit</span>
                        <span className="text-xs font-bold text-gray-300 font-mono">{currencySymbol}{totals.limit.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-gray-405 uppercase tracking-tight block">Budget Remaining</span>
                        <span className={`text-xs font-extrabold font-mono ${totals.remaining >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {currencySymbol}{totals.remaining.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status alert message */}
                <div className={`mt-3.5 p-2 px-3 border rounded-xl text-xs flex items-start gap-2 ${statusConfig.color} transition-all`}>
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block tracking-tight">{statusConfig.title}</span>
                    <p className="text-[10px] leading-snug text-gray-400 mt-0.5">{statusConfig.desc}</p>
                  </div>
                </div>
              </div>

              {/* High-quality Quick Add Trigger and Quick Insights */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowAddForm(true)}
                  className="p-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-center shadow-xs cursor-pointer flex flex-col items-center justify-center gap-1 border-0 transition-all font-sans"
                >
                  <Plus size={20} className="stroke-[3]" />
                  <span className="text-[10px] font-extrabold uppercase tracking-widest">Log Expense</span>
                </button>

                <button
                  onClick={() => setActiveTab('analytics')}
                  className="p-3 bg-[#111111] hover:bg-[#1a1a1a] border border-white/5 text-emerald-400 rounded-xl text-center shadow-2xs cursor-pointer flex flex-col items-center justify-center gap-1 transition-all font-sans"
                >
                  <TrendingUp size={20} className="text-emerald-500 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#eeeeee]">View Insights</span>
                </button>
              </div>

              {/* Mini Interactive Category Quick bars */}
              <div className="bg-[#111111] rounded-2xl p-4 border border-white/5 shadow-2xs">
                <div className="flex items-center justify-between mb-3.5">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-sans">Spending to date</h3>
                  <span className="text-[9px] text-gray-400 font-bold font-mono">Tap bar to view ledger</span>
                </div>

                {categoryStats.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <p className="text-xs font-medium">No active transactions logged this month.</p>
                    <p className="text-[10px] mt-0.5">Click "Log Expense" to start.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {categoryStats.map((stat) => {
                      const catLimit = stat.limit || 0;
                      const remaining = catLimit - stat.total;
                      const share = catLimit > 0 ? Math.round((stat.total / catLimit) * 100) : 100;
                      return (
                        <div 
                          key={stat.id} 
                          className="space-y-1.5 cursor-pointer hover:bg-white/5 p-2 -m-2 rounded-xl transition-all duration-150 relative group"
                          onClick={() => {
                            setFilterCategory(stat.id);
                            setActiveTab('history');
                          }}
                          title={`Click to view all ${stat.label} transactions`}
                        >
                          <div className="flex items-start justify-between text-xs">
                            <div className="min-w-0">
                              <span className="font-semibold text-gray-200 block truncate group-hover:text-emerald-400 transition-colors">{stat.label}</span>
                              <span className={`text-[10px] font-mono leading-none ${remaining >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {remaining >= 0 ? `${currencySymbol}${remaining.toFixed(0)} remaining` : `${currencySymbol}${Math.abs(remaining).toFixed(0)} over limit`}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-mono text-gray-300 block">{currencySymbol}{stat.total.toFixed(0)} <span className="text-gray-600 font-bold">/ {currencySymbol}{catLimit.toFixed(0)}</span></span>
                              <span className="text-[10px] text-gray-500 font-bold block group-hover:text-emerald-400 font-sans transition-colors">({share}%) →</span>
                            </div>
                          </div>
                          <div className="w-full bg-black/40 rounded-full h-1.5 overflow-hidden border border-white/5">
                            <div 
                              className={`h-full rounded-full transition-all group-hover:brightness-110 ${
                                share >= 100 ? 'bg-rose-500' :
                                share >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`} 
                              style={{ width: `${Math.min(share, 100)}%` }} 
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: TRANSACTIONS HISTORY VIEW */}
          {activeTab === 'history' && (
            <div className="space-y-4 animate-in fade-in duration-200" id="tab_history">
              <div className="bg-[#111111] rounded-2xl p-4 border border-white/5 shadow-2xs">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-bold text-white uppercase tracking-widest">Expenses Entered</h2>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleExportToCSV}
                      className="p-1 px-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-400 text-[9px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                      title="Export filtered expenses to Excel/CSV spreadsheet"
                    >
                      <FileSpreadsheet size={11} />
                      <span>CSV</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportToPDF}
                      className="p-1 px-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-[9px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                      title="Export filtered expenses as a beautiful PDF Invoice/Statement report"
                    >
                      <FileText size={11} />
                      <span>PDF</span>
                    </button>
                  </div>
                </div>

                {/* Filter Actions */}
                <div className="space-y-2 mb-4">
                  {/* Search text */}
                  <div className="relative">
                    <span className="absolute left-2.5 top-2.5 text-gray-500">
                      <Search size={14} />
                    </span>
                    <input
                      type="text"
                      placeholder="Search transactions or notes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-8 py-1.5 text-xs bg-black/40 border border-white/10 text-white focus:border-emerald-500 focus:bg-[#0A0A0A] rounded-lg outline-hidden"
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-2 py-0.5 text-gray-500 hover:text-white text-xs cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {/* Dropdown Filters row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[8px] font-bold text-gray-500 uppercase tracking-wider mb-1">Tag Category</label>
                      <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="w-full p-1.5 bg-black/40 text-[10px] border border-white/10 rounded-lg text-gray-300"
                      >
                        <option value="all">📁 All Categories</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id} className="bg-black text-white">{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[8px] font-bold text-gray-500 uppercase tracking-wider mb-1">Payment Channel</label>
                      <select
                        value={filterPayment}
                        onChange={(e) => setFilterPayment(e.target.value)}
                        className="w-full p-1.5 bg-black/40 text-[10px] border border-white/10 rounded-lg text-gray-300"
                      >
                        <option value="all" className="bg-[#111111]">💳 All Methods</option>
                        <option value="card" className="bg-[#111111]">Card Payment</option>
                        <option value="digital_wallet" className="bg-[#111111]">Digital Wallet</option>
                        <option value="cash" className="bg-[#111111]">Paper Cash</option>
                        <option value="other" className="bg-[#111111]">Other Type</option>
                      </select>
                    </div>
                  </div>

                  {/* Date Range filters */}
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="relative">
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="block text-[8px] font-bold text-gray-500 uppercase tracking-wider">Start Date</label>
                        {filterStartDate && (
                          <button
                            type="button"
                            onClick={() => setFilterStartDate("")}
                            className="text-[8px] text-red-500 hover:text-red-400 font-bold bg-transparent border-0 cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          readOnly
                          value={filterStartDate}
                          onClick={() => {
                            setShowStartDateCalendar(!showStartDateCalendar);
                            setShowEndDateCalendar(false);
                          }}
                          className="w-full pl-2 pr-7 py-1.5 bg-black/40 text-[10px] border border-white/10 rounded-lg text-gray-300 focus:border-emerald-500 focus:outline-[#10b981] select-none block font-mono cursor-pointer"
                          placeholder="Select Start Date"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setShowStartDateCalendar(!showStartDateCalendar);
                            setShowEndDateCalendar(false);
                          }}
                          className="absolute right-2 top-1.5 text-gray-400 hover:text-emerald-400 transition-all cursor-pointer bg-transparent border-0"
                          title="Open Start Date Calendar"
                        >
                          <Calendar size={12} className={showStartDateCalendar ? "text-emerald-400 scale-110 transition-all" : "transition-all"} />
                        </button>
                      </div>

                      {/* Custom Popup for Start Date Calendar */}
                      {showStartDateCalendar && (
                        <div 
                          ref={startDateCalendarRef}
                          className="absolute left-0 mt-1.5 p-3 bg-[#161616] border border-white/10 rounded-xl shadow-2xl z-50 text-white text-xs w-64 select-none animate-in fade-in zoom-in-95 duration-150"
                        >
                          {/* Header */}
                          <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2 font-sans">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (startCalendarMonth === 0) {
                                  setStartCalendarMonth(11);
                                  setStartCalendarYear(y => y - 1);
                                } else {
                                  setStartCalendarMonth(m => m - 1);
                                }
                              }}
                              className="p-1 px-1.5 hover:bg-white/5 text-gray-400 hover:text-white rounded-md cursor-pointer border-0 bg-transparent text-[10px]"
                            >
                              ◀
                            </button>
                            <span className="font-bold text-[9px] uppercase tracking-widest text-[#eeeeee]">
                              {new Date(startCalendarYear, startCalendarMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (startCalendarMonth === 11) {
                                    setStartCalendarMonth(0);
                                    setStartCalendarYear(y => y + 1);
                                  } else {
                                    setStartCalendarMonth(m => m + 1);
                                  }
                                }}
                                className="p-1 px-1.5 hover:bg-white/5 text-gray-400 hover:text-white rounded-md cursor-pointer border-0 bg-transparent text-[10px]"
                              >
                                ▶
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowStartDateCalendar(false);
                                }}
                                className="p-1 hover:bg-white/10 text-gray-400 hover:text-rose-400 rounded-md cursor-pointer border-0 bg-transparent text-[10px] ml-1"
                                title="Close Calendar"
                              >
                                ✕
                              </button>
                            </div>
                          </div>

                          {/* Day headers */}
                          <div className="grid grid-cols-7 text-center text-[8px] font-bold uppercase text-gray-500 mb-1">
                            <span>S</span>
                            <span>M</span>
                            <span>T</span>
                            <span>W</span>
                            <span>T</span>
                            <span>F</span>
                            <span>S</span>
                          </div>

                          {/* Days Grid */}
                          <div className="grid grid-cols-7 gap-1 text-center font-mono">
                            {Array.from({ length: new Date(startCalendarYear, startCalendarMonth, 1).getDay() }).map((_, idx) => (
                              <span key={`empty-start-${idx}`} />
                            ))}

                            {Array.from({ length: new Date(startCalendarYear, startCalendarMonth + 1, 0).getDate() }).map((_, idx) => {
                              const dayNum = idx + 1;
                              const thisDateString = `${startCalendarYear}-${(startCalendarMonth + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
                              const isSelected = thisDateString === filterStartDate;

                              return (
                                <button
                                  key={`day-start-${dayNum}`}
                                  type="button"
                                  onClick={() => {
                                    setFilterStartDate(thisDateString);
                                    setShowStartDateCalendar(false);
                                  }}
                                  className={`p-1 text-[10px] rounded-md transition-colors cursor-pointer border-0 active:scale-95 ${
                                    isSelected 
                                      ? 'bg-emerald-600 text-white font-bold' 
                                      : 'text-gray-300 hover:bg-white/5 hover:text-white bg-transparent'
                                  }`}
                                >
                                  {dayNum}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="relative font-sans">
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="block text-[8px] font-bold text-gray-500 uppercase tracking-wider">End Date</label>
                        {filterEndDate && (
                          <button
                            type="button"
                            onClick={() => setFilterEndDate("")}
                            className="text-[8px] text-red-500 hover:text-red-400 font-bold bg-transparent border-0 cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          readOnly
                          value={filterEndDate}
                          onClick={() => {
                            setShowEndDateCalendar(!showEndDateCalendar);
                            setShowStartDateCalendar(false);
                          }}
                          className="w-full pl-2 pr-7 py-1.5 bg-black/40 text-[10px] border border-white/10 rounded-lg text-gray-300 focus:border-emerald-500 focus:outline-[#10b981] select-none block font-mono cursor-pointer"
                          placeholder="Select End Date"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setShowEndDateCalendar(!showEndDateCalendar);
                            setShowStartDateCalendar(false);
                          }}
                          className="absolute right-2 top-1.5 text-gray-400 hover:text-emerald-400 transition-all cursor-pointer bg-transparent border-0"
                          title="Open End Date Calendar"
                        >
                          <Calendar size={12} className={showEndDateCalendar ? "text-emerald-400 scale-110 transition-all" : "transition-all"} />
                        </button>
                      </div>

                      {/* Custom Popup for End Date Calendar */}
                      {showEndDateCalendar && (
                        <div 
                          ref={endDateCalendarRef}
                          className="absolute right-0 mt-1.5 p-3 bg-[#161616] border border-white/10 rounded-xl shadow-2xl z-50 text-white text-xs w-64 select-none animate-in fade-in zoom-in-95 duration-150"
                        >
                          {/* Header */}
                          <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2 font-sans">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (endCalendarMonth === 0) {
                                  setEndCalendarMonth(11);
                                  setEndCalendarYear(y => y - 1);
                                } else {
                                  setEndCalendarMonth(m => m - 1);
                                }
                              }}
                              className="p-1 px-1.5 hover:bg-white/5 text-gray-400 hover:text-white rounded-md cursor-pointer border-0 bg-transparent text-[10px]"
                            >
                              ◀
                            </button>
                            <span className="font-bold text-[9px] uppercase tracking-widest text-[#eeeeee]">
                              {new Date(endCalendarYear, endCalendarMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (endCalendarMonth === 11) {
                                    setEndCalendarMonth(0);
                                    setEndCalendarYear(y => y + 1);
                                  } else {
                                    setEndCalendarMonth(m => m + 1);
                                  }
                                }}
                                className="p-1 px-1.5 hover:bg-white/5 text-gray-400 hover:text-white rounded-md cursor-pointer border-0 bg-transparent text-[10px]"
                              >
                                ▶
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowEndDateCalendar(false);
                                }}
                                className="p-1 hover:bg-white/10 text-gray-400 hover:text-rose-400 rounded-md cursor-pointer border-0 bg-transparent text-[10px] ml-1"
                                title="Close Calendar"
                              >
                                ✕
                              </button>
                            </div>
                          </div>

                          {/* Day headers */}
                          <div className="grid grid-cols-7 text-center text-[8px] font-bold uppercase text-gray-500 mb-1">
                            <span>S</span>
                            <span>M</span>
                            <span>T</span>
                            <span>W</span>
                            <span>T</span>
                            <span>F</span>
                            <span>S</span>
                          </div>

                          {/* Days Grid */}
                          <div className="grid grid-cols-7 gap-1 text-center font-mono">
                            {Array.from({ length: new Date(endCalendarYear, endCalendarMonth, 1).getDay() }).map((_, idx) => (
                              <span key={`empty-end-${idx}`} />
                            ))}

                            {Array.from({ length: new Date(endCalendarYear, endCalendarMonth + 1, 0).getDate() }).map((_, idx) => {
                              const dayNum = idx + 1;
                              const thisDateString = `${endCalendarYear}-${(endCalendarMonth + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
                              const isSelected = thisDateString === filterEndDate;

                              return (
                                <button
                                  key={`day-end-${dayNum}`}
                                  type="button"
                                  onClick={() => {
                                    setFilterEndDate(thisDateString);
                                    setShowEndDateCalendar(false);
                                  }}
                                  className={`p-1 text-[10px] rounded-md transition-colors cursor-pointer border-0 active:scale-95 ${
                                    isSelected 
                                      ? 'bg-emerald-600 text-white font-bold' 
                                      : 'text-gray-300 hover:bg-white/5 hover:text-white bg-transparent'
                                  }`}
                                >
                                  {dayNum}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* List of Filtered Expenses */}
                {filteredExpenses.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    <p className="text-xs">No matching transactions found.</p>
                    <p className="text-[10px] mt-1">Try resetting filters or enter a direct expense category query.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto pr-1">
                    {filteredExpenses.map((exp) => {
                      const cat = categories.find(c => c.id === exp.category);
                      const isBusiness = exp.category === 'cat_business_expense';
                      return (
                        <div key={exp.id} className="py-3 flex items-center justify-between group">
                          <div className="flex items-center gap-2 min-w-0">
                            {/* Category Icon with Custom Colors */}
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              cat?.color ? cat.color : 'bg-slate-100/15 text-slate-400 border border-slate-500/10'
                            }`}>
                              {renderCategoryIcon(cat?.icon || 'Tag', 14)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-gray-200 truncate leading-tight flex items-center gap-1.5 flex-wrap">
                                <span>{exp.note || cat?.name || 'Uncategorized'}</span>
                                {isBusiness && (
                                  <span className="px-1 py-0.5 text-[7px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded uppercase font-mono tracking-wider leading-none shrink-0">
                                    Business (Export-Only)
                                  </span>
                                )}
                              </p>
                              <span className="text-[9px] text-gray-500 font-mono">
                                {exp.date} • {exp.paymentMethod.replace('_', ' ')}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-xs font-bold font-mono block mr-1 ${
                              isBusiness ? 'text-indigo-400 font-semibold' : 'text-rose-455'
                            }`}>
                              -{currencySymbol}{exp.amount.toFixed(2)}
                            </span>
                            <button
                              onClick={() => setEditingExpense(exp)}
                              className="p-1 hover:bg-emerald-550/15 text-gray-500 hover:text-emerald-400 rounded-md transition-colors cursor-pointer border-0 bg-transparent"
                              title="Edit this transaction"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="p-1 hover:bg-rose-500/15 text-gray-500 hover:text-rose-400 rounded-md transition-colors cursor-pointer border-0 bg-transparent"
                              title="Delete this transaction permanently"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CHARTS AND ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-4 animate-in fade-in duration-200" id="tab_analytics">
              {/* Pie Chart of category allocations */}
              <div className="bg-[#111111] rounded-2xl p-4 border border-white/5 shadow-2xs">
                <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-1.5 font-sans">
                  Spending by Category
                </h3>
                
                {categoryStats.length === 0 ? (
                  <div className="text-center py-10 bg-black/40 border border-white/5 rounded-xl text-gray-500 text-xs">
                    Please log transaction items to model charts.
                  </div>
                ) : (
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5 h-[130px] w-full text-[9px] relative flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <RePieChart>
                          <Pie
                            data={categoryPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={28}
                            outerRadius={45}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {categoryPieData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.color} 
                                className="cursor-pointer stroke-none outline-hidden hover:opacity-80 transition-opacity"
                                onClick={() => {
                                  setFilterCategory(entry.id);
                                  setActiveTab('history');
                                }}
                              />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any) => [`${currencySymbol}${value}`, 'Amount']} />
                        </RePieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[11px] font-bold font-mono text-white leading-none">{currencySymbol}{totals.totalSpent.toFixed(0)}</span>
                        <span className="text-[7px] text-gray-500 font-bold tracking-tight uppercase">Spent</span>
                      </div>
                    </div>

                    <div className="col-span-7 space-y-1.5 shrink-0">
                      <span className="text-[8px] text-gray-400 font-bold tracking-wider uppercase block mb-1">Click category to inspect:</span>
                      {categoryStats.slice(0, 5).map((stat) => (
                        <div 
                          key={stat.id} 
                          className="flex items-center justify-between text-[10px] cursor-pointer hover:bg-white/5 px-1.5 py-0.5 -mx-1.5 rounded-md transition-all duration-150 group"
                          onClick={() => {
                            setFilterCategory(stat.id);
                            setActiveTab('history');
                          }}
                          title={`Click to view all ${stat.label} transactions`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{
                              backgroundColor: stat.color.includes('rose') ? '#f43f5e' :
                                              stat.color.includes('emerald') ? '#10b981' :
                                              stat.color.includes('blue') ? '#3b82f6' :
                                              stat.color.includes('amber') ? '#f59e0b' :
                                              stat.color.includes('purple') ? '#8b5cf6' :
                                              stat.color.includes('slate') ? '#64748b' : '#a855f7'
                            }} />
                            <span className="text-gray-400 truncate font-semibold group-hover:text-emerald-400 transition-colors">{stat.label}</span>
                          </div>
                          <span className="font-mono font-bold text-white shrink-0 group-hover:text-emerald-400 transition-colors">{currencySymbol}{stat.total.toFixed(0)} →</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Line Chart showing progression pacing against limit */}
              <div className="bg-[#111111] rounded-2xl p-4 border border-white/5 shadow-2xs">
                <h2 className="text-xs font-bold text-white uppercase tracking-widest mb-1.5 font-sans">
                  Spending Progress Pacing
                </h2>
                <p className="text-[10px] text-gray-450 mb-3 leading-tight">
                  Visual trend comparing cumulative discretionary spending (solid line) against total limits (horizontal marker).
                </p>

                {trendChartData.length === 0 || totals.totalSpent === 0 ? (
                  <div className="text-center py-10 bg-black/40 border border-white/5 rounded-xl text-gray-500 text-xs">
                    No data logged for the line charts. Log expenses to generate lines.
                  </div>
                ) : (
                  <div className="h-[180px] w-full text-[10px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <LineChart data={trendChartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f1f1f" />
                        <XAxis dataKey="day" stroke="#555555" tickLine={false} />
                        <YAxis stroke="#555555" tickLine={false} />
                        <Tooltip 
                          contentStyle={{ fontSize: '10px', background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px' }}
                          formatter={(value: any) => [`${currencySymbol}${value}`, 'Cumulative Spent']}
                          labelFormatter={(label) => `Day ${label} of month`}
                        />
                        <ReferenceLine y={totals.limit} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Limit', position: 'insideTopRight', fill: '#ef4444', fontSize: 8 }} />
                        <Line type="monotone" dataKey="cumulativeSpend" stroke="#10b981" strokeWidth={2.5} dot={{ r: 1 }} activeDot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Bar Chart: Daily Individual Transactions */}
              <div className="bg-[#111111] rounded-2xl p-4 border border-white/5 shadow-2xs">
                <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-1 font-sans">
                  Daily Expenditure Spikes
                </h3>
                <p className="text-[9px] text-gray-400 mb-3 font-sans">Individual daily spending amounts.</p>

                {totals.totalSpent === 0 ? (
                  <div className="text-center py-10 bg-black/40 border border-[#242424] rounded-xl text-gray-500 text-xs">No entries to display.</div>
                ) : (
                  <div className="h-[120px] w-full text-[9px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <BarChart data={trendChartData.slice(-14)} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f1f1f" />
                        <XAxis dataKey="day" stroke="#555555" tickLine={false} />
                        <YAxis stroke="#555555" tickLine={false} />
                        <Tooltip 
                          contentStyle={{ fontSize: '9px', background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px' }}
                          formatter={(value: any) => [`${currencySymbol}${value}`, 'Daily Total']}
                        />
                        <Bar dataKey="dailySpend" fill="#10b981" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: BUDGET & LOCAL ARCHITECTURE SETUP */}
          {activeTab === 'budget_plan' && (
            <div className="space-y-4 animate-in fade-in duration-200 animate-in fade-in slide-in-from-bottom-2" id="tab_budget">
              <BudgetSettings 
                categories={categories} 
                currentBudget={currentBudget} 
                onBudgetUpdated={handleUpdateBudget} 
                onDatabaseReset={handleResetDatabase} 
                onCategoryAdded={handleAddCategory}
                onCategoryUpdated={handleUpdateCategory}
                onCategoryDeleted={handleDeleteCategory}
                defaultCategoryId={defaultCategoryId}
                currencySymbol={currencySymbol}
                onCurrencyChanged={handleCurrencyChange}
                enableVoiceAssistant={enableVoiceAssistant}
                onToggleVoiceAssistant={handleToggleVoiceAssistant}
                isDevMode={isDevMode}
              />
            </div>
          )}

          {/* TAB 5: DEVELOPER PLAY STORE HUB */}
          {activeTab === 'dev_hub' && (
            <div className="space-y-4 animate-in fade-in duration-250 font-sans text-xs text-gray-350" id="tab_dev_hub">
              <div className="bg-[#111111] rounded-2xl p-4 border border-white/5 shadow-2xs">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2.5 mb-3">
                  <div className="p-1.5 bg-emerald-950/20 border border-emerald-500/20 rounded-lg text-emerald-400">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[#eeeeee] leading-tight text-sm">Google Play Store Launch Blueprint</h3>
                    <p className="text-[10px] text-gray-500">Production directives for compilation, bundling, and legal terms</p>
                  </div>
                </div>

                {/* Checklist for local build */}
                <div className="space-y-3">
                  <div className="p-2.5 bg-black/40 border border-white/5 rounded-xl">
                    <p className="font-bold text-emerald-400 text-[11px] mb-1">🔐 1. Local Database Strategy (Zero Cloud DB)</p>
                    <p className="text-[10px] text-gray-400 leading-relaxed">
                      Every instance loaded via the package starts with empty state because it triggers client-side local serialization on your device's indexDB/sqlite namespace. It fully complies with GDPR, California Consumer Privacy act, and Google COPPA (child protection) rules since no finance data leaves the user's processor.
                    </p>
                  </div>

                  <div className="p-2.5 bg-black/40 border border-white/5 rounded-xl">
                    <p className="font-bold text-amber-400 text-[11px] mb-1">📢 2. Google AdMob Configuration Steps</p>
                    <div className="text-[10px] text-gray-400 space-y-1.5 leading-relaxed">
                      <p>1. **Create an AdMob account**: Register your app's bundle ID inside Google AdMob dashboard to obtain your live **Application ID** and custom **Banner Unit ID**.</p>
                      <p>2. **Compile with Capacitor or React Native**: Use Capacitor's Android studio wrapper to compile this frontend applet into a native APK. Add the AdMob Gradle SDK dependency in <code className="bg-[#1c1c1c] text-rose-400 px-1 py-0.5 rounded font-mono text-[9px]">build.gradle</code>.</p>
                      <p>3. **Toggle Test Mode off**: Do not request test ads when submitting the final build in the console, but keep test ads enabled in testing so Google does not ban your account for invalid impressions click spam.</p>
                    </div>
                  </div>

                  <div className="p-2.5 bg-black/20 border border-white/5 rounded-xl text-[10px] space-y-2 text-gray-400">
                    <p className="font-bold text-gray-300 text-[11px]">📦 3. Android APK/AAB Compiling Checklist</p>
                    <div className="grid grid-cols-1 gap-1">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                        <span className="text-sm">✓</span> Target SDK Level: API 34+ (Standard Play Store Requirement)
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                        <span className="text-sm">✓</span> Signed Release Key (.jks keystore)
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                        <span className="text-sm">✓</span> Privacy Policy URL (Required for financial budgeting categories)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: HELP GUIDE */}
          {activeTab === 'help' && (
            <div className="space-y-4 animate-in fade-in duration-200" id="tab_help">
              <div className="bg-[#111111] rounded-2xl p-5 border border-white/5 shadow-2xs space-y-5">
                {/* Header */}
                <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
                  <div className="p-2 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-[#10b981]">
                    <HelpCircle size={18} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[#eeeeee] leading-tight text-sm">User Help & Guide</h3>
                    <p className="text-[10px] text-gray-500">Learn how to easily manage your budget and track expenses</p>
                  </div>
                </div>

                {/* Introductory section */}
                <p className="text-[11px] text-gray-300 leading-relaxed font-sans">
                  ExpenseTrack is a simple, private expense tracker that stores all information right on your phone or computer. None of your data ever leaves this device, ensuring complete privacy!
                </p>

                {/* Screens */}
                <div className="space-y-4 font-sans">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-[#10b981]">📱 Main Screens Explained</h4>
                  
                  {/* Dashboard Screen */}
                  <div className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-1.5">
                    <p className="font-bold text-[#eeeeee] text-[11px] flex items-center gap-1.5">
                      <LayoutDashboard size={13} className="text-[#10b981]" />
                      1. The Dashboard
                    </p>
                    <p className="text-[10px] text-gray-400 leading-relaxed">
                      Your home screen that gives you an overview of how you are doing this month:
                    </p>
                    <ul className="text-[10px] text-gray-400 list-disc list-inside pl-1 space-y-1">
                      <li><strong className="text-gray-300">Monthly Budget Card:</strong> Shows how much you have spent out of your set monthly limit. Green bars mean you are safely under budget, yellow warnings indicate you are close, and red alerts mean you have gone over.</li>
                      <li><strong className="text-gray-300">Category Bars:</strong> Displays the total spent in sections like food, bills, or travel.</li>
                      <li><strong className="text-gray-300">Business Expenses Option:</strong> Any expense categorized as <span className="text-emerald-400 font-bold">Business</span> does not count against your personal spending total. We assume you will be reimbursed for these! This makes it easy to track work expenses right inside the same app without mixing up your personal budget numbers.</li>
                      <li><strong className="text-gray-300">Quick Shortcuts:</strong> Buttons to quickly view historical insights or add new categories.</li>
                    </ul>
                  </div>

                  {/* History Screen */}
                  <div className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-1.5">
                    <p className="font-bold text-[#eeeeee] text-[11px] flex items-center gap-1.5">
                      <History size={13} className="text-[#10b981]" />
                      2. Transaction History
                    </p>
                    <p className="text-[10px] text-gray-400 leading-relaxed">
                      This screen shows a list of all your recorded purchases and lets you filter through them:
                    </p>
                    <ul className="text-[10px] text-gray-400 list-disc list-inside pl-1 space-y-1">
                      <li><strong className="text-gray-300">Searching & Filtering:</strong> Type in words to find a specific item. Use the Category and Payment dropdowns to filter down.</li>
                      <li><strong className="text-gray-300">Selecting Date Ranges:</strong> Tap on the <strong className="text-gray-300 font-bold">Start Date</strong> and <strong className="text-gray-300 font-bold">End Date</strong> fields to open custom calendars and filter your transaction list between two dates.</li>
                    </ul>
                  </div>

                  {/* Sharing & Reports */}
                  <div className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-1.5">
                    <p className="font-bold text-[#eeeeee] text-[11px] flex items-center gap-1.5">
                      <FileSpreadsheet size={13} className="text-[#10b981]" />
                      📄 Exporting & Sharing Reports
                    </p>
                    <p className="text-[10px] text-gray-400 leading-relaxed">
                      Need to submit your work expenses for reimbursement, or discuss your budget with a partner or accountant?
                    </p>
                    <ul className="text-[10px] text-gray-400 list-disc list-inside pl-1 space-y-1">
                      <li><strong className="text-gray-300">Create PDF Reports:</strong> Tap the <strong className="text-emerald-400 font-bold">Export PDF Report</strong> button in History. It builds an official audit-ready document of your selected transactions, complete with total sums, system signatures, and item descriptions.</li>
                      <li><strong className="text-gray-300">Download CSV spreadsheet:</strong> Tap the <strong className="text-emerald-400 font-bold">Download CSV</strong> button to save all filtered records as a grid file. You can easily open this file in spreadsheet apps like Excel or Google Sheets.</li>
                    </ul>
                  </div>

                  {/* Analytics Screen */}
                  <div className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-1.5">
                    <p className="font-bold text-[#eeeeee] text-[11px] flex items-center gap-1.5">
                      <PieChart size={13} className="text-[#10b981]" />
                      3. Analytics & Charts
                    </p>
                    <p className="text-[10px] text-gray-400 leading-relaxed">
                      Visual insights on where your money goes:
                    </p>
                    <ul className="text-[10px] text-gray-400 list-disc list-inside pl-1 space-y-1">
                      <li><strong className="text-gray-300">Category Spending Circle:</strong> A colorful interactive breakdown showing exactly which categories cost you the most percentage-wise.</li>
                      <li><strong className="text-gray-300">Daily Spending Curve:</strong> A daily line chart showing how your total spending accumulated over the course of the month.</li>
                    </ul>
                  </div>

                  {/* Settings Screen */}
                  <div className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-1.5">
                    <p className="font-bold text-[#eeeeee] text-[11px] flex items-center gap-1.5">
                      <Sliders size={13} className="text-[#10b981]" />
                      4. Budget Settings
                    </p>
                    <p className="text-[10px] text-gray-400 leading-relaxed">
                      Customize how the app works for you:
                    </p>
                    <ul className="text-[10px] text-gray-400 list-disc list-inside pl-1 space-y-1">
                      <li><strong className="text-gray-300">Set Monthly Limit:</strong> Enter the maximum amount of money you want to budget for the month.</li>
                      <li><strong className="text-gray-300">Transaction Defaults:</strong> New transactions are automatically categorized as <strong className="text-emerald-400 font-bold">Uncategorized</strong> by default for maximum speed.</li>
                      <li><strong className="text-gray-300">Ordering Category Icons:</strong> You can move your most frequently used category icons to the very beginning of the list directly within the transaction Add or Edit screens. This keeps your favorite categories at your fingertips for super-quick selection whenever you add or edit a purchase.</li>
                      <li><strong className="text-gray-300">Currency Symbol:</strong> Switch between symbols like $, €, £, ¥, or ₹.</li>
                    </ul>
                  </div>
                </div>

                {/* Fields & Icons guide */}
                <div className="space-y-3 font-sans pt-1">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-[#10b981]">💡 Important Icons & Fields</h4>
                  
                  <div className="grid grid-cols-1 gap-2.5 text-[10px] text-gray-400 text-left">
                    <div className="flex items-start gap-2.5">
                      <span className="text-[#10b981] text-xs font-bold font-mono shrink-0">📅 Date</span>
                      <div>
                        <p className="font-bold text-gray-300 leading-tight">Transaction Date Field</p>
                        <p className="leading-relaxed mt-0.5">This is the day the purchase was made. You can tap the small calendar icon next to it to pick a date from a clean calendar picker popup interface.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 border-t border-white/5 pt-2">
                      <span className="text-[#10b981] text-xs font-bold font-mono shrink-0">💵 Method</span>
                      <div>
                        <p className="font-bold text-gray-300 leading-tight">Payment Methods</p>
                        <p className="leading-relaxed mt-0.5">Choose how you paid for each transaction: Cash, Card, Digital Wallet (like Google/Apple Pay), or other payment methods.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 border-t border-white/5 pt-2">
                      <span className="text-[#10b981] text-xs font-bold shrink-0">✕ / ✕ Close</span>
                      <div>
                        <p className="font-bold text-gray-300 leading-tight">Closing Popups & Calendars</p>
                        <p className="leading-relaxed mt-0.5">To exit a calendar or close a popup form, you can tap anywhere outside of it, or tap the small "✕" button in the corner to dismiss it.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 border-t border-white/5 pt-2">
                      <span className="text-[#10b981] text-xs font-bold shrink-0">✎ Edit / 🗑 Trash</span>
                      <div>
                        <p className="font-bold text-gray-300 leading-tight">Managing Records</p>
                        <p className="leading-relaxed mt-0.5">In the History screen, tap the pencil icon to modify details of an existing purchase, or tap the trash icon to permanently remove it from your device.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Legal & Privacy Section */}
                <div className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-2 font-sans">
                  <p className="font-extrabold text-[#eeeeee] text-[11px] flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><ShieldCheck size={13} className="text-emerald-400" /> Privacy & Data Deletion</span>
                    <a 
                      href="privacy-policy.html" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-0.5 text-[10px] font-medium"
                    >
                      Read Policy ↗
                    </a>
                  </p>
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    ExpenseTrack is offline-first. We do not transfer, collect, or store your finance logs on external servers. 
                    All transactions reside <strong>strictly on your device</strong>. 
                    You can instantly erase your local files at any time from the <strong>Settings tab</strong> by clicking <strong>"Reset All Data"</strong>. 
                    If you created backups in Google Drive, those files are securely held inside your personal cloud storage where you can delete them at your own discretion.
                  </p>
                </div>

                {/* Summary signature */}
                <div className="border-t border-white/5 pt-3.5 text-center">
                  <p className="text-[9px] text-gray-500 uppercase tracking-widest font-mono">EXPENSE TRACK PRIVATE LEDGER SYSTEM</p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Dynamic bottom floating CTA trigger for quick accessibility */}
        {activeTab !== 'budget_plan' && activeTab !== 'dev_hub' && activeTab !== 'help' && (
          <div className="absolute right-5 bottom-18 z-20">
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white p-3.5 rounded-full shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center border-0 outline-hidden focus:ring-4 focus:ring-emerald-500/20"
              title="Add Discretionary Expense"
            >
              <Plus size={22} className="stroke-[3]" />
            </button>
          </div>
        )}

        {/* Dynamic Conversational Google Assistant voice panel */}
        {enableVoiceAssistant && (
          <VoiceAssistant
            categories={categories}
            onAddExpense={handleAddExpense}
            currencySymbol={currencySymbol}
          />
        )}

        {/* Modern Bottom Android Navigation Tab bar */}
        <div className="bg-[#0A0A0A] border-t border-white/5 px-4 py-2.5 shrink-0 flex items-center justify-between z-10" id="android_nav_bar">
          
          {/* Nav Item: Dashboard */}
          <button
            onClick={() => { setActiveTab('dashboard'); setShowAddForm(false); }}
            className={`flex flex-col items-center justify-center flex-1 cursor-pointer transition-all ${
              activeTab === 'dashboard' ? 'text-emerald-400 scale-105 font-semibold font-sans' : 'text-gray-500 hover:text-gray-400 font-sans'
            }`}
          >
            <LayoutDashboard size={18} className={activeTab === 'dashboard' ? 'stroke-[2.5] text-emerald-400' : 'stroke-[1.5]'} />
            <span className="text-[9px] mt-1 font-sans">Dashboard</span>
          </button>

          {/* Nav Item: Logs history */}
          <button
            onClick={() => { setActiveTab('history'); setShowAddForm(false); }}
            className={`flex flex-col items-center justify-center flex-1 cursor-pointer transition-all ${
              activeTab === 'history' ? 'text-emerald-400 scale-105 font-semibold font-sans' : 'text-gray-500 hover:text-gray-400 font-sans'
            }`}
          >
            <History size={18} className={activeTab === 'history' ? 'stroke-[2.5] text-emerald-400' : 'stroke-[1.5]'} />
            <span className="text-[9px] mt-1 font-sans">History</span>
          </button>

          {/* Nav Item: Trends & Charts */}
          <button
            onClick={() => { setActiveTab('analytics'); setShowAddForm(false); }}
            className={`flex flex-col items-center justify-center flex-1 cursor-pointer transition-all ${
              activeTab === 'analytics' ? 'text-emerald-400 scale-105 font-semibold font-sans' : 'text-gray-500 hover:text-gray-400 font-sans'
            }`}
          >
            <PieChart size={18} className={activeTab === 'analytics' ? 'stroke-[2.5] text-emerald-400' : 'stroke-[1.5]'} />
            <span className="text-[10px] mt-1 font-sans">Analytics</span>
          </button>

          {/* Nav Item: Local SQLite/Budget settings */}
          <button
            onClick={() => { setActiveTab('budget_plan'); setShowAddForm(false); }}
            className={`flex flex-col items-center justify-center flex-1 cursor-pointer transition-all ${
              activeTab === 'budget_plan' ? 'text-emerald-400 scale-105 font-semibold font-sans' : 'text-gray-500 hover:text-gray-400 font-sans'
            }`}
          >
            <Sliders size={18} className={activeTab === 'budget_plan' ? 'stroke-[2.5] text-emerald-400' : 'stroke-[1.5]'} />
            <span className="text-[9px] mt-1 font-sans">Settings</span>
          </button>

          {/* Nav Item: Help & Guide */}
          <button
            onClick={() => { setActiveTab('help'); setShowAddForm(false); }}
            className={`flex flex-col items-center justify-center flex-1 cursor-pointer transition-all ${
              activeTab === 'help' ? 'text-emerald-400 scale-105 font-semibold font-sans' : 'text-gray-500 hover:text-gray-400 font-sans'
            }`}
          >
            <HelpCircle size={18} className={activeTab === 'help' ? 'stroke-[2.5] text-emerald-400' : 'stroke-[1.5]'} />
            <span className="text-[9px] mt-1 font-sans">Help</span>
          </button>

        </div>
      </div>
    </AndroidFrame>
  );
}
