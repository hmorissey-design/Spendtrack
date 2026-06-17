/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Category, MonthlyBudget } from '../types';
import { 
  DollarSign, Save, Download, Upload, AlertTriangle, CheckCircle, Shield,
  Plus, Edit, Trash2, Check, Utensils, ShoppingBag, Film, Car, Sparkles, Coffee,
  Briefcase, Gift, Heart, Home, Laptop, Dumbbell, Plane, Users, Phone, HelpCircle, Tag, X,
  Cloud, CloudUpload, CloudDownload, Image as ImageIcon, Eye, ExternalLink, Calendar, TrendingUp,
  Mic, MicOff
} from 'lucide-react';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  PieChart as RePieChart,
  Pie,
  Cell
} from 'recharts';

import dashSplash from '../assets/images/expensetrack_dash_splash_1781301585056.jpg';
import chartsSplash from '../assets/images/expensetrack_charts_splash_1781301595864.jpg';
import budgetSplash from '../assets/images/expensetrack_budget_splash_1781301607200.jpg';
import pdfReportSplash from '../assets/images/expensetrack_pdf_splash_1781301617685.jpg';
import appLogo from '../assets/images/expensetrack_logo_1781299964788.jpg';
import { LocalDb } from '../utils/db';
import { User } from 'firebase/auth';
import { 
  googleSignIn, 
  logoutGoogleCheck, 
  initAuth, 
  findBackupFile, 
  saveBackupToDrive, 
  downloadBackupFromDrive,
  DriveFileInfo
} from '../utils/drive';
import firebaseConfig from '../../firebase-applet-config.json';

interface BudgetSettingsProps {
  categories: Category[];
  currentBudget: MonthlyBudget;
  onBudgetUpdated: (limit: number, limits: Record<string, number>) => void;
  onDatabaseReset: () => void;
  onCategoryAdded?: (category: Omit<Category, 'id'>, isDefault?: boolean) => void;
  onCategoryUpdated?: (category: Category, isDefault?: boolean) => void;
  onCategoryDeleted?: (id: string) => void;
  defaultCategoryId: string;
  currencySymbol: string;
  onCurrencyChanged: (symbol: string) => void;
  enableVoiceAssistant?: boolean;
  onToggleVoiceAssistant?: (enabled: boolean) => void;
  isDevMode?: boolean;
}

