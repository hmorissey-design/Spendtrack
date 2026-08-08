/**
 * Subscription & Trial Management Utility for ExpenseTrack
 * Handles 5-day free trial tracking, Lemon Squeezy subscription integration, and Cloud sync state.
 */

import { SubscriptionState, PlanTier } from '../types';
import { auth } from '../firebase';
import { CloudDb } from './cloudDb';

const SUBSCRIPTION_STORAGE_KEY = 'expensetrack_subscription_state';

export const DEFAULT_SUBSCRIPTION_STATE: SubscriptionState = {
  tier: 'trial',
  status: 'trialing',
  trialDaysTotal: 2,
  isSubscribed: false,
};

export const SubscriptionManager = {
  /**
   * Retrieves the current subscription state from localStorage or defaults
   */
  getSubscriptionState(): SubscriptionState {
    try {
      const saved = localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.tier) {
          let needsSave = false;
          if (parsed.tier === 'free_preview' || parsed.status === 'preview' || !parsed.trialStartDate) {
            parsed.tier = 'trial';
            parsed.status = 'trialing';
            parsed.trialStartDate = parsed.trialStartDate || Date.now();
            parsed.trialDaysTotal = 2;
            parsed.isSubscribed = false;
            needsSave = true;
          } else if (!parsed.isSubscribed && parsed.trialDaysTotal !== 2) {
            parsed.trialDaysTotal = 2;
            needsSave = true;
          }
          if (needsSave) {
            this.saveSubscriptionState(parsed);
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error reading subscription state:', e);
    }

    // Default: initialize 2-day full access preview trial starting now
    const initialState: SubscriptionState = {
      ...DEFAULT_SUBSCRIPTION_STATE,
      trialStartDate: Date.now(),
      trialDaysTotal: 2,
    };
    this.saveSubscriptionState(initialState);
    return initialState;
  },

  /**
   * Saves subscription state locally and syncs to Firestore if user is authenticated
   */
  saveSubscriptionState(state: SubscriptionState): void {
    try {
      localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(state));
      if (auth.currentUser) {
        CloudDb.saveUserProfileToCloud(auth.currentUser.uid, { subscription: state }).catch(err => {
          console.warn('Could not sync subscription to cloud profile:', err);
        });
      }
    } catch (e) {
      console.error('Error saving subscription state:', e);
    }
  },

  /**
   * Calculates remaining trial hours based on trialStartDate and total trialDays (48 hours = 2 days)
   */
  getTrialHoursRemaining(state?: SubscriptionState): number {
    const sub = state || this.getSubscriptionState();
    if (sub.isSubscribed || sub.status === 'active') {
      return 120; // Active subscriber
    }
    if (!sub.trialStartDate) return 0;

    const totalDays = !sub.isSubscribed ? Math.min(2, sub.trialDaysTotal || 2) : 2;
    const totalMs = totalDays * 24 * 60 * 60 * 1000; // 48 hours = 172,800,000 ms
    const elapsedMs = Math.max(0, Date.now() - sub.trialStartDate);
    const remainingMs = Math.max(0, totalMs - elapsedMs);

    return remainingMs / (1000 * 60 * 60);
  },

  /**
   * Calculates remaining trial days based on trialHoursRemaining
   */
  getTrialDaysRemaining(state?: SubscriptionState): number {
    const hours = this.getTrialHoursRemaining(state);
    return Math.ceil(hours / 24);
  },

  /**
   * Returns human-friendly remaining trial time (e.g. "48h left", "1d 12h left", "5h left")
   */
  getTrialTimeRemainingText(state?: SubscriptionState): string {
    const sub = state || this.getSubscriptionState();
    if (sub.isSubscribed || sub.status === 'active') return 'Active';

    const hoursLeft = this.getTrialHoursRemaining(sub);
    if (hoursLeft <= 0) return 'Expired';

    if (hoursLeft >= 24) {
      const days = Math.floor(hoursLeft / 24);
      const hours = Math.round(hoursLeft % 24);
      return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
    } else {
      const hours = Math.ceil(hoursLeft);
      return `${hours}h`;
    }
  },

  /**
   * Checks if user trial has expired (48 hours from trialStartDate) and user is not subscribed
   */
  isPaywalled(state?: SubscriptionState): boolean {
    const sub = state || this.getSubscriptionState();
    if (sub.isSubscribed || sub.status === 'active') return false;
    return this.getTrialHoursRemaining(sub) <= 0;
  },

  /**
   * Start or reset the 2-Day Preview Trial
   */
  startTrial(days = 2): SubscriptionState {
    const newState: SubscriptionState = {
      tier: 'trial',
      status: 'trialing',
      trialStartDate: Date.now(),
      trialDaysTotal: days,
      isSubscribed: false,
    };
    this.saveSubscriptionState(newState);
    return newState;
  },

  /**
   * Activate or upgrade subscription plan
   */
  activatePlan(tier: PlanTier, details?: { customerId?: string; subscriptionId?: string }): SubscriptionState {
    const newState: SubscriptionState = {
      tier,
      status: 'active',
      isSubscribed: true,
      trialDaysTotal: 5,
      subscriptionEndDate: Date.now() + (tier === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000,
      lemonSqueezyCustomerId: details?.customerId,
      lemonSqueezySubscriptionId: details?.subscriptionId,
    };
    this.saveSubscriptionState(newState);
    return newState;
  },

  /**
   * Get Lemon Squeezy Checkout URL based on environment variable or fallback configuration
   */
  getCheckoutUrl(tier: 'trial' | 'monthly' | 'yearly'): string {
    const env = import.meta.env;
    if (tier === 'monthly') {
      return env.VITE_LEMON_SQUEEZY_MONTHLY_URL || 'https://loosebudget.lemonsqueezy.com/checkout/buy/82e0d56b-82f8-42d5-88c4-44c547f540d6';
    }
    if (tier === 'yearly') {
      return env.VITE_LEMON_SQUEEZY_YEARLY_URL || 'https://loosebudget.lemonsqueezy.com/checkout/buy/0be2aa11-aecf-4a78-8d2c-9e66317ab504';
    }
    if (tier === 'trial') {
      return env.VITE_LEMON_SQUEEZY_TRIAL_URL || env.VITE_LEMON_SQUEEZY_MONTHLY_URL || 'https://loosebudget.lemonsqueezy.com/checkout/buy/82e0d56b-82f8-42d5-88c4-44c547f540d6';
    }
    if (env.VITE_LEMON_SQUEEZY_STORE_URL) {
      return env.VITE_LEMON_SQUEEZY_STORE_URL;
    }
    return ''; // empty means simulation or manual trigger
  }
};
