import React, { useState } from 'react';
import { ShieldCheck, Check, Sparkles, ExternalLink, Zap, RefreshCw, X, AlertCircle, Download } from 'lucide-react';
import { SubscriptionState, PlanTier } from '../types';
import { SubscriptionManager } from '../utils/subscription';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptionState: SubscriptionState;
  onSubscriptionUpdate: (newState: SubscriptionState) => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  subscriptionState,
  onSubscriptionUpdate,
}) => {
  const [selectedTier, setSelectedTier] = useState<PlanTier>('yearly');
  const [isProcessing, setIsProcessing] = useState(false);
  const [simulationSuccessMsg, setSimulationSuccessMsg] = useState('');

  if (!isOpen) return null;

  const trialDaysLeft = SubscriptionManager.getTrialDaysRemaining(subscriptionState);

  const handleCheckout = (tier: 'trial' | 'monthly' | 'yearly') => {
    setIsProcessing(true);
    setSimulationSuccessMsg('');

    const checkoutUrl = SubscriptionManager.getCheckoutUrl(tier);

    if (checkoutUrl) {
      // Open Lemon Squeezy Checkout overlay or tab
      window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
      setIsProcessing(false);
    } else {
      // Dev / Test simulation mode when Lemon Squeezy store URL isn't pasted in .env yet
      setTimeout(() => {
        let updated: SubscriptionState;
        if (tier === 'trial') {
          updated = SubscriptionManager.startTrial();
          setSimulationSuccessMsg('🎉 5-Day Free Trial activated successfully!');
        } else {
          updated = SubscriptionManager.activatePlan(tier);
          setSimulationSuccessMsg(`🎉 ${tier === 'yearly' ? 'Yearly ($14.99/yr)' : 'Monthly ($1.99/mo)'} Subscription activated successfully!`);
        }
        onSubscriptionUpdate(updated);
        setIsProcessing(false);
      }, 600);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-3 sm:my-8 shrink-0">
        
        {/* Top Banner Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white p-5 sm:p-8 relative">
          
          {/* Header Top Bar: Badge + Return to App Button */}
          <div className="flex items-center justify-between gap-3 mb-4 border-b border-white/15 pb-3">
            <div className="flex items-center gap-2 text-emerald-200 text-xs sm:text-sm font-semibold uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
              <span>LooseBudget Membership & Billing</span>
            </div>

            {/* Top Return to App Button */}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm rounded-xl border border-emerald-400/40 shadow-lg backdrop-blur-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Return to LooseBudget App"
            >
              <X className="w-4 h-4 text-white" />
              <span className="tracking-wide uppercase font-sans">Return to App ↩</span>
            </button>
          </div>

          <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight">
            Unlock Full Multi-Device Access
          </h2>

          <p className="mt-2 text-emerald-100 text-xs sm:text-sm max-w-xl leading-relaxed">
            Track expenses effortlessly with unlimited cloud backup, budget analytics, and PWA phone app synchronization.
          </p>

          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open-pwa-install-guide'));
            }}
            className="mt-3 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold text-amber-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-sm w-fit"
          >
            <Download className="w-3.5 h-3.5 text-amber-300" />
            <span>How to Download / Install App on Phone or PC 📲</span>
          </button>

          {/* Current Status Pill */}
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md text-white border border-white/30">
            {subscriptionState.isSubscribed ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                <span>Active Subscription ({subscriptionState.tier === 'yearly' ? 'Yearly' : 'Monthly'})</span>
              </>
            ) : trialDaysLeft > 0 ? (
              <>
                <Zap className="w-4 h-4 text-amber-300" />
                <span>
                  Active Plan: Free 2-Day Full Access Preview — {trialDaysLeft} {trialDaysLeft === 1 ? 'day' : 'days'} remaining
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-rose-300" />
                <span>Free 2-Day Preview Ended — Subscribe below with a 5-Day Bonus Free Trial to unlock unlimited access & cloud sync</span>
              </>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">

          {simulationSuccessMsg && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-sm flex items-center gap-3">
              <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>{simulationSuccessMsg}</span>
            </div>
          )}

          {/* Trial Value Proposition Banner */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
              <span className="font-bold text-amber-500 dark:text-amber-400">🎁 Both plans include a 5-Day Bonus Free Trial!</span> Choose Monthly or Yearly below — you won't be charged anything today ($0 today). Payments process automatically starting on Day 6, and you can cancel anytime with 1 click.
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl mx-auto">

            {/* Tier 1: Monthly with 5-Day Trial */}
            <div
              onClick={() => setSelectedTier('monthly')}
              className={`relative cursor-pointer p-6 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                selectedTier === 'monthly'
                  ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-md ring-1 ring-emerald-600'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
              }`}
            >
              <div>
                <div className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 uppercase tracking-wider mb-2">
                  5-Day Free Trial Included
                </div>
                <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Monthly Subscription
                </div>
                <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
                  $1.99 <span className="text-sm font-normal text-slate-500">/mo</span>
                </div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                  $0 today • Billed $1.99/mo after 5 days
                </div>
                <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Flexible month-to-month subscription. Complete cloud sync & unlimited access.
                </p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCheckout('monthly');
                }}
                disabled={isProcessing}
                className="mt-6 w-full py-2.5 px-4 text-xs font-black uppercase tracking-wider rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white transition-all shadow-md disabled:opacity-50 cursor-pointer"
              >
                {subscriptionState.tier === 'monthly' ? 'Current Plan' : 'Start 5-Day Free Trial ($1.99/mo)'}
              </button>
            </div>

            {/* Tier 2: Yearly with 5-Day Trial (Popular) */}
            <div
              onClick={() => setSelectedTier('yearly')}
              className={`relative cursor-pointer p-6 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                selectedTier === 'yearly'
                  ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xl ring-2 ring-emerald-500'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
              }`}
            >
              <div className="absolute -top-3.5 right-4 px-3 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 uppercase tracking-wider shadow-md">
                Best Value — Save 37%
              </div>

              <div>
                <div className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/30 uppercase tracking-wider mb-2">
                  5-Day Free Trial Included
                </div>
                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                  Yearly Subscription
                </div>
                <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
                  $14.99 <span className="text-sm font-normal text-slate-500">/yr</span>
                </div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                  Just $1.25 / month • $0 today (Billed Day 6)
                </div>
                <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Best value for uninterrupted multi-device expense tracking, backups & analytics.
                </p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCheckout('yearly');
                }}
                disabled={isProcessing}
                className="mt-6 w-full py-2.5 px-4 text-xs font-black uppercase tracking-wider rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white transition-all shadow-md disabled:opacity-50 cursor-pointer"
              >
                {subscriptionState.tier === 'yearly' ? 'Current Plan' : 'Start 5-Day Free Trial ($14.99/yr)'}
              </button>
            </div>

          </div>

          {/* Features List */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
              Included in All Paid Plans:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Real-time Multi-device Cloud Sync</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Unlimited Expenses & Custom Categories</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>PWA Mobile App & Offline Caching</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>CSV Export & Monthly Budget Analytics</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Encrypted Checkout & Instant Activation</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>1-Click Cancelation & Fast Support</span>
              </div>
            </div>
          </div>

          {/* Footer Actions & Merchant of Record Note */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Payments securely processed by Lemon Squeezy.</span>
            </div>

            <div className="flex items-center gap-2">
              {import.meta.env.VITE_LEMON_SQUEEZY_STORE_URL && (
                <a
                  href={import.meta.env.VITE_LEMON_SQUEEZY_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-600 hover:underline font-medium"
                >
                  <span>Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition-all cursor-pointer shadow-md flex items-center gap-1.5 active:scale-95"
              >
                <span>RETURN TO APP ↩</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