// Preset color themes mapping named choices to background text pairings
const COLOR_PRESETS = [
  { label: 'Emerald Spark', value: 'emerald', bgClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', textClass: 'text-emerald-400', hex: '#10b981' },
  { label: 'Crimson Rose', value: 'rose', bgClass: 'bg-rose-500/10 text-rose-400 border border-rose-500/20', textClass: 'text-rose-400', hex: '#f43f5e' },
  { label: 'Cosmic Purple', value: 'purple', bgClass: 'bg-purple-500/10 text-purple-400 border border-purple-500/20', textClass: 'text-purple-400', hex: '#8b5cf6' },
  { label: 'Amber Glow', value: 'amber', bgClass: 'bg-amber-500/10 text-amber-400 border border-amber-500/20', textClass: 'text-amber-400', hex: '#f59e0b' },
  { label: 'Ocean Blue', value: 'blue', bgClass: 'bg-blue-500/10 text-blue-400 border border-blue-500/20', textClass: 'text-blue-400', hex: '#3b82f6' },
  { label: 'Carbon Gray', value: 'slate', bgClass: 'bg-slate-500/10 text-slate-300 border border-slate-500/20', textClass: 'text-slate-400', hex: '#64748b' },
];

const ICON_PRESETS = [
  'Utensils', 'ShoppingBag', 'Film', 'Car', 'Sparkles', 'Coffee', 'Briefcase', 'Gift', 'Heart', 'Home', 'Laptop', 'Dumbbell', 'Plane', 'Users', 'Phone', 'HelpCircle'
];

export function renderCategoryIcon(iconName: string, size = 16) {
  switch (iconName) {
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
    default: return <Tag size={size} />;
  }
}

export function BudgetSettings({ 
  categories, 
  currentBudget, 
  onBudgetUpdated, 
  onDatabaseReset,
  onCategoryAdded,
  onCategoryUpdated,
  onCategoryDeleted,
  defaultCategoryId,
  currencySymbol,
  onCurrencyChanged,
  enableVoiceAssistant = false,
  onToggleVoiceAssistant,
  isDevMode = false
}: BudgetSettingsProps) {
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState<boolean>(false);
  const [deviceRestoreConfirm, setDeviceRestoreConfirm] = useState<boolean>(false);
  const [deviceRestoreContent, setDeviceRestoreContent] = useState<string | null>(null);
  const [deviceRestoreFilename, setDeviceRestoreFilename] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Google Drive Cloud Backup States
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const [driveLoading, setDriveLoading] = useState<boolean>(false);
  const [cloudBackupInfo, setCloudBackupInfo] = useState<DriveFileInfo | null>(null);
  const [cloudSuccess, setCloudSuccess] = useState<string | null>(null);
  const [cloudError, setCloudError] = useState<React.ReactNode | null>(null);
  const [confirmCloudBackup, setConfirmCloudBackup] = useState<boolean>(false);
  const [confirmCloudRestore, setConfirmCloudRestore] = useState<boolean>(false);
  const [previewAsset, setPreviewAsset] = useState<{ name: string; url: string } | null>(null);
  const [downloadingAsset, setDownloadingAsset] = useState<boolean>(false);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const handleDownloadAsset = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!previewAsset) return;

    if (previewAsset.name === "App Launcher Logo") {
      const link = document.createElement('a');
      link.href = previewAsset.url;
      link.download = previewAsset.name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    if (!previewContainerRef.current) return;

    try {
      setDownloadingAsset(true);
      const { toJpeg } = await import('html-to-image');
      
      // Ensure element captures in natural scale and styling
      const dataUrl = await toJpeg(previewContainerRef.current, {
        quality: 0.98,
        backgroundColor: '#000000',
        style: {
          borderRadius: '0px',
        }
      });

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = previewAsset.name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to generate dynamic screenshot", err);
      // fallback to static file if error
      const link = document.createElement('a');
      link.href = previewAsset.url;
      link.download = previewAsset.name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloadingAsset(false);
    }
  };

  // Load local expenses on mount or when previewAsset gets updated
  const [localExpenses, setLocalExpenses] = useState<any[]>([]);
  useEffect(() => {
    setLocalExpenses(LocalDb.getExpenses());
  }, [previewAsset]);

  const currentMonthPrefixVal = useMemo(() => new Date().toISOString().substring(0, 7), []);
  const monthNameVal = useMemo(() => new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }), []);

  const {
    currentMonthExpensesVal,
    totalSpentVal,
    totalLimitVal,
    percentSpentVal,
    remainingAmountVal
  } = useMemo(() => {
    const expensesInMonth = localExpenses.filter(e => e.date.startsWith(currentMonthPrefixVal) && e.category !== 'cat_business_expense');
    const spentObj = expensesInMonth.reduce((sum, e) => sum + e.amount, 0);
    const limitObj = categories.filter(c => c.id !== 'cat_business_expense').reduce((sum, c) => sum + (c.limit || 0), 0);
    const percentObj = limitObj > 0 ? Math.round((spentObj / limitObj) * 100) : 0;
    const remainingObj = limitObj - spentObj;
    return {
      currentMonthExpensesVal: expensesInMonth,
      totalSpentVal: spentObj,
      totalLimitVal: limitObj,
      percentSpentVal: percentObj,
      remainingAmountVal: remainingObj
    };
  }, [localExpenses, categories, currentMonthPrefixVal]);

  // Checks for existing backup once token is available
  useEffect(() => {
    let active = true;
    if (driveToken) {
      setDriveLoading(true);
      setCloudError(null);
      findBackupFile(driveToken)
        .then((fileInfo) => {
          if (active) {
            setCloudBackupInfo(fileInfo);
          }
        })
        .catch((err: any) => {
          console.error("Error finding backup file", err);
          if (active) {
            if (err.message && (err.message.includes('403') || err.message.includes('Permission') || err.message.includes('scope'))) {
              setCloudError("Access Denied: Please click 'Disconnect' above, then sign in again and make sure to SELECT/CHECK the checkbox allowing 'View and manage Google Drive files...' on the Google permission page.");
            } else {
              setCloudError("Could not check Google Drive backup: " + err.message);
            }
          }
        })
        .finally(() => {
          if (active) {
            setDriveLoading(false);
          }
        });
    } else {
      setCloudBackupInfo(null);
    }
    return () => {
      active = false;
    };
  }, [driveToken]);

  const getFriendlyErrorMessage = (err: any): React.ReactNode => {
    const msg = err?.message || err?.code || String(err);
    if (msg.includes('unauthorized-domain') || msg.includes('auth/unauthorized-domain') || msg.includes('unauthorized_client')) {
      const currentHost = window.location.hostname;
      const firebaseConsoleUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`;
      return (
        <div className="space-y-2 text-left">
          <p className="font-bold text-rose-400">Firebase domain authorized error!</p>
          <p className="text-gray-300 text-[11px]">
            Google Sign-in is blocked because this URL (<span className="text-emerald-400 font-mono font-semibold">{currentHost}</span>) hasn't been added to your Firebase project's authorized domains list.
          </p>
          <div className="bg-black/50 p-3 rounded-lg border border-rose-500/10 text-[11px] space-y-1.5 text-gray-300">
            <p className="font-semibold text-emerald-400">Quick 1-Minute Fix:</p>
            <ol className="list-decimal pl-4 space-y-1 text-gray-300">
              <li>
                Open the{' '}
                <a 
                  href={firebaseConsoleUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-emerald-400 font-semibold hover:underline inline-flex items-center gap-1"
                >
                  Firebase Console Settings <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </li>
              <li>Scroll down to the <span className="font-semibold text-gray-200">Authorized domains</span> section, then click <span className="font-semibold text-gray-200">Add domain</span>.</li>
              <li>
                Type <span className="text-emerald-400 font-mono font-semibold">{currentHost}</span> and click <span className="font-semibold text-gray-200">Add</span>.</li>
            </ol>
          </div>
        </div>
      );
    }
    
    if (msg.includes('popup-closed-by-user')) {
      return "Sign-in popup closed before completion. Please try again.";
    }

    if (msg.includes('popup-blocked')) {
      return "Popup was blocked by your browser. Please check your browser's address bar to allow popups, or open the link directly in a browser tab.";
    }

    return `Google login failed: ${msg}. Please try again.`;
  };

  // Try to restore user session on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setDriveToken(token);
      },
      () => {
        setGoogleUser(null);
        setDriveToken(null);
      },
      (err) => {
        setCloudError(getFriendlyErrorMessage(err));
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setDriveLoading(true);
    setCloudError(null);
    setCloudSuccess(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setDriveToken(result.accessToken);
        setCloudSuccess("Successfully signed in with Google!");
        setTimeout(() => setCloudSuccess(null), 3500);
      }
    } catch (err: any) {
      console.error("Sign in failed", err);
      setCloudError(getFriendlyErrorMessage(err));
    } finally {
      setDriveLoading(false);
    }
  };

  const handleGoogleSignOut = async () => {
    setDriveLoading(true);
    try {
      await logoutGoogleCheck();
      setGoogleUser(null);
      setDriveToken(null);
      setCloudBackupInfo(null);
      setCloudSuccess("Signed out successfully.");
      setTimeout(() => setCloudSuccess(null), 3000);
    } catch (err) {
      console.error("Sign out failed", err);
    } finally {
      setDriveLoading(false);
    }
  };

  const handleCloudBackup = async () => {
    if (!driveToken) {
      setCloudError("Not authenticated with Google.");
      return;
    }

    if (!confirmCloudBackup) {
      setConfirmCloudBackup(true);
      setConfirmCloudRestore(false);
      return;
    }

    setDriveLoading(true);
    setCloudError(null);
    setCloudSuccess(null);
    setConfirmCloudBackup(false);

    try {
      const dbContent = LocalDb.exportDatabase();
      const updatedFile = await saveBackupToDrive(driveToken, dbContent);
      setCloudBackupInfo(updatedFile);
      setCloudSuccess("Database successfully backed up to your Google Drive!");
      setTimeout(() => setCloudSuccess(null), 4000);
    } catch (err: any) {
      console.error("Backup failed", err);
      if (err.message && (err.message.includes('403') || err.message.includes('Permission') || err.message.includes('scope'))) {
        setCloudError("Access Denied: Please click 'Disconnect' above, then sign in again and make sure to SELECT/CHECK the checkbox allowing 'View and manage Google Drive files...' on the Google permission page.");
      } else {
        setCloudError("Failed to upload backup to Google Drive: " + err.message);
      }
    } finally {
      setDriveLoading(false);
    }
  };

  const handleCloudRestore = async () => {
    if (!driveToken) {
      setCloudError("Not authenticated with Google.");
      return;
    }
    if (!cloudBackupInfo) {
      setCloudError("No backup file selected.");
      return;
    }

    if (!confirmCloudRestore) {
      setConfirmCloudRestore(true);
      setConfirmCloudBackup(false);
      return;
    }

    setDriveLoading(true);
    setCloudError(null);
    setCloudSuccess(null);
    setConfirmCloudRestore(false);

    try {
      const jsonContent = await downloadBackupFromDrive(driveToken, cloudBackupInfo.id);
      const success = LocalDb.importDatabase(jsonContent);
      if (success) {
        setCloudSuccess("Database successfully restored! Reloading...");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setCloudError("Verify failed: Google Drive backup file format is corrupted or invalid.");
      }
    } catch (err: any) {
      console.error("Restore failed", err);
      setCloudError("Failed to restore backup from Drive: " + err.message);
    } finally {
      setDriveLoading(false);
    }
  };

  // Form States for CRUD Category
  const [showCategoryManager, setShowCategoryManager] = useState<boolean>(false);
  const [showCurrencyManager, setShowCurrencyManager] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<Category | 'new' | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string, name: string } | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formLimit, setFormLimit] = useState<string>('0');
  const [formIcon, setFormIcon] = useState<string>('Tag');
  const [formColor, setFormColor] = useState<string>('emerald');
  const [formIsDefault, setFormIsDefault] = useState<boolean>(false);

  const totalCalculatedLimit = categories.filter(c => c.id !== 'cat_business_expense').reduce((sum, c) => sum + (c.limit || 0), 0);

  // Sync total budget target in standard MonthlyBudgets system when category limits sum changes
  useEffect(() => {
    // If mismatch, automatically update current month's recorded budget limit with the computed sum
    if (totalCalculatedLimit !== currentBudget.limitAmount) {
      onBudgetUpdated(totalCalculatedLimit, currentBudget.categoryLimits || {});
    }
  }, [totalCalculatedLimit, currentBudget, onBudgetUpdated]);

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormLimit((cat.limit || 0).toString());
    setFormIcon(cat.icon);
    setFormIsDefault(cat.id === defaultCategoryId);
    
    // Attempt to reverse guess form color state from CSS class
    const match = COLOR_PRESETS.find(p => cat.color.includes(p.value));
    setFormColor(match ? match.value : 'emerald');
    setErrorMsg(null);
  };

  const handleOpenCreateNew = () => {
    setEditingCategory('new');
    setFormName('');
    setFormLimit('0');
    setFormIcon('Sparkles');
    setFormColor('emerald');
    setFormIsDefault(false);
    setErrorMsg(null);
  };

  const handleSaveCategoryForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setErrorMsg('Please enter a category name.');
      return;
    }
    const parsedLimit = parseFloat(formLimit);
    if (isNaN(parsedLimit) || parsedLimit < 0) {
      setErrorMsg('Please enter a valid positive numeric limit.');
      return;
    }

    const selectedPreset = COLOR_PRESETS.find(p => p.value === formColor) || COLOR_PRESETS[0];

    if (editingCategory === 'new') {
      const newCatData: Omit<Category, 'id'> = {
        name: formName.trim(),
        limit: parsedLimit,
        icon: formIcon,
        color: selectedPreset.bgClass,
        textColor: selectedPreset.textClass,
      };
      if (onCategoryAdded) {
        onCategoryAdded(newCatData, formIsDefault);
        setSuccessMsg('Created custom budget category.');
      }
    } else if (editingCategory) {
      const updatedCat: Category = {
        ...editingCategory,
        name: formName.trim(),
        limit: parsedLimit,
        icon: formIcon,
        color: selectedPreset.bgClass,
        textColor: selectedPreset.textClass,
      };
      if (onCategoryUpdated) {
        onCategoryUpdated(updatedCat, formIsDefault);
        setSuccessMsg('Updated category budget limit.');
      }
    }

    setEditingCategory(null);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleDeleteClick = (id: string, name: string) => {
    setCategoryToDelete({ id, name });
  };

  const handleConfirmDelete = () => {
    if (categoryToDelete && onCategoryDeleted) {
      onCategoryDeleted(categoryToDelete.id);
      setSuccessMsg(`Deleted "${categoryToDelete.name}" category successfully.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
    setCategoryToDelete(null);
  };

  const handleExport = () => {
    const dataStr = LocalDb.exportDatabase();
    
    // Save to localStorage internal backup slot for 1-click restore
    localStorage.setItem('expensetrack_device_backup', dataStr);
    
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `ExpenseTrack_backup_${new Date().toISOString().substring(0, 10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    setSuccessMsg('ExpenseTrack backup saved and downloaded successfully!');
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleDeviceRestoreClick = () => {
    setErrorMsg(null);
    const storedBackup = localStorage.getItem('expensetrack_device_backup');
    if (!storedBackup) {
      setErrorMsg('No auto-saved backup found in this browser\'s cache.');
      setTimeout(() => setErrorMsg(null), 5000);
      return;
    }

    try {
      const parsed = JSON.parse(storedBackup);
      if (Array.isArray(parsed.expenses) && Array.isArray(parsed.categories)) {
        setDeviceRestoreContent(storedBackup);
        
        let formattedDate = 'Unknown date';
        if (parsed.exportedAt) {
          formattedDate = new Date(parsed.exportedAt).toLocaleString();
        } else {
          formattedDate = new Date().toLocaleString();
        }
        
        setDeviceRestoreFilename(`Auto-Saved Cache (${formattedDate})`);
        setDeviceRestoreConfirm(true);
      } else {
        setErrorMsg('The stored backup data appears to be corrupted or invalid.');
        setTimeout(() => setErrorMsg(null), 4000);
      }
    } catch (err) {
      setErrorMsg('Failed to read status of stored backup.');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  const handleDeviceFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setDeviceRestoreFilename(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed.expenses) && Array.isArray(parsed.categories)) {
          setDeviceRestoreContent(content);
          setDeviceRestoreConfirm(true);
        } else {
          setErrorMsg('The selected JSON file does not appear to be a valid ExpenseTrack backup.');
          setDeviceRestoreContent(null);
          setDeviceRestoreConfirm(false);
          setTimeout(() => setErrorMsg(null), 5000);
        }
      } catch (err) {
        setErrorMsg('The selected file is not a valid JSON document.');
        setDeviceRestoreContent(null);
        setDeviceRestoreConfirm(false);
        setTimeout(() => setErrorMsg(null), 5000);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read the selected backup file.');
      setDeviceRestoreContent(null);
      setDeviceRestoreConfirm(false);
      setTimeout(() => setErrorMsg(null), 5000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDeviceRestoreConfirmExecute = () => {
    if (!deviceRestoreContent) return;

    const success = LocalDb.importDatabase(deviceRestoreContent);
    if (success) {
      setSuccessMsg('Your private database has been restored successfully!');
      setErrorMsg(null);
      setDeviceRestoreContent(null);
      setDeviceRestoreConfirm(false);
      setTimeout(() => {
        setSuccessMsg(null);
        window.location.reload();
      }, 1500);
    } else {
      setErrorMsg('Failed to restore database from backup file.');
      setTimeout(() => setErrorMsg(null), 3000);
    }
  };

  const cancelDeviceRestore = () => {
    setDeviceRestoreContent(null);
    setDeviceRestoreConfirm(false);
    setDeviceRestoreFilename('');
  };

  const triggerReset = () => {
    onDatabaseReset();
    setConfirmReset(false);
    setSuccessMsg('All custom user transactions have been purged!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="space-y-5 p-1" id="budget_settings_ui">
      {/* Category Limits Planner */}
      <div className="bg-[#111111] rounded-xl p-4 border border-white/5 shadow-2xs text-white animate-in fade-in duration-200">
        <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 font-sans">
              <DollarSign size={15} className="text-emerald-500" />
              Categories & Budgets
            </h3>
          </div>
          <div className="text-right">
            <span className="text-[9px] text-gray-500 block uppercase font-mono font-bold tracking-wider">Total Budget</span>
            <span className="text-sm font-bold font-mono text-emerald-400">{currencySymbol}{currentBudget.limitAmount.toLocaleString()}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCategoryManager(true)}
          className="w-full py-3 px-4 bg-emerald-950/20 hover:bg-emerald-950/30 border border-emerald-500/10 hover:border-emerald-500/30 text-emerald-400 hover:text-emerald-300 text-xs font-extrabold tracking-wider uppercase rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 shadow-sm"
        >
          <Sparkles size={13} className="animate-pulse" /> Edit Categories or Budgets or Add New Categories
        </button>

        {successMsg && !showCategoryManager && (
          <div className="mt-3 p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-lg flex items-center gap-1.5 font-sans">
            <CheckCircle size={14} className="text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && !showCategoryManager && (
          <div className="mt-3 p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-lg">
            <span>⚠️ {errorMsg}</span>
          </div>
        )}
      </div>

      {/* Main Categories & Budgets Dialogue Box Manager Overlay */}
      {showCategoryManager && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-lg flex items-center justify-center z-40 p-4 md:p-6 overflow-y-auto animate-in fade-in duration-250">
          <div className="w-full max-w-md bg-[#111111] border border-white/10 rounded-2xl p-6 space-y-5 text-white shadow-2xl relative my-auto animate-in zoom-in-95 duration-200" id="dialogue_categories_budgets_manager">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h4 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <DollarSign size={16} className="text-emerald-400" /> Categories & Budgets
                </h4>
              </div>
              <button 
                onClick={() => setShowCategoryManager(false)} 
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

            <div className="flex items-center justify-between bg-black/25 p-3 rounded-xl border border-white/5 font-sans">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Monthly Budget</span>
              <span className="text-base font-extrabold font-mono text-emerald-400">{currencySymbol}{currentBudget.limitAmount.toLocaleString()}</span>
            </div>

            {/* Master action to spawn a new creator form inline placed at the top */}
            {!editingCategory && (
              <button
                onClick={handleOpenCreateNew}
                className="w-full py-2.5 bg-emerald-950/20 hover:bg-emerald-950/40 border border-dashed border-emerald-500/30 text-emerald-400 hover:text-emerald-300 text-xs font-bold tracking-wider uppercase rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center"
              >
                <Plus size={14} className="stroke-[2.5]" /> Add New Category
              </button>
            )}

            {/* Categories scrollable deck list */}
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-0.5">
              {categories.filter(c => c.id !== 'cat_business_expense').map((cat) => {
                const displayLimit = cat.limit || 0;
                return (
                  <div 
                    key={cat.id} 
                    className="p-3 bg-black/40 rounded-xl border border-white/5 hover:border-white/10 flex items-center justify-between gap-2.5 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        cat.color.includes('/') ? cat.color : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {renderCategoryIcon(cat.icon, 16)}
                      </div>
                      <div className="min-w-0 text-xs">
                        <span className="font-bold text-gray-200 block truncate">{cat.name}</span>
                        <span className="text-[11px] text-emerald-400 font-bold font-mono block mt-0.5">
                          Limit: <span className="text-xs font-extrabold">{currencySymbol}{displayLimit.toLocaleString()}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleOpenEdit(cat)}
                        className="p-1.5 bg-[#1C1C1C] hover:bg-[#252525] hover:text-emerald-400 text-gray-400 rounded-lg cursor-pointer border border-white/5 transition-colors"
                        title="Edit category label or budget limit"
                      >
                        <Edit size={12} />
                      </button>
                      {cat.id !== 'cat_uncategorized' ? (
                        <button
                          onClick={() => handleDeleteClick(cat.id, cat.name)}
                          className="p-1.5 bg-[#1C1C1C]/60 hover:bg-rose-950/30 hover:text-rose-400 text-gray-500 rounded-lg cursor-pointer border border-white/5 transition-colors"
                          title="Delete category"
                        >
                          <Trash2 size={12} />
                        </button>
                      ) : (
                        <span 
                          className="p-1.5 bg-[#1C1C1C]/30 text-gray-600 rounded-lg border border-white/5 cursor-not-allowed opacity-40 select-none"
                          title="System default category. Cannot be deleted."
                        >
                          <Trash2 size={12} />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-white/5">
              <button
                type="button"
                onClick={() => setShowCategoryManager(false)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all border-0 cursor-pointer shadow-lg shadow-emerald-950/20 text-center"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal-like overlay for Editing/Adding Category - Elegant Full Screen Backdrop */}
      {editingCategory && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-lg flex items-center justify-center z-50 p-4 md:p-6 overflow-y-auto animate-in fade-in duration-250">
          <div className="w-full max-w-md bg-[#111111] border border-white/10 rounded-2xl p-6 space-y-5 text-white shadow-2xl relative my-auto animate-in zoom-in-95 duration-200" id="full_screen_category_builder">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">
                {editingCategory === 'new' ? 'Add New Category' : `Edit Category: ${editingCategory.name}`}
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
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 font-sans">Category Label</label>
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

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 font-sans">Monthly Budget Allocation</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-extrabold">{currencySymbol}</span>
                  <input 
                    type="number" 
                    min="0"
                    value={formLimit}
                    onChange={(e) => setFormLimit(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500 outline-hidden focus:border-emerald-500 focus:bg-[#0A0A0A]"
                    required
                  />
                </div>
              </div>

              {/* Icon selector preset grid */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 font-sans">Pick Icon Preset</label>
                <div className="grid grid-cols-8 gap-2 p-3 bg-black/45 rounded-xl border border-white/5 justify-items-center">
                  {ICON_PRESETS.map(iconName => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setFormIcon(iconName)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer border shrink-0 ${
                        formIcon === iconName 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 ring-1 ring-emerald-500/20 shadow-sm shadow-emerald-950/20' 
                          : 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border-white/5'
                      }`}
                      title={iconName}
                    >
                      {renderCategoryIcon(iconName, 18)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color preset grid selector */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 font-sans">Preset Theme Color</label>
                <div className="grid grid-cols-3 gap-2">
                  {COLOR_PRESETS.map(preset => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setFormColor(preset.value)}
                      className={`py-2 px-3 rounded-lg text-[10px] font-bold border flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                        formColor === preset.value
                          ? 'bg-white/15 text-white border-white/40 ring-1 ring-white/10'
                          : 'bg-black/30 text-gray-400 border-white/5 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: preset.hex }} />
                      <span>{preset.value.toUpperCase()}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs uppercase tracking-widest rounded-xl transition-all border border-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all border-0 cursor-pointer"
                >
                  {editingCategory === 'new' ? 'Add' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for Deleting Category */}
      {categoryToDelete && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-lg flex items-center justify-center z-50 p-4 animate-in fade-in duration-250">
          <div className="w-full max-w-sm bg-[#111111] border border-white/10 rounded-2xl p-6 text-center space-y-4 shadow-2xl relative my-auto animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            
            <div className="space-y-1">
              <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">
                Delete Category?
              </h4>
              <p className="text-[11px] text-gray-400 leading-normal">
                Are you sure you want to delete <strong className="text-white">"{categoryToDelete.name}"</strong>? 
                Any expenses currently tagged under this category will automatically become uncategorized.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs uppercase tracking-widest rounded-xl transition-all border border-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all border-0 cursor-pointer shadow-lg shadow-rose-950/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Currency Customization Preference Card */}
      <div className="bg-[#111111] text-slate-100 rounded-xl p-4 border border-white/5 shadow-2xs animate-in fade-in duration-200">
        <div className="flex items-center justify-between gap-2.5 mb-2">
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 font-sans">
              <DollarSign size={14} className="text-emerald-500" /> Active Currency Symbol
            </h3>
            <p className="text-[10px] text-gray-500 mt-0.5 font-sans">Configure currency notation used across components.</p>
          </div>
          <div className="text-right">
            <span className="text-[9px] text-gray-500 block uppercase font-mono font-bold tracking-wider">Active Icon</span>
            <span className="text-xs font-bold font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">{currencySymbol}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCurrencyManager(true)}
          className="w-full py-3 px-4 bg-emerald-950/20 hover:bg-emerald-950/30 border border-emerald-500/10 hover:border-emerald-500/30 text-emerald-400 hover:text-emerald-300 text-xs font-extrabold tracking-wider uppercase rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 shadow-sm"
        >
          <Sparkles size={13} className="text-emerald-500 animate-pulse" /> Change Currency Symbol
        </button>
      </div>

      {/* Main Currency Settings Dialogue Box Manager Overlay */}
      {showCurrencyManager && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-lg flex items-center justify-center z-40 p-4 md:p-6 overflow-y-auto animate-in fade-in duration-250">
          <div className="w-full max-w-md bg-[#111111] border border-white/10 rounded-2xl p-6 space-y-5 text-white shadow-2xl relative my-auto animate-in zoom-in-95 duration-200" id="dialogue_currency_manager">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h4 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <DollarSign size={16} className="text-emerald-400" /> Currency Settings
                </h4>
                <p className="text-[10px] text-gray-400 mt-0.5 font-sans">Select your local symbol for budgeting and lists</p>
              </div>
              <button 
                onClick={() => setShowCurrencyManager(false)} 
                className="text-gray-400 hover:text-white p-1.5 rounded-full cursor-pointer bg-white/5 hover:bg-white/10 border-0 transition-colors"
                title="Close currency setting"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center justify-between bg-black/25 p-3 rounded-xl border border-white/5 font-sans">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Active Symbol</span>
              <span className="text-base font-extrabold font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">{currencySymbol}</span>
            </div>

            <p className="text-[11px] text-gray-400 leading-normal font-sans">
              Select your local currency symbol to customize budget targets, transaction lists, and chart metrics across the application.
            </p>

            <div className="grid grid-cols-5 gap-2">
              {['$', '€', '£', '¥', '₹', '₪', '₩', 'Fr', 'A$', 'C$'].map((symbol) => (
                <button
                  key={symbol}
                  type="button"
                  onClick={() => onCurrencyChanged(symbol)}
                  className={`py-3 text-center font-mono font-bold text-xs rounded-xl transition-all border cursor-pointer active:scale-95 ${
                    currencySymbol === symbol
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-extrabold shadow-sm shadow-emerald-950/20'
                      : 'bg-black/20 border-white/5 hover:border-white/10 hover:bg-black/30 text-gray-400'
                  }`}
                >
                  {symbol}
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-white/5">
              <button
                type="button"
                onClick={() => setShowCurrencyManager(false)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all border-0 cursor-pointer shadow-lg shadow-emerald-950/20 text-center"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice Assistant Developer Settings Card */}
      {isDevMode && (
        <div className="bg-[#111111] text-slate-100 rounded-xl p-4 border border-white/5 shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5 font-mono">
              <Mic size={14} className="text-emerald-400" /> Voice Assistant (BETA)
            </h3>
            <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-bold uppercase tracking-wider font-mono">
              Advanced
            </span>
          </div>
          <p className="text-[11px] text-gray-400 leading-normal mb-4">
            Toggle the active conversational smart voice-processing engine. 
            When enabled, you can talk naturally to log entries quickly (e.g., <span className="text-emerald-400 italic font-medium font-mono">"Coffee 4 dollars yesterday"</span>).
          </p>
          
          <div className="bg-black/25 border border-white/5 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-lg border transition-all ${enableVoiceAssistant ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400' : 'bg-black/40 border-white/5 text-gray-500'}`}>
                {enableVoiceAssistant ? <Mic size={16} /> : <MicOff size={16} />}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-100">Voice Activation</p>
                <p className="text-[10px] text-gray-500 leading-tight select-none">
                  {enableVoiceAssistant ? 'Active and processing on device' : 'Completely disabled & offline'}
                </p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={() => onToggleVoiceAssistant && onToggleVoiceAssistant(!enableVoiceAssistant)}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer active:scale-95 ${
                enableVoiceAssistant 
                  ? 'bg-emerald-600/30 border-emerald-500/40 text-emerald-400 font-extrabold shadow-sm' 
                  : 'bg-zinc-800 border-white/10 hover:border-white/20 text-gray-300'
              }`}
            >
              {enableVoiceAssistant ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div>
      )}

      {/* Localized Architecture Notice */}
      <div className="bg-[#111111] text-slate-100 rounded-xl p-4 border border-white/5 shadow-2xs animate-in fade-in duration-200 delay-100">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5 font-sans">
          <Shield size={14} className="text-emerald-500" /> Backup or Restore from Your Device
        </h3>
        <p className="text-[11px] text-gray-400 leading-normal">
          All records remain privately saved on your device only
        </p>
        <div className="mt-3.5 pt-3.5 border-t border-white/5 grid grid-cols-2 gap-2 animate-in fade-in duration-200">
          <button
            onClick={handleExport}
            className="py-2 px-2.5 bg-emerald-950/20 hover:bg-emerald-950/30 border border-emerald-500/10 hover:border-emerald-500/30 text-emerald-400 hover:text-emerald-300 rounded-xl text-[10px] font-extrabold tracking-widest uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98"
          >
            <Download size={12} className="text-emerald-500" /> Backup to Device
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="py-2 px-2.5 bg-emerald-950/20 hover:bg-emerald-950/30 border border-emerald-500/10 hover:border-emerald-500/30 text-emerald-400 hover:text-emerald-300 rounded-xl text-[10px] font-extrabold tracking-widest uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98"
          >
            <Upload size={12} className="text-emerald-500" /> Restore from Device
          </button>
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          accept=".json" 
          onChange={handleDeviceFileSelect} 
          className="hidden" 
        />

        {deviceRestoreConfirm && (
          <div className="mt-3.5 p-3.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-1 text-left">
            <span className="block text-[11px] font-bold text-emerald-400">
              Target Restoration: <span className="font-mono text-slate-300 font-normal">{deviceRestoreFilename}</span>
            </span>
            <p className="text-[10px] text-gray-400 leading-normal">
              Are you sure you want to restore? This will replace all current expenses and categories on this browser with the data from this previous backup.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDeviceRestoreConfirmExecute}
                className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg cursor-pointer transition-all border-0"
              >
                Yes, Overwrite & Restore
              </button>
              <button
                type="button"
                onClick={cancelDeviceRestore}
                className="py-1 px-2.5 bg-white/10 hover:bg-white/15 text-slate-300 text-[10px] font-bold rounded-lg cursor-pointer transition-all border-0"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Google Drive Cloud Backup */}
      <div className="bg-[#111111] text-slate-100 rounded-xl p-4 border border-white/5 shadow-2xs animate-in fade-in duration-200 delay-150">
        <h3 className="text-xs font-extrabold uppercase tracking-widest mb-2 text-yellow-500 flex items-center gap-1.5 font-mono">
          <Cloud size={14} className="text-yellow-500 animate-pulse" /> Google Drive Cloud Backup
        </h3>
        <p className="text-[11px] text-gray-400 leading-normal">
          Securely save your ExpenseTrack database to your personal Google Drive storage. <span className="text-yellow-500/90 font-medium">This is the safest option to ensure you never lose your records if your phone is lost or damaged beyond repair</span>, or when switching to a new device. This data is private and locked to your account.
        </p>

        {cloudSuccess && (
          <div className="mt-3 p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] rounded flex items-center gap-1 font-sans animate-in fade-in">
            <CheckCircle size={12} className="text-emerald-400" />
            <span>{cloudSuccess}</span>
          </div>
        )}

        {cloudError && (
          <div className="mt-3 p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] rounded flex items-center gap-1 font-sans animate-in fade-in">
            <AlertTriangle size={12} className="text-rose-400" />
            <span>{cloudError}</span>
          </div>
        )}

        <div className="mt-4">
          {!googleUser || !driveToken ? (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={driveLoading}
              className="w-full py-2 bg-white hover:bg-gray-150 text-black border-0 rounded-xl text-xs font-bold font-sans flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <div className="w-4 h-4">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              </div>
              <span className="font-semibold text-[11px] text-[#1F1F1F]">
                {driveLoading ? "Connecting..." : "Sign in with Google"}
              </span>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="p-2 border border-white/5 bg-black/40 rounded-lg flex items-center justify-between text-[11px]">
                <div className="truncate pr-2">
                  <span className="text-gray-500 block text-[9px] uppercase font-mono">Google Account</span>
                  <span className="font-bold text-gray-300 font-sans block truncate max-w-[150px]">{googleUser.email}</span>
                </div>
                <button
                  type="button"
                  onClick={handleGoogleSignOut}
                  className="px-2 py-1 hover:bg-rose-500/10 text-rose-400 border border-white/5 hover:border-rose-500/10 rounded text-[9px] uppercase font-bold transition-all bg-transparent cursor-pointer shrink-0"
                >
                  Disconnect
                </button>
              </div>

              {cloudBackupInfo ? (
                <div className="p-2.5 bg-black/20 border border-white/5 rounded-lg text-[11px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Cloud Backup File</span>
                    <span className="font-mono text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1 rounded">Found</span>
                  </div>
                  <div className="text-gray-400">
                    <span className="block mt-0.5 max-w-[200px] truncate">File name: <strong className="text-gray-300">{cloudBackupInfo.name}</strong></span>
                    <span className="block mt-0.5 text-gray-500 font-mono text-[10px]">
                      Saved: {cloudBackupInfo.modifiedTime ? new Date(cloudBackupInfo.modifiedTime).toLocaleString() : 'Recently'}
                    </span>
                  </div>
                </div>
              ) : driveLoading ? (
                <div className="p-2.5 bg-black/20 border border-white/5 rounded-lg text-center text-[10px] text-gray-400 font-mono italic animate-pulse">
                  Querying GDrive for backups...
                </div>
              ) : (
                <div className="p-2.5 bg-black/20 border border-white/5 rounded-lg text-[10px] text-gray-500 text-center font-bold uppercase tracking-wide">
                  No backup file exists on your Google Drive
                </div>
              )}

              <div className="space-y-2 mt-2">
                {confirmCloudBackup && (
                  <div className="p-2.5 bg-yellow-950/20 border border-yellow-500/20 rounded-lg text-xs space-y-2 animate-in fade-in">
                    <span className="block text-[10px] text-yellow-400 font-bold leading-normal">
                      Upload local database to Google Drive? This will overwrite your existing cloud backup.
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCloudBackup}
                        disabled={driveLoading}
                        className="py-1 px-2.5 bg-yellow-600 hover:bg-yellow-500 text-black text-[10px] font-bold rounded-md cursor-pointer transition-all border-0"
                      >
                        Yes, Overwrite Backup
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmCloudBackup(false)}
                        className="py-1 px-2.5 bg-white/10 hover:bg-white/20 text-slate-300 text-[10px] font-bold rounded-md cursor-pointer transition-all border-0"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {confirmCloudRestore && (
                  <div className="p-2.5 bg-emerald-950/20 border border-emerald-500/20 rounded-lg text-xs space-y-2 animate-in fade-in">
                    <span className="block text-[10px] text-emerald-400 font-bold leading-normal">
                      Restore from Google Drive backup? This replaces all current expenses on this browser with the cloud copy.
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCloudRestore}
                        disabled={driveLoading}
                        className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-md cursor-pointer transition-all border-0"
                      >
                        Yes, Restore Now
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmCloudRestore(false)}
                        className="py-1 px-2.5 bg-white/10 hover:bg-white/20 text-slate-300 text-[10px] font-bold rounded-md cursor-pointer transition-all border-0"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {!confirmCloudBackup && !confirmCloudRestore && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleCloudBackup}
                      disabled={driveLoading}
                      className="py-1.5 px-2 bg-yellow-950/20 hover:bg-yellow-950/40 border border-yellow-500/20 text-yellow-400 text-[10px] font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:pointer-events-none transition-all"
                    >
                      <CloudUpload size={12} />
                      <span>Update Backup</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCloudRestore}
                      disabled={driveLoading || !cloudBackupInfo}
                      className="py-1.5 px-2 bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-500/25 text-emerald-400 text-[10px] font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:pointer-events-none transition-all"
                    >
                      <CloudDownload size={12} />
                      <span>Restore Now</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>



      {/* Database Purge Options */}
      <div className="bg-rose-950/10 border border-rose-500/10 rounded-xl p-4">
        <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5 font-sans">
          <AlertTriangle size={15} /> Dangerous Zone
        </h4>
        <p className="text-[11px] text-gray-400 mt-1 leading-normal">
          Purge all records. This simulates the initial, completely empty database state a user gets immediately after installing from the Google Play Store.
        </p>

        <div className="mt-3.5">
          {!confirmReset ? (
            <button
              onClick={() => setConfirmReset(true)}
              className="py-1.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 font-bold uppercase tracking-wider text-[10px] rounded-lg transition-colors cursor-pointer"
            >
              Reset to Empty Initial Database
            </button>
          ) : (
            <div className="space-y-2">
              <span className="block text-[10px] font-bold text-rose-400">Are you absolutely sure? All local expense data gets deleted forever!</span>
              <div className="flex gap-2">
                <button
                  onClick={triggerReset}
                  className="py-1 px-2.5 bg-rose-600 text-slate-100 text-xs font-bold rounded-md cursor-pointer transition-all border-0"
                >
                  Yes, Purge Now
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="py-1 px-2.5 bg-[#1C1C1C] hover:bg-[#252525] text-gray-300 text-xs font-semibold rounded-md cursor-pointer transition-all border-0"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>


    </div>
  );
}

// ----------------------------------------------------
// HIGH-FIDELITY LIVE PREVIEW SUBCOMPONENTS
// ----------------------------------------------------

interface ActiveDashboardLiveProps {
  categories: Category[];
  currencySymbol: string;
  totalSpent: number;
  totalLimit: number;
  percentSpent: number;
  remainingAmount: number;
  monthName: string;
  currentMonthExpenses: any[];
}

function RenderActiveDashboardLive({
  categories,
  currencySymbol,
  totalSpent,
  totalLimit,
  percentSpent,
  remainingAmount,
  monthName,
  currentMonthExpenses
}: ActiveDashboardLiveProps) {
  // Let's calculate category stats for rendering
  const categoryStats = useMemo(() => {
    const stats: Record<string, { total: number; limit: number; name: string; color: string }> = {};
    categories.filter(c => c.id !== 'cat_business_expense').forEach(c => {
      stats[c.id] = { total: 0, limit: c.limit || 0, name: c.name, color: c.color };
    });
    currentMonthExpenses.forEach(e => {
      if (stats[e.category]) {
        stats[e.category].total += e.amount;
      }
    });
    return Object.values(stats).filter(s => s.total > 0 || s.limit > 0);
  }, [categories, currentMonthExpenses]);

  // Determine status message
  const statusInfo = useMemo(() => {
    if (percentSpent >= 100) {
      return {
        title: "Over Budget Limit!",
        desc: "Discretionary expenses have exceeded set goals. Limit your expenditures immediately.",
        color: "text-rose-400 border-rose-500/20 bg-rose-500/5"
      };
    } else if (percentSpent >= 80) {
      return {
        title: "Approaching Limit",
        desc: "You have used more than 80% of discretionary limits. Control optional purchases.",
        color: "text-amber-400 border-amber-500/20 bg-amber-500/5"
      };
    } else {
      return {
        title: "Looking Good",
        desc: "Total spending is safe and within your designated target.",
        color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5"
      };
    }
  }, [percentSpent]);

  return (
    <div className="w-full max-w-sm mx-auto bg-[#0A0A0A] rounded-3xl border border-white/10 shadow-2xl p-5 overflow-hidden flex flex-col gap-4 font-sans text-slate-200 text-left">
      {/* Device Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <span className="text-[10px] font-bold text-emerald-400">ET</span>
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#eeeeee]">ExpenseTrack Live</span>
        </div>
        <span className="text-[9px] font-mono font-bold bg-white/5 px-2 py-0.5 rounded text-gray-500 uppercase">
          Device Frame: Dashboard
        </span>
      </div>

      {/* Selected Month switcher placeholder */}
      <div className="bg-[#111111] p-2.5 rounded-xl border border-white/5 flex items-center justify-between">
        <span className="text-[10px] font-medium text-gray-500 select-none">◀ Prev</span>
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-extrabold text-white">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{monthName}</span>
        </div>
        <span className="text-[10px] font-medium text-gray-500 select-none">Next ▶</span>
      </div>

      {/* Main Budget Circular gauge representation */}
      <div className="bg-[#111111] p-4 rounded-2xl border border-white/5">
        <div className="grid grid-cols-12 gap-3 items-center">
          <div className="col-span-5 flex flex-col items-center justify-center">
            <div className="relative w-20 h-20 flex items-center justify-center rounded-full border-4 border-[#1c1c1c] bg-black/40">
              <span className={`absolute inset-0 rounded-full border-4 border-transparent ${
                percentSpent >= 100 ? 'border-t-rose-500 border-r-rose-400' :
                percentSpent >= 80 ? 'border-t-amber-500 border-r-amber-400' : 'border-t-emerald-500 border-r-emerald-400'
              }`} style={{ transform: `rotate(${(percentSpent / 100) * 180}deg)` }}></span>
              <div className="text-center z-10">
                <span className="text-lg font-mono font-bold text-white">{percentSpent}%</span>
                <p className="text-[8px] text-gray-500 font-bold uppercase tracking-wider font-mono">Spent</p>
              </div>
            </div>
          </div>

          <div className="col-span-7 space-y-1.5">
            <div>
              <span className="text-[9px] font-semibold text-gray-400 block">Spent this month</span>
              <span className="text-2xl font-mono font-extrabold text-white block leading-none">{currencySymbol}{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex gap-3 border-t border-[#1C1C1C] pt-1.5">
              <div>
                <span className="text-[8px] font-bold text-gray-550 uppercase tracking-tight block">Budget Limit</span>
                <span className="text-[10px] font-bold text-gray-300 font-mono">{currencySymbol}{totalLimit.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[8px] font-bold text-gray-555 uppercase tracking-tight block">Available</span>
                <span className={`text-[10px] font-extrabold font-mono ${remainingAmount >= 0 ? 'text-emerald-404' : 'text-rose-404'}`}>
                  {currencySymbol}{remainingAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Status Bar inside mockup */}
        <div className={`mt-3 p-2 border rounded-xl text-[10px] flex items-start gap-1.5 ${statusInfo.color}`}>
          <AlertTriangle size={12} className="shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block text-[10px]">{statusInfo.title}</span>
            <p className="text-[9px] leading-tight text-gray-450 mt-0.5">{statusInfo.desc}</p>
          </div>
        </div>
      </div>

      {/* Category Progress Bars */}
      <div className="bg-[#111111] p-3.5 rounded-2xl border border-white/5 flex-grow min-h-[160px] max-h-[220px] overflow-y-auto space-y-2.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Category Budgets</span>
          <span className="text-[9px] font-mono text-emerald-400">Live limits</span>
        </div>

        {categoryStats.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-[10px]">
            No discretionary limits configured.
          </div>
        ) : (
          categoryStats.map((stat, i) => {
            const ratio = stat.limit > 0 ? Math.min(Math.round((stat.total / stat.limit) * 100), 100) : 0;
            return (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-[10px] leading-none">
                  <span className="font-bold text-gray-200">{stat.name}</span>
                  <span className="font-mono text-gray-400 font-medium">
                    {currencySymbol}{stat.total.toFixed(0)} <span className="text-gray-650 font-bold">/ {currencySymbol}{stat.limit.toFixed(0)}</span>
                  </span>
                </div>
                <div className="w-full bg-black/50 border border-white/5 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      ratio >= 100 ? 'bg-rose-500' : ratio >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} 
                    style={{ width: `${ratio}%` }} 
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

interface AnalyticsTrendsLiveProps {
  categories: Category[];
  currencySymbol: string;
  currentMonthExpenses: any[];
  monthName: string;
}

function RenderAnalyticsTrendsLive({
  categories,
  currencySymbol,
  currentMonthExpenses,
  monthName
}: AnalyticsTrendsLiveProps) {
  // Compute line graph data
  const trendData = useMemo(() => {
    const daysInMonth = 30;
    const days = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      spent: 0,
    }));

    currentMonthExpenses.forEach(e => {
      const dayPart = parseInt(e.date.split('-')[2]);
      if (dayPart >= 1 && dayPart <= daysInMonth) {
        days[dayPart - 1].spent += e.amount;
      }
    });

    let cumulative = 0;
    return days.map(d => {
      cumulative += d.spent;
      return {
        label: `Day ${d.day}`,
        Amount: Math.round(cumulative)
      };
    });
  }, [currentMonthExpenses]);

  // Compute pie chart data
  const pieData = useMemo(() => {
    const stats: Record<string, { total: number; name: string; color: string }> = {};
    categories.filter(c => c.id !== 'cat_business_expense').forEach(c => {
      stats[c.id] = { total: 0, name: c.name, color: c.color };
    });
    currentMonthExpenses.forEach(e => {
      if (stats[e.category]) {
        stats[e.category].total += e.amount;
      }
    });

    const list = Object.values(stats).filter(s => s.total > 0).map(s => {
      let hexColor = '#10b981';
      if (s.color.includes('rose')) hexColor = '#f43f5e';
      else if (s.color.includes('purple')) hexColor = '#8b5cf6';
      else if (s.color.includes('amber')) hexColor = '#f59e0b';
      else if (s.color.includes('blue')) hexColor = '#3b82f6';
      else if (s.color.includes('slate')) hexColor = '#64748b';

      return {
        name: s.name,
        value: s.total,
        color: hexColor
      };
    });

    return list.length > 0 ? list : [{ name: 'Pre-budget tests', value: 350, color: '#10b981' }];
  }, [categories, currentMonthExpenses]);

  return (
    <div className="w-full max-w-sm mx-auto bg-[#0A0A0A] rounded-3xl border border-white/10 shadow-2xl p-5 overflow-hidden flex flex-col gap-4 font-sans text-slate-200 text-left">
      {/* Target Device Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <span className="text-[10px] font-bold text-emerald-400">ET</span>
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#eeeeee]">ExpenseTrack Live</span>
        </div>
        <span className="text-[9px] font-mono font-bold bg-white/5 px-2 py-0.5 rounded text-gray-500 uppercase">
          Device Frame: Analytics
        </span>
      </div>

      {/* Selected month banner layout */}
      <div className="text-[10px] font-bold text-[#eeeeee] uppercase tracking-widest flex items-center gap-1.5 font-sans leading-none">
        <TrendingUp size={13} className="text-emerald-500" />
        <span>Insights Summary ({monthName})</span>
      </div>

      {/* Trend line graph chart */}
      <div className="bg-[#111111] p-3 rounded-2xl border border-white/5">
        <h4 className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2 font-mono">
          Cumulative Spending
        </h4>
        <div className="h-32 w-full text-slate-100 font-mono text-[8px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <LineChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="label" stroke="#64748b" tickSize={4} />
              <YAxis stroke="#64748b" tickSize={4} />
              <ReTooltip 
                contentStyle={{ backgroundColor: '#0A0A0A', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }}
                labelStyle={{ fontSize: '9px', fontWeight: 'bold' }}
                itemStyle={{ fontSize: '9px', color: '#10b981' }}
              />
              <Line 
                type="monotone" 
                dataKey="Amount" 
                stroke="#10b981" 
                strokeWidth={2.5} 
                dot={{ r: 1.5, fill: '#34d399', strokeWidth: 0 }} 
                activeDot={{ r: 3 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pie Chart category distribution card */}
      <div className="bg-[#111111] p-3.5 rounded-2xl border border-white/5 flex-grow max-h-[160px] overflow-y-auto">
        <h4 className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2 font-mono">
          wallet share breakdown
        </h4>
        <div className="grid grid-cols-12 gap-3 items-center">
          <div className="col-span-4 h-24 relative">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <RePieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={18}
                  outerRadius={32}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </RePieChart>
            </ResponsiveContainer>
          </div>
          <div className="col-span-8 space-y-1.5 overflow-y-auto max-h-24">
            {pieData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-[9px] leading-none">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="font-semibold text-gray-300 truncate w-20 block">{item.name}</span>
                <span className="font-mono text-gray-500 font-bold ml-auto">{currencySymbol}{item.value.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface BudgetsCurrencyLiveProps {
  categories: Category[];
  currencySymbol: string;
  totalLimit: number;
}

function RenderBudgetsCurrencyLive({
  categories,
  currencySymbol,
  totalLimit
}: BudgetsCurrencyLiveProps) {
  return (
    <div className="w-full max-w-sm mx-auto bg-[#0A0A0A] rounded-3xl border border-white/10 shadow-2xl p-5 overflow-hidden flex flex-col gap-4 font-sans text-slate-200 text-left">
      {/* Target Device Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <span className="text-[10px] font-bold text-emerald-400">ET</span>
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#eeeeee]">ExpenseTrack Live</span>
        </div>
        <span className="text-[9px] font-mono font-bold bg-white/5 px-2 py-0.5 rounded text-gray-500 uppercase">
          Device Frame: Settings
        </span>
      </div>

      {/* Currency setup and dynamic limits */}
      <div className="bg-[#111111] p-3.5 rounded-2xl border border-white/5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-white">Active Currency</h4>
            <p className="text-[8px] text-gray-500 mt-0.5">Applies across all views</p>
          </div>
          <span className="text-xs font-mono font-extrabold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-lg">
            {currencySymbol} (USD-Standard)
          </span>
        </div>
      </div>

      {/* Allocated dynamic Master Limit */}
      <div className="bg-[#111111] p-4 rounded-2xl border border-white/5 text-center">
        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block font-mono">Dynamic Master Goal</span>
        <span className="text-3xl font-mono font-extrabold text-emerald-400 block mt-1 leading-none">{currencySymbol}{totalLimit.toLocaleString()}</span>
        <p className="text-[8px] text-gray-500 italic mt-1 leading-normal">Derived dynamically by the sum of individual category budget sub-limits.</p>
      </div>

      {/* Category individual limits lists */}
      <div className="bg-[#111111] p-3.5 rounded-2xl border border-white/5 flex-grow space-y-2.5 max-h-[180px] overflow-y-auto">
        <div className="flex items-center gap-1.5 border-b border-white/5 pb-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#eeeeee]">Category Budgets</span>
        </div>

        {categories.map((cat, idx) => (
          <div key={idx} className="flex items-center justify-between text-[10px] bg-black/30 p-2 rounded-xl border border-white/5 leading-none">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">{cat.icon === 'Utensils' ? '🍔' : cat.icon === 'ShoppingBag' ? '🛒' : cat.icon === 'Film' ? '🍿' : cat.icon === 'Car' ? '🚗' : '📁'}</span>
              <span className="font-bold text-gray-300">{cat.name}</span>
            </div>
            <span className="font-mono font-extrabold text-emerald-400">
              {currencySymbol}{cat.limit ? cat.limit.toLocaleString() : '0'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface FinancePDFReportLiveProps {
  categories: Category[];
  currencySymbol: string;
  localExpenses: any[];
  currentMonthPrefix: string;
  monthName: string;
}

function RenderFinancePDFReportLive({
  categories,
  currencySymbol,
  localExpenses,
  currentMonthPrefix,
  monthName
}: FinancePDFReportLiveProps) {
  // Grab current month expenses, or use fallback mock database if none logged
  const activeReportRows = useMemo(() => {
    let list = localExpenses.filter(e => e.date.startsWith(currentMonthPrefix));
    if (list.length === 0) {
      list = [
        { id: '1', date: `${currentMonthPrefix}-02`, note: 'Acme General Store Purchase', category: 'cat_groceries', paymentMethod: 'card', amount: 98.45 },
        { id: '2', date: `${currentMonthPrefix}-08`, note: 'Corporate Logistics Courier', category: 'cat_entertainment', paymentMethod: 'card', amount: 155.00 },
        { id: '3', date: `${currentMonthPrefix}-14`, note: 'Strategic Lunch and Diner Meetup', category: 'cat_restaurants', paymentMethod: 'digital_wallet', amount: 112.50 },
        { id: '4', date: `${currentMonthPrefix}-20`, note: 'Subway Commute Monthly Pass', category: 'cat_business_expense', paymentMethod: 'cash', amount: 45.00 },
      ];
    }
    return list.slice(0, 5);
  }, [localExpenses, currentMonthPrefix]);

  const totalSpentReport = useMemo(() => {
    return activeReportRows.reduce((sum, e) => sum + e.amount, 0);
  }, [activeReportRows]);

  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  return (
    <div className="w-full max-w-xl mx-auto bg-stone-50 text-slate-800 rounded-2xl p-5 md:p-6 shadow-2xl border border-stone-200/80 font-sans text-left leading-normal animate-in fade-in zoom-in-95 duration-200">
      {/* Letterhead Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-300 pb-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1 bg-[#0F766E]/10 p-1 px-2.5 rounded-lg w-fit">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#0F766E] flex items-center justify-center font-bold text-[8px] text-white">E</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-[#0F766E]">ExpenseTrack Statement</span>
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight leading-snug">Business Expense Ledger</h2>
        </div>

        <div className="bg-emerald-100/80 text-emerald-800 text-[8px] font-black uppercase tracking-wider px-2.5 py-1 rounded border border-emerald-250 flex items-center gap-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Audit-Ready Standard</span>
        </div>
      </div>

      {/* Document Information Grid */}
      <div className="grid grid-cols-2 gap-3 text-[11px] py-1">
        <div>
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block font-mono">statement period</span>
          <span className="font-bold text-slate-800 block mt-0.5">{monthName}</span>
          <span className="text-slate-500 block text-[9px] font-mono mt-0.5">Date Mapped: {todayStr}</span>
        </div>
        <div className="text-right">
          {/* Empty right-hand side */}
        </div>
      </div>

      {/* Key Financial KPIs */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-slate-100 border border-slate-200/85 p-2 rounded-lg">
          <span className="text-[8px] font-extrabold text-slate-450 uppercase tracking-wider block font-mono">Total Ledger</span>
          <span className="text-sm font-extrabold text-slate-905 font-mono block mt-0.5 leading-none">{currencySymbol}{totalSpentReport.toFixed(2)}</span>
        </div>
        <div className="bg-slate-100 border border-slate-200/85 p-2 rounded-lg">
          <span className="text-[8px] font-extrabold text-slate-450 uppercase tracking-wider block font-mono">Transactions count</span>
          <span className="text-sm font-extrabold text-slate-905 font-mono block mt-0.5 leading-none">{activeReportRows.length} Items</span>
        </div>
        <div className="bg-teal-50 border border-teal-200/70 p-2 rounded-lg">
          <span className="text-[8px] font-extrabold text-teal-600 uppercase tracking-wider block font-mono">Deductible rate</span>
          <span className="text-sm font-extrabold text-teal-805 block mt-0.5 leading-none">100% Taxable</span>
        </div>
      </div>

      {/* Transaction Records Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white mt-1">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-500 text-[8px] uppercase tracking-wider font-bold">
              <th className="p-2 pl-3">Date</th>
              <th className="p-2">Merchant Name / details</th>
              <th className="p-2">Category</th>
              <th className="p-2">Method</th>
              <th className="p-2 pr-3 text-right font-mono">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-600">
            {activeReportRows.map((e, idx) => {
              const catObj = categories.find(c => c.id === e.category);
              return (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="p-2 pl-3 text-[9px] font-mono text-slate-450 leading-none">{e.date}</td>
                  <td className="p-2 font-bold text-slate-900 truncate max-w-[130px] leading-tight">{e.note}</td>
                  <td className="p-2 leading-none"><span className="text-[8px] font-extrabold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-600 uppercase tracking-wide">{catObj ? catObj.name : "Other Option"}</span></td>
                  <td className="p-2 text-[9px] text-slate-500 uppercase font-semibold leading-none">{e.paymentMethod === 'card' ? 'CARD' : e.paymentMethod === 'digital_wallet' ? 'WALLET' : 'CASH'}</td>
                  <td className="p-2 pr-3 text-right font-mono font-bold text-slate-900 leading-none">{currencySymbol}{e.amount.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Report Footer details and audit Signature line */}
      <div className="flex justify-between items-center bg-slate-100/50 border border-slate-200/50 rounded-xl p-3 text-[9px] text-slate-500 mt-2">
        <div />
        <div className="text-right flex flex-col items-end shrink-0 leading-tight">
          <span className="text-[7px] font-bold text-slate-450 uppercase tracking-widest block font-mono">Accounting Check</span>
          <span className="font-serif italic font-bold text-slate-900 block mt-1 text-xs">Ledger Verified</span>
          <span className="w-16 h-px bg-slate-350 my-1 block" />
          <span className="text-[7px] text-slate-400 font-mono uppercase tracking-wide">System Signed</span>
        </div>
      </div>
    </div>
  );
}
