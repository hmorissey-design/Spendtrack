/**
 * Subscription & Trial Management Utility for ExpenseTrack
 * Handles 30-day $1 trial tracking, Lemon Squeezy integration, and Cloud sync state.
 */

import { SubscriptionState, PlanTier } from '../types';
import { auth } from '../firebase';
import { CloudDb } from './cloudDb';

const SUBSCRIPTION_STORAGE_KEY = 'expensetrack_subscription_state';

export const DEFAULT_SUBSCRIPTION_STATE: SubscriptionState = {
  tier: 'free_preview',
  status: 'preview',
  trialDaysTotal: 0,
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
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error reading subscription state:', e);
    }

    // Default: initialize 30-day trial starting now
    const initialState = {
      ...DEFAULT_SUBSCRIPTION_STATE,
      trialStartDate: Date.now(),
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
   * Calculates remaining trial days based on trialStartDate and total trialDays (30)
   */
  getTrialDaysRemaining(state?: SubscriptionState): number {
    const sub = state || this.getSubscriptionState();
    if (sub.isSubscribed || sub.status === 'active') {
      return 30; // Active subscriber
    }
    if (sub.tier === 'free_preview' || !sub.trialStartDate || sub.trialDaysTotal === 0) return 0;

    const startDate = new Date(sub.trialStartDate);
    const now = new Date();
    const diffTime = now.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const remaining = sub.trialDaysTotal - diffDays;

    return Math.max(0, remaining);
  },

  /**
   * Checks if user trial has expired and user is not subscribed
   */
  isPaywalled(state?: SubscriptionState): boolean {
    const sub = state || this.getSubscriptionState();
    if (sub.isSubscribed || sub.status === 'active') return false;
    const remainingDays = this.getTrialDaysRemaining(sub);
    return remainingDays <= 0;
  },

  /**
   * Start or reset the 30-Day $1 Trial
   */
  startTrial(): SubscriptionState {
    const newState: SubscriptionState = {
      tier: 'trial',
      status: 'trialing',
      trialStartDate: Date.now(),
      trialDaysTotal: 30,
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
      trialDaysTotal: 30,
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
    if (tier === 'trial') {
      return env.VITE_LEMON_SQUEEZY_TRIAL_URL || 'https://loosebudget.lemonsqueezy.com/checkout/buy/6a55af9b-b545-40bd-a55d-9e55022abc6b';
    }
    if (tier === 'monthly') {
      return env.VITE_LEMON_SQUEEZY_MONTHLY_URL || 'https://loosebudget.lemonsqueezy.com/checkout/buy/82e0d56b-82f8-42d5-88c4-44c547f540d6';
    }
    if (tier === 'yearly') {
      return env.VITE_LEMON_SQUEEZY_YEARLY_URL || 'https://loosebudget.lemonsqueezy.com/checkout/buy/0be2aa11-aecf-4a78-8d2c-9e66317ab504';
    }
    if (env.VITE_LEMON_SQUEEZY_STORE_URL) {
      return env.VITE_LEMON_SQUEEZY_STORE_URL;
    }
    return ''; // empty means simulation or manual trigger
  }
};
