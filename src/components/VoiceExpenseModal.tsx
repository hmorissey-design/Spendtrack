/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  Check, 
  X, 
  Sparkles, 
  ArrowRight, 
  CreditCard, 
  Banknote, 
  AlertCircle,
  Zap,
  Pause,
  Play
} from 'lucide-react';
import { Category, Expense, SavingsGoal } from '../types';
import { parseVoiceTransaction, ParsedVoiceExpense } from '../utils/voiceParser';
import { LocalDb } from '../utils/db';
import { cleanVendorName } from '../utils/notificationParser';

interface VoiceExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  savingsGoals?: SavingsGoal[];
  currencySymbol: string;
  onConfirmExpense: (expense: Omit<Expense, 'id'>) => void;
  onOpenFullFormWithPrefill: (prefill: {
    amount?: number;
    vendor?: string;
    category?: string;
    paymentMethod?: 'cash' | 'card';
    note?: string;
  }) => void;
}

export const VoiceExpenseModal: React.FC<VoiceExpenseModalProps> = ({
  isOpen,
  onClose,
  categories,
  savingsGoals = [],
  currencySymbol,
  onConfirmExpense,
  onOpenFullFormWithPrefill
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasSpeechSupport, setHasSpeechSupport] = useState(true);

  // Auto-Enter setting: defaults to TRUE as requested ("Can we have it auto entered")
  const [autoEnter, setAutoEnter] = useState<boolean>(() => {
    const saved = localStorage.getItem('expensetrack_voice_auto_enter');
    return saved !== 'false';
  });

  // Countdown state for auto-save
  const [autoSaveCountdown, setAutoSaveCountdown] = useState<number | null>(null);
  const countdownTimerRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);

  // Editable parsed values
  const [parsed, setParsed] = useState<ParsedVoiceExpense | null>(null);
  const [editedAmount, setEditedAmount] = useState<string>('');
  const [editedVendor, setEditedVendor] = useState<string>('');
  const [editedCategory, setEditedCategory] = useState<string>('');
  const [editedPaymentMethod, setEditedPaymentMethod] = useState<'cash' | 'card'>('card');

  // Manual fallback input if speech API is unavailable or user prefers typing
  const [manualInput, setManualInput] = useState('');

  const recognitionRef = useRef<any>(null);

  // Keep a synchronous ref of the latest extracted data to prevent stale closures during onend/timer
  const latestDataRef = useRef({
    amount: editedAmount,
    vendor: editedVendor,
    category: editedCategory,
    paymentMethod: editedPaymentMethod,
    parsed: null as ParsedVoiceExpense | null,
    autoEnter: true
  });

  useEffect(() => {
    latestDataRef.current = {
      amount: editedAmount,
      vendor: editedVendor,
      category: editedCategory,
      paymentMethod: editedPaymentMethod,
      parsed,
      autoEnter
    };
  }, [editedAmount, editedVendor, editedCategory, editedPaymentMethod, parsed, autoEnter]);

  // Clean up timers on unmount or modal close
  const clearAutoSaveTimer = () => {
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setAutoSaveCountdown(null);
  };

  useEffect(() => {
    return () => {
      clearAutoSaveTimer();
      stopListening();
    };
  }, []);

  // Check Web Speech API support & start listening on open
  useEffect(() => {
    if (!isOpen) {
      clearAutoSaveTimer();
      stopListening();
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setHasSpeechSupport(false);
      setErrorMessage('Speech recognition is not natively supported in this browser. You can type or use your keyboard microphone below.');
      return;
    }

    setHasSpeechSupport(true);
    setErrorMessage(null);
    startListening();

    return () => {
      clearAutoSaveTimer();
      stopListening();
    };
  }, [isOpen]);

  // Execute the final save
  const executeSave = () => {
    clearAutoSaveTimer();
    const cur = latestDataRef.current;
    const finalAmount = parseFloat(cur.amount);

    if (isNaN(finalAmount) || finalAmount <= 0) {
      setErrorMessage('Please enter a valid expense amount before saving.');
      return;
    }

    const finalVendor = cur.vendor.trim() || 'Voice Expense';
    const finalCategory = cur.category || categories[0]?.id || 'cat_uncategorized';
    const today = new Date().toISOString().split('T')[0];

    // Auto-learn this vendor and category combination for future voice & wallet entries
    if (finalVendor && !/^(voice|expense|transaction)/i.test(finalVendor) && !finalCategory.startsWith('SAVINGS_')) {
      try {
        const cleaned = cleanVendorName(finalVendor);
        if (cleaned && cleaned.length >= 2 && !/^\d+$/.test(cleaned) && !/^(cash|card|dollars?|bucks?)$/i.test(cleaned)) {
          LocalDb.saveVendorRule({
            vendorPattern: cleaned.toLowerCase().trim(),
            displayName: cleaned.trim(),
            categoryId: finalCategory,
            autoPost: true
          });
        }
      } catch (e) {
        console.warn('Could not auto-save learned vendor rule:', e);
      }
    }

    onConfirmExpense({
      amount: finalAmount,
      category: finalCategory,
      paymentMethod: cur.paymentMethod,
      date: today,
      note: finalVendor,
      createdAt: Date.now()
    });

    onClose();
  };

  // Schedule auto-save countdown if amount is present
  const scheduleAutoSaveIfReady = (delayMs: number = 1200) => {
    if (!latestDataRef.current.autoEnter) return;

    clearAutoSaveTimer();

    // Check if we have an amount
    const amt = parseFloat(latestDataRef.current.amount);
    if (isNaN(amt) || amt <= 0) return;

    const totalSeconds = delayMs / 1000;
    setAutoSaveCountdown(totalSeconds);

    const startTime = Date.now();
    countdownIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = Math.max(0, Math.round((totalSeconds - elapsed) * 10) / 10);
      setAutoSaveCountdown(remaining);
    }, 100);

    countdownTimerRef.current = setTimeout(() => {
      executeSave();
    }, delayMs);
  };

  const startListening = () => {
    clearAutoSaveTimer();
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      stopListening();

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage(null);
        setTranscript('');
        setInterimTranscript('');
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let currentFinal = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            currentFinal += event.results[i][0].transcript;
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }

        if (currentFinal) {
          setTranscript(prev => (prev ? prev + ' ' : '') + currentFinal);
        }
        setInterimTranscript(currentInterim);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition event error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setErrorMessage('Microphone access was denied. Please allow microphone permissions in your browser or device settings.');
        } else if (event.error === 'no-speech') {
          setErrorMessage('No speech detected. Tap the microphone and try again.');
        } else {
          setErrorMessage(`Voice capture notice: ${event.error}. You can retry or type below.`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        // When speech finishes naturally, auto-save if amount was extracted!
        setTimeout(() => {
          scheduleAutoSaveIfReady(1200);
        }, 150);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.warn('Failed to start speech recognition:', err);
      setIsListening(false);
      setErrorMessage('Could not activate microphone. Tap below to retry or type directly.');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  // Re-parse whenever transcript changes or manual text is entered
  useEffect(() => {
    const textToParse = transcript || manualInput;
    if (!textToParse.trim()) {
      setParsed(null);
      return;
    }

    const result = parseVoiceTransaction(textToParse, categories, savingsGoals);
    setParsed(result);

    if (result.amount !== undefined) {
      setEditedAmount(result.amount.toString());
    }
    if (result.vendor) {
      setEditedVendor(result.vendor);
    }
    if (result.category) {
      setEditedCategory(result.category);
    }
    if (result.paymentMethod) {
      setEditedPaymentMethod(result.paymentMethod);
    }
  }, [transcript, manualInput, categories, savingsGoals]);

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      setTranscript(manualInput.trim());
      // If auto-enter is on, trigger auto-save after manual parse
      setTimeout(() => {
        scheduleAutoSaveIfReady(1200);
      }, 200);
    }
  };

  const handleOpenFullForm = () => {
    clearAutoSaveTimer();
    const finalAmount = parseFloat(editedAmount);
    onOpenFullFormWithPrefill({
      amount: !isNaN(finalAmount) && finalAmount > 0 ? finalAmount : undefined,
      vendor: editedVendor.trim() || undefined,
      category: editedCategory || undefined,
      paymentMethod: editedPaymentMethod,
      note: transcript || manualInput || editedVendor.trim() || undefined
    });
    onClose();
  };

  const toggleAutoEnter = () => {
    const next = !autoEnter;
    setAutoEnter(next);
    localStorage.setItem('expensetrack_voice_auto_enter', String(next));
    if (!next) {
      clearAutoSaveTimer();
    } else if (parsed && parsed.amount) {
      scheduleAutoSaveIfReady(1200);
    }
  };

  const activeDisplayText = transcript || interimTranscript || manualInput;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-[#121214] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-950/40 text-white">
              <Mic size={16} className={isListening ? 'animate-pulse' : ''} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Voice Expense
                </h3>
                {/* Auto-Enter Toggle Switch right beside the header */}
                <button
                  type="button"
                  onClick={toggleAutoEnter}
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-tight flex items-center gap-1 border transition-all cursor-pointer select-none active:scale-95 ${
                    autoEnter
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30'
                      : 'bg-white/5 border-white/15 text-gray-400 hover:bg-white/10 hover:text-gray-300'
                  }`}
                  title={autoEnter ? 'Auto-Enter is ON: Click to turn OFF' : 'Auto-Enter is OFF: Click to turn ON'}
                >
                  <Zap size={10} className={autoEnter ? 'text-emerald-400 fill-emerald-400' : 'text-gray-500'} />
                  <span>Auto-Enter: {autoEnter ? 'ON' : 'OFF'}</span>
                </button>
              </div>
              <p className="text-[10px] text-gray-400">
                {autoEnter ? 'Speak naturally • Automatically saves on finish' : 'Speak naturally • Review and save manually'}
              </p>
            </div>
          </div>

          <div className="flex items-center">
            <button
              onClick={() => {
                clearAutoSaveTimer();
                onClose();
              }}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Animated Microphone Listening Canvas */}
          <div className="flex flex-col items-center justify-center p-5 bg-gradient-to-b from-white/[0.03] to-transparent rounded-2xl border border-white/5 relative overflow-hidden">
            {/* Ambient Animated Glow Rings */}
            {isListening && (
              <>
                <div className="absolute w-36 h-36 rounded-full bg-emerald-500/10 animate-ping pointer-events-none" />
                <div className="absolute w-28 h-28 rounded-full bg-indigo-500/15 animate-pulse pointer-events-none" />
              </>
            )}

            {/* Central Mic Button */}
            <button
              onClick={() => {
                if (isListening) {
                  stopListening();
                  scheduleAutoSaveIfReady(1200);
                } else {
                  startListening();
                }
              }}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xl relative z-10 ${
                isListening
                  ? 'bg-gradient-to-tr from-rose-600 to-red-500 text-white shadow-rose-950/60 scale-105 animate-pulse'
                  : 'bg-gradient-to-tr from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white shadow-emerald-950/50 active:scale-95'
              }`}
              title={isListening ? 'Tap to finish speaking' : 'Tap to start speaking'}
            >
              {isListening ? <Mic size={32} className="animate-bounce" /> : <Mic size={32} />}
            </button>

            {/* Status Indicator */}
            <div className="mt-3 text-center">
              <span className={`text-xs font-bold tracking-wide uppercase px-2.5 py-1 rounded-full border ${
                isListening 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse'
                  : autoSaveCountdown !== null
                    ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40'
                    : 'bg-white/5 text-gray-300 border-white/10'
              }`}>
                {isListening 
                  ? '🎙️ Listening... Speak naturally' 
                  : autoSaveCountdown !== null 
                    ? `⚡ Auto-Saving in ${autoSaveCountdown}s...`
                    : 'Tap Mic to Speak'}
              </span>
            </div>

            {/* Suggested Spoken Phrases Carousel */}
            {!activeDisplayText && !isListening && (
              <div className="mt-4 text-center space-y-1">
                <p className="text-[11px] font-medium text-gray-400">Try saying:</p>
                <div className="flex flex-wrap gap-1.5 justify-center max-w-xs">
                  <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-indigo-300 border border-white/5">
                    &ldquo;Spent $14.50 at Subway&rdquo;
                  </span>
                  <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-emerald-300 border border-white/5">
                    &ldquo;Starbucks 6 dollars&rdquo;
                  </span>
                  <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-amber-300 border border-white/5">
                    &ldquo;Gas 45 dollars cash&rdquo;
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ACTIVE AUTO-SAVE COUNTDOWN NOTIFICATION BANNER */}
          {autoSaveCountdown !== null && autoSaveCountdown > 0 && parsed && parsed.amount && (
            <div className="p-3.5 bg-gradient-to-r from-emerald-950/60 to-[#122218] border border-emerald-500/40 rounded-2xl shadow-xl space-y-2 animate-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500 text-black flex items-center justify-center font-black text-xs">
                    <Zap size={14} className="fill-black stroke-black" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-emerald-300 tracking-wide">
                      Auto-entering in {autoSaveCountdown}s...
                    </span>
                    <p className="text-[10px] text-gray-300">
                      {currencySymbol}{parseFloat(editedAmount || '0').toFixed(2)} at {editedVendor || 'Merchant'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={executeSave}
                    className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[10px] rounded-lg shadow-sm transition-all cursor-pointer"
                  >
                    Save Now
                  </button>
                  <button
                    type="button"
                    onClick={clearAutoSaveTimer}
                    className="px-2 py-1 bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white font-bold text-[10px] rounded-lg border border-white/10 transition-all cursor-pointer"
                  >
                    Pause / Edit
                  </button>
                </div>
              </div>

              {/* Countdown Visual Progress Bar */}
              <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden border border-emerald-500/20">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-indigo-400 h-full rounded-full transition-all duration-100"
                  style={{ width: `${Math.max(0, (autoSaveCountdown / 1.2) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Transcript / Spoken Text Display */}
          {(activeDisplayText || isListening) && (
            <div className="p-3 bg-black/60 border border-white/10 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Volume2 size={12} className="text-emerald-400" />
                  What you said:
                </span>
                {transcript && (
                  <button 
                    onClick={() => { 
                      clearAutoSaveTimer();
                      setTranscript(''); 
                      setInterimTranscript(''); 
                      setManualInput(''); 
                      setParsed(null); 
                    }}
                    className="text-[10px] text-gray-500 hover:text-gray-300 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="text-xs text-emerald-300 font-mono break-words leading-relaxed min-h-[22px]">
                {activeDisplayText || (isListening ? <span className="text-gray-500 italic">Listening for speech...</span> : '')}
              </p>
            </div>
          )}

          {/* Error / Permission Guidance Banner */}
          {errorMessage && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Manual Input Field (For dictation or keyboard input) */}
          {(!hasSpeechSupport || errorMessage) && (
            <form onSubmit={handleManualSubmit} className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Type or use phone dictation:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="e.g. Spent 15 at Starbucks for coffee"
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer"
                >
                  Parse
                </button>
              </div>
            </form>
          )}

          {/* Extracted Structured Transaction Details Card */}
          {parsed && (
            <div className="p-3.5 bg-white/[0.04] border border-white/10 rounded-2xl space-y-3 animate-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Sparkles size={13} />
                  Detected Transaction
                </span>
                <div className="flex items-center gap-2">
                  {parsed.learnedRuleMatched && (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] font-bold flex items-center gap-1">
                      <span>🧠</span> Learned Merchant
                    </span>
                  )}
                  <span className="text-[9px] text-gray-400 font-mono">
                    {Math.round(parsed.confidence * 100)}% Match
                  </span>
                </div>
              </div>

              {/* Amount & Vendor Fields */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 font-mono">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={editedAmount}
                      onChange={(e) => {
                        clearAutoSaveTimer();
                        setEditedAmount(e.target.value);
                      }}
                      placeholder="0.00"
                      className="w-full pl-6 pr-2 py-1.5 bg-black/60 border border-white/10 rounded-xl text-sm font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    Vendor / Merchant
                  </label>
                  <input
                    type="text"
                    value={editedVendor}
                    onChange={(e) => {
                      clearAutoSaveTimer();
                      setEditedVendor(e.target.value);
                    }}
                    placeholder="Merchant name"
                    className="w-full px-2.5 py-1.5 bg-black/60 border border-white/10 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Category Selection Chips */}
              <div>
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Category
                </label>
                <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full">
                  {categories.slice(0, 7).map(cat => {
                    const isSelected = editedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          clearAutoSaveTimer();
                          setEditedCategory(cat.id);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer border shrink-0 ${
                          isSelected
                            ? 'bg-emerald-500 text-black border-emerald-400'
                            : 'bg-white/5 text-gray-300 border-white/5 hover:bg-white/10'
                        }`}
                      >
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[9px] text-gray-400 mt-1.5 flex items-center gap-1">
                  <span className="text-amber-400">💡</span>
                  <span>LooseBudget automatically remembers this merchant and category for future entries!</span>
                </p>
              </div>

              {/* Payment Method Pills */}
              <div>
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Payment Method
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      clearAutoSaveTimer();
                      setEditedPaymentMethod('card');
                    }}
                    className={`flex-1 py-1.5 px-3 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      editedPaymentMethod === 'card'
                        ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                        : 'bg-white/5 border-white/5 text-gray-400'
                    }`}
                  >
                    <CreditCard size={12} />
                    Card / Digital Wallet
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      clearAutoSaveTimer();
                      setEditedPaymentMethod('cash');
                    }}
                    className={`flex-1 py-1.5 px-3 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      editedPaymentMethod === 'cash'
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-white/5 border-white/5 text-gray-400'
                    }`}
                  >
                    <Banknote size={12} />
                    Cash
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Buttons Footer */}
        <div className="p-4 border-t border-white/5 bg-black/40 flex flex-col sm:flex-row gap-2.5">
          {parsed && parsed.amount ? (
            <>
              <button
                type="button"
                onClick={executeSave}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer uppercase tracking-wider"
              >
                <Check size={16} className="stroke-[3]" />
                Log Expense ({currencySymbol}{parseFloat(editedAmount || '0').toFixed(2)})
              </button>

              <button
                type="button"
                onClick={handleOpenFullForm}
                className="py-3 px-3.5 bg-white/5 hover:bg-white/10 active:scale-95 text-gray-300 hover:text-white font-bold text-xs rounded-xl border border-white/10 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                title="Review in full Add Expense screen"
              >
                <span>Edit Details</span>
                <ArrowRight size={14} />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                clearAutoSaveTimer();
                onClose();
              }}
              className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
