import React, { useState } from 'react';
import { ShieldCheck, Check, Sparkles, ExternalLink, Zap, RefreshCw, X, AlertCircle } from 'lucide-react';
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
  const isPaywalled = SubscriptionManager.isPaywalled(subscriptionState);

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
          setSimulationSuccessMsg('🎉 30-Day $1 Trial activated successfully!');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        
        {/* Top Banner */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white p-6 sm:p-8 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 px-3.5 py-2 bg-slate-950/50 hover:bg-slate-950/80 text-white font-extrabold text-xs sm:text-sm rounded-xl border border-white/30 shadow-lg backdrop-blur-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer z-20 group"
            title="Return to LooseBudget App"
          >
            <X className="w-4.5 h-4.5 text-amber-300 group-hover:rotate-90 transition-transform" />
            <span className="tracking-wide uppercase font-sans">Return to App</span>
          </button>

          <div className="flex items-center gap-2 mb-2 text-emerald-200 text-xs sm:text-sm font-semibold uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>LooseBudget Membership & Billing</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Unlock Full Multi-Device Access
          </h2>

          <p className="mt-2 text-emerald-100 text-sm sm:text-base max-w-xl">
            Track expenses effortlessly with unlimited cloud backup, budget analytics, and PWA phone app synchronization.
          </p>

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
                <span>$1.00 Trial Active — {trialDaysLeft} days remaining</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-rose-300" />
                <span>Select $1.00 Trial or Subscription Plan to Activate Sync</span>
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

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Tier 1: 30-Day Trial */}
            <div
              onClick={() => setSelectedTier('trial')}
              className={`relative cursor-pointer p-5 rounded-xl border-2 transition-all ${
                selectedTier === 'trial'
                  ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-md'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
              }`}
            >
              <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                30-Day Trial
              </div>
              <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
                $1.00
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                One-time payment
              </div>
              <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Try all features & multi-device cloud sync full month risk-free.
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCheckout('trial');
                }}
                disabled={isProcessing}
                className="mt-4 w-full py-2 px-3 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
              >
                {subscriptionState.tier === 'trial' && trialDaysLeft > 0 ? 'Active Trial' : 'Start $1 Trial'}
              </button>
            </div>

            {/* Tier 2: Monthly */}
            <div
              onClick={() => setSelectedTier('monthly')}
              className={`relative cursor-pointer p-5 rounded-xl border-2 transition-all ${
                selectedTier === 'monthly'
                  ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-md'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
              }`}
            >
              <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Monthly Plan
              </div>
              <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
                $1.99 <span className="text-sm font-normal text-slate-500">/mo</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Billed monthly
              </div>
              <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Flexible month-to-month subscription. Cancel anytime with 1-click.
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCheckout('monthly');
                }}
                disabled={isProcessing}
                className="mt-4 w-full py-2 px-3 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
              >
                {subscriptionState.tier === 'monthly' ? 'Current Plan' : 'Subscribe Monthly'}
              </button>
            </div>

            {/* Tier 3: Yearly (Popular) */}
            <div
              onClick={() => setSelectedTier('yearly')}
              className={`relative cursor-pointer p-5 rounded-xl border-2 transition-all ${
                selectedTier === 'yearly'
                  ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-lg ring-1 ring-emerald-600'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
              }`}
            >
              <div className="absolute -top-3 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white uppercase tracking-wider shadow-sm">
                Save 37%
              </div>
              <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                Yearly Plan
              </div>
              <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
                $14.99 <span className="text-sm font-normal text-slate-500">/yr</span>
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                Just $1.25 / month
              </div>
              <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Best value for continuous multi-device expense tracking & backups.
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCheckout('yearly');
                }}
                disabled={isProcessing}
                className="mt-4 w-full py-2 px-3 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
              >
                {subscriptionState.tier === 'yearly' ? 'Current Plan' : 'Subscribe Yearly'}
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
              {/* Dev / Owner Bypass Button for testing on phone */}
              <button
                onClick={() => {
                  const isCurrentlyPro = subscriptionState.isSubscribed;
                  const updated: SubscriptionState = isCurrentlyPro
                    ? { tier: 'free_preview', status: 'preview', trialDaysTotal: 0, isSubscribed: false }
                    : SubscriptionManager.activatePlan('yearly');
                  onSubscriptionUpdate(updated);
                  setSimulationSuccessMsg(
                    isCurrentlyPro
                      ? 'Reverted to Free Preview mode for testing.'
                      : '🔓 Developer / Tester Unlimited PRO Access Activated!'
                  );
                }}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                title="Bypass subscription for testing on your phone"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{subscriptionState.isSubscribed ? 'Disable Dev PRO' : 'Dev PRO Unlock'}</span>
              </button>

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
