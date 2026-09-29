import React from 'react';
import { Sparkles, ArrowRight, X, Heart, ExternalLink, AlertCircle, RefreshCw, Lock } from 'lucide-react';
import { SubscriptionManager } from '../utils/subscription';
import { SubscriptionState } from '../types';

interface SubscriptionBannerProps {
  subscriptionState: SubscriptionState;
  onOpenPlansModal: () => void;
  onDismiss: () => void;
}

export const SubscriptionBanner: React.FC<SubscriptionBannerProps> = ({
  subscriptionState,
  onOpenPlansModal,
  onDismiss,
}) => {
  const isSubExpired = SubscriptionManager.isSubscriptionExpired(subscriptionState);
  const isTrialExpired = SubscriptionManager.isTrialExpired(subscriptionState);
  const daysRemaining = SubscriptionManager.getTrialDaysRemaining(subscriptionState);
  const daysText = daysRemaining <= 1 ? (daysRemaining === 1 ? '1 day' : 'today') : `${daysRemaining} days`;

  const handleCheckout = (tier: 'monthly' | 'yearly') => {
    const url = SubscriptionManager.getCheckoutUrl(tier);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Determine styling and messaging based on state
  let badgePrimary = 'Free Trial Notice';
  let badgeSecondary = `Ends in ${daysText}`;
  let bannerMessage = `We hope you are finding the Expense, Budget and Savings tracker useful! The free trial will end in ${daysText}. Please consider either a monthly or yearly subscription to support us and keep the service running! (Prices in Canadian dollars)`;
  let bannerBorder = 'border-emerald-500/50';
  let bannerBg = 'from-emerald-950/90 via-[#131715] to-[#121815]';
  let iconComponent = <Heart size={16} className="text-pink-400 fill-pink-500/30 animate-pulse" />;
  let actionLinkText = 'Plan Details';

  if (isSubExpired) {
    badgePrimary = 'Subscription Expired';
    badgeSecondary = 'Renewal Notice';
    bannerMessage = "Your LooseBudget subscription has ended. We'd love to have you back! Please renew with a monthly or yearly plan to restore automatic cloud sync, rollover budgets, and uninterrupted tracking! (Prices in Canadian dollars)";
    bannerBorder = 'border-amber-500/60';
    bannerBg = 'from-amber-950/80 via-[#191510] to-[#141210]';
    iconComponent = <RefreshCw size={16} className="text-amber-400" />;
    actionLinkText = 'Resubscribe Now';
  } else if (isTrialExpired) {
    badgePrimary = 'Free Trial Expired';
    badgeSecondary = 'Action Required';
    bannerMessage = 'Your 14-day free trial has expired. To continue using LooseBudget without interruption and preserve your budget rollover and cloud backup, please choose a subscription plan below! (Prices in Canadian dollars)';
    bannerBorder = 'border-rose-500/60';
    bannerBg = 'from-rose-950/80 via-[#181214] to-[#141012]';
    iconComponent = <Lock size={16} className="text-rose-400" />;
    actionLinkText = 'Choose Plan';
  }

  return (
    <div className="px-3 pt-2 pb-1 shrink-0 z-30 animate-in slide-in-from-top-3 duration-300">
      <div className={`relative overflow-hidden bg-gradient-to-r ${bannerBg} border ${bannerBorder} rounded-2xl p-3 sm:p-3.5 shadow-xl shadow-black/40 backdrop-blur-md`}>
        
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col gap-2.5 relative z-10">
          
          {/* Header & text */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 mt-0.5 shadow-inner">
                {iconComponent}
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <span className={`text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md border ${
                    isSubExpired 
                      ? 'text-amber-300 bg-amber-500/20 border-amber-500/40' 
                      : isTrialExpired 
                        ? 'text-rose-300 bg-rose-500/20 border-rose-500/40' 
                        : 'text-emerald-300 bg-emerald-500/20 border-emerald-500/40'
                  }`}>
                    {badgePrimary}
                  </span>
                  <span className="text-[10px] font-extrabold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/40">
                    {badgeSecondary}
                  </span>
                  <span className="text-[10px] font-extrabold text-emerald-300 bg-emerald-950/70 px-2 py-0.5 rounded-md border border-emerald-500/40">
                    Prices in Canadian Dollars (CAD)
                  </span>
                </div>

                <p className="text-xs text-slate-100 leading-relaxed font-medium">
                  {bannerMessage}
                </p>
              </div>
            </div>

            {/* Dismiss button */}
            <button
              type="button"
              onClick={onDismiss}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer border-0 bg-transparent shrink-0"
              title="Dismiss for this session"
            >
              <X size={15} />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-white/5">
            {/* Monthly subscription button */}
            <button
              type="button"
              onClick={() => handleCheckout('monthly')}
              className="flex-1 sm:flex-initial px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 border border-white/10 cursor-pointer shadow-sm"
              title="Subscribe Monthly for $1.99 CAD/mo"
            >
              <span>Monthly ($1.99 CAD/mo)</span>
              <ExternalLink size={12} className="opacity-70" />
            </button>

            {/* Yearly subscription button (highlighted) */}
            <button
              type="button"
              onClick={() => handleCheckout('yearly')}
              className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-emerald-950/50 transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer border-0"
              title="Subscribe Yearly for $14.99 CAD/yr (Save 37%)"
            >
              <Sparkles size={13} className="stroke-[2.5]" />
              <span>Yearly ($14.99 CAD/yr • Save 37%)</span>
            </button>

            {/* More details link */}
            <button
              type="button"
              onClick={onOpenPlansModal}
              className="px-2.5 py-1.5 text-emerald-400 hover:text-emerald-300 text-xs font-bold transition-all border-0 bg-transparent cursor-pointer flex items-center gap-1 ml-auto"
            >
              <span>{actionLinkText}</span>
              <ArrowRight size={13} />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
