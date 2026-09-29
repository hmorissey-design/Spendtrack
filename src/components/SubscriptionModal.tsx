import React, { useState } from 'react';
import { 
  X, Check, Sparkles, ShieldCheck, ExternalLink, Zap, 
  RefreshCw, Lock, AlertCircle, Heart 
} from 'lucide-react';
import { SubscriptionManager } from '../utils/subscription';
import { SubscriptionState, PlanTier } from '../types';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptionState: SubscriptionState;
  onSubscriptionUpdated: (newState: SubscriptionState) => void;
  isDevMode?: boolean;
  onDevBypass?: () => void;
  isPaywallMode?: boolean;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  subscriptionState,
  onSubscriptionUpdated,
  isDevMode = false,
  onDevBypass,
  isPaywallMode = false,
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const tapCountRef = React.useRef(0);
  const tapTimerRef = React.useRef<any>(null);

  const handleModalIconTap = () => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      if (onDevBypass) onDevBypass();
      onClose();
    } else {
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
      }, 2000);
    }
  };

  if (!isOpen) return null;

  const handleOpenCheckout = (tier: PlanTier | 'monthly' | 'yearly') => {
    const url = SubscriptionManager.getCheckoutUrl(tier);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      setStatusMessage('Lemon Squeezy checkout opened! After completing payment, return here and your plan will activate automatically.');
    }
  };

  const handleRefreshStatus = () => {
    setIsVerifying(true);
    setStatusMessage(null);
    setTimeout(() => {
      const fresh = SubscriptionManager.getSubscriptionState();
      onSubscriptionUpdated(fresh);
      setIsVerifying(false);
      if (fresh.isSubscribed) {
        setStatusMessage('🎉 Subscription verified and active!');
      } else {
        setStatusMessage('No active payment found yet. If you recently completed checkout, please allow a moment or verify your email.');
      }
    }, 1000);
  };

  const daysRemaining = SubscriptionManager.getTrialDaysRemaining(subscriptionState);
  const isSubExpired = SubscriptionManager.isSubscriptionExpired(subscriptionState);
  const isTrialExpired = SubscriptionManager.isTrialExpired(subscriptionState);

  let modalTitle = 'Choose Your LooseBudget Plan';
  let modalDesc = daysRemaining < 999 
    ? `You have ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining on your free trial. Prices in Canadian dollars (CAD).`
    : 'Unlimited budget tracking, savings goals, and instant cloud sync in Canadian dollars (CAD).';

  if (isSubExpired) {
    modalTitle = 'Subscription Expired';
    modalDesc = 'Your LooseBudget subscription has ended. Resubscribe below to restore full access to all your budgets, analytics, and cloud backups. All prices in Canadian dollars (CAD).';
  } else if (isPaywallMode || isTrialExpired) {
    modalTitle = 'Free Trial Expired';
    modalDesc = 'Your 16-day free trial has ended. Subscribe to keep full access to your finances, budget rollover, and cloud sync. All prices in Canadian dollars (CAD).';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-[#0e1111] border border-emerald-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-start justify-between gap-4 mb-4 relative z-10 shrink-0">
          <div 
            onClick={handleModalIconTap}
            className="flex items-center gap-3 cursor-pointer select-none"
            title="Tap 5 times for Developer Bypass"
          >
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner active:scale-90 transition-transform">
              {isSubExpired ? (
                <RefreshCw size={20} className="text-amber-400" />
              ) : isPaywallMode || isTrialExpired ? (
                <Lock size={20} className="text-rose-400" />
              ) : (
                <Sparkles size={20} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  {modalTitle}
                </h2>
                {subscriptionState.isSubscribed && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-extrabold uppercase">
                    Active Plan
                  </span>
                )}
                {isSubExpired && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-extrabold uppercase">
                    Expired
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {modalDesc}
              </p>
            </div>
          </div>

          {/* Close button (allowed if not locked or if in dev mode) */}
          {(!isPaywallMode || isDevMode) && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer border-0 bg-transparent shrink-0"
              title="Close window"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Status notice */}
        {statusMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-2 relative z-10">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-emerald-400" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Currency Notice Badge */}
        <div className="mb-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs text-emerald-300 relative z-10">
          <span className="font-bold flex items-center gap-1.5">
            <Sparkles size={13} className="text-emerald-400" /> Currency: Canadian Dollars (CAD)
          </span>
          <span className="text-[10px] text-gray-400 font-mono">Billed in $ CAD</span>
        </div>

        {/* Scrollable plan comparison */}
        <div className="overflow-y-auto space-y-3.5 pr-1 py-1 relative z-10 flex-1">
          
          {/* Annual Plan (Featured) */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500 bg-gradient-to-b from-emerald-950/40 via-[#131a15] to-[#101512] p-4 sm:p-4.5 shadow-lg shadow-emerald-950/50">
            <div className="absolute top-0 right-0 bg-emerald-500 text-black text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-md">
              BEST VALUE • SAVE 37%
            </div>

            <div className="flex items-start justify-between mb-2.5">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                  Annual Subscription <Sparkles size={14} className="text-emerald-400" />
                </h3>
                <p className="text-xs text-gray-400">12 months of unlimited access</p>
              </div>
              <div className="text-right mt-1">
                <div className="text-xl sm:text-2xl font-black text-emerald-400 leading-none flex items-baseline justify-end gap-1">
                  <span>$14.99</span>
                  <span className="text-xs font-bold text-emerald-300">CAD</span>
                </div>
                <div className="text-[10px] text-gray-400 font-medium mt-0.5">
                  per year CAD (~$1.25 CAD/mo)
                </div>
              </div>
            </div>

            <ul className="space-y-1.5 text-xs text-gray-300 mb-3.5">
              <li className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400 shrink-0 stroke-[2.5]" />
                <span>All daily expense tracking &amp; custom categories</span>
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400 shrink-0 stroke-[2.5]" />
                <span>Monthly rollover budgets &amp; multi-tier savings goals</span>
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400 shrink-0 stroke-[2.5]" />
                <span>Auto-detection for Google Wallet &amp; bank notifications</span>
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400 shrink-0 stroke-[2.5]" />
                <span>End-to-end Firebase Cloud backup &amp; cross-device sync</span>
              </li>
            </ul>

            <button
              onClick={() => handleOpenCheckout('yearly')}
              className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-98 cursor-pointer border-0 flex items-center justify-center gap-2 font-sans"
            >
              <span>Subscribe Yearly — $14.99 CAD / yr</span>
              <ExternalLink size={14} className="stroke-[2.5]" />
            </button>
          </div>

          {/* Monthly Plan */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#121413] hover:border-white/20 p-4 transition-all">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-sm font-extrabold text-white">Monthly Subscription</h3>
                <p className="text-xs text-gray-400">Standard flexible monthly billing</p>
              </div>
              <div className="text-right">
                <div className="text-lg sm:text-xl font-bold text-white leading-none flex items-baseline justify-end gap-1">
                  <span>$1.99</span>
                  <span className="text-xs font-medium text-gray-300">CAD</span>
                </div>
                <div className="text-[10px] text-gray-400 font-medium mt-0.5">
                  per month CAD
                </div>
              </div>
            </div>

            <ul className="space-y-1.5 text-xs text-gray-300 mb-3.5">
              <li className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400 shrink-0 stroke-[2.5]" />
                <span>Full access to all budget &amp; tracking features</span>
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400 shrink-0 stroke-[2.5]" />
                <span>Cancel anytime with 1 tap</span>
              </li>
            </ul>

            <button
              onClick={() => handleOpenCheckout('monthly')}
              className="w-full py-2 px-4 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all active:scale-98 cursor-pointer border border-white/15 flex items-center justify-center gap-2"
            >
              <span>Subscribe Monthly — $1.99 CAD / mo</span>
              <ExternalLink size={14} />
            </button>
          </div>

          {/* Security & Customer portal link */}
          <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-gray-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>Secure checkout via Lemon Squeezy • Billed in Canadian Dollars (CAD)</span>
            </div>
            
            <button
              onClick={handleRefreshStatus}
              disabled={isVerifying}
              className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 bg-transparent border-0 cursor-pointer font-medium p-0"
            >
              <RefreshCw size={12} className={isVerifying ? 'animate-spin' : ''} />
              <span>Check / Restore Status</span>
            </button>
          </div>

          {/* Developer Bypass Option */}
          {isDevMode && (
            <div className="mt-3 p-3 bg-amber-950/30 border border-amber-500/40 rounded-xl flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-amber-400 block">
                  🔓 Developer Mode Active
                </span>
                <span className="text-[10px] text-gray-400">
                  You can bypass all subscription restrictions.
                </span>
              </div>
              <button
                onClick={() => {
                  if (onDevBypass) onDevBypass();
                  onClose();
                }}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-[11px] rounded-lg cursor-pointer border-0 shadow-sm uppercase tracking-wider shrink-0"
              >
                Bypass Paywall
              </button>
            </div>
          )}

          {/* Secret developer tap hint for the creator */}
          {isPaywallMode && !isDevMode && (
            <div className="text-center pt-2">
              <p className="text-[9px] text-gray-600 select-none">
                Developer Note: 5 quick taps on top logo activates developer bypass.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
