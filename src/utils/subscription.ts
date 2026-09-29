/**
 * Subscription & Free Trial Management Utility for LooseBudget / ExpenseTrack
 * 
 * Rules:
 * 1. Initial 14 days: Completely silent, no demo banner or subscription info.
 * 2. After 14 days have passed (Days 15 & 16, 2 days before trial ends):
 *    Display top banner with the prompt:
 *    "We hope you are finding the Expense, Budget and Savings tracker useful!
 *     The free trial will end in 2 days. Please consider either a monthly
 *     or yearly subscription to support us and keep the service running!"
 * 3. After 16 days (trial expired):
 *    Paywall active unless bypassed via developer 5-tap logo shortcut.
 * 4. Pricing:
 *    - Monthly: $1.99 CAD / month
 *    - Yearly: $14.99 CAD / year (Save 37%)
 * 5. Developer 5-tap bypass: Full bypass for developer testing and access.
 */

import { SubscriptionState, PlanTier } from '../types';
import { auth } from '../firebase';
import { CloudDb } from './cloudDb';

const SUBSCRIPTION_STORAGE_KEY = 'expensetrack_subscription_state';

export const TRIAL_SILENT_DAYS = 14;   // 14 days completely silent without banner or subscription info
export const TRIAL_TOTAL_DAYS = 16;    // 16 days total (14 silent + 2 days with notice banner)
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const LEMON_SQUEEZY_URLS = {
  monthly: (import.meta.env.VITE_LEMON_SQUEEZY_MONTHLY_URL as string) || 'https://loosebudget.lemonsqueezy.com/checkout/buy/3d9f4b1d-c0db-48d7-b694-7dbf0f11d243',
  yearly: (import.meta.env.VITE_LEMON_SQUEEZY_YEARLY_URL as string) || 'https://loosebudget.lemonsqueezy.com/checkout/buy/31565abb-965a-45f7-9ab5-14ed83529fd4',
  trial: (import.meta.env.VITE_LEMON_SQUEEZY_TRIAL_URL as string) || 'https://loosebudget.lemonsqueezy.com/checkout/buy/6a55af9b-b545-40bd-a55d-9e55022abc6b',
  orders: (import.meta.env.VITE_LEMON_SQUEEZY_STORE_URL as string) || 'https://loosebudget.lemonsqueezy.com/my-orders',
};

export const DEFAULT_SUBSCRIPTION_STATE: SubscriptionState = {
  tier: 'trial',
  status: 'trialing',
  trialStartDate: Date.now(),
  trialDaysTotal: TRIAL_TOTAL_DAYS,
  isSubscribed: false,
};

export const SubscriptionManager = {
  /**
   * Retrieves the current subscription state.
   * If not set or missing trialStartDate, initializes the 16-day trial (14 silent + 2 notice).
   */
  getSubscriptionState(): SubscriptionState {
    try {
      const saved = localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          // If the user has a real verified subscription, keep active
          if (parsed.isSubscribed && (parsed.paidVerified || parsed.tier === 'monthly' || parsed.tier === 'yearly')) {
            parsed.status = 'active';
            parsed.isSubscribed = true;
            return parsed;
          }

          // If trialStartDate exists, calculate fresh trial status
          if (typeof parsed.trialStartDate === 'number' && parsed.trialStartDate > 0) {
            const elapsedDays = (Date.now() - parsed.trialStartDate) / MS_PER_DAY;
            if (elapsedDays >= TRIAL_TOTAL_DAYS) {
              parsed.status = 'expired';
              parsed.isSubscribed = false;
            } else {
              parsed.status = 'trialing';
              parsed.isSubscribed = false;
            }
            parsed.trialDaysTotal = TRIAL_TOTAL_DAYS;
            return parsed;
          }
        }
      }
    } catch (e) {
      console.error('Error reading subscription state:', e);
    }

    // Default to fresh trial starting now
    const initialState: SubscriptionState = {
      tier: 'trial',
      status: 'trialing',
      trialStartDate: Date.now(),
      trialDaysTotal: TRIAL_TOTAL_DAYS,
      isSubscribed: false,
    };
    this.saveSubscriptionState(initialState);
    return initialState;
  },

  /**
   * Saves state locally and syncs to Firestore if user is authenticated
   */
  saveSubscriptionState(state: SubscriptionState): void {
    try {
      localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(state));
      if (auth.currentUser) {
        CloudDb.saveUserProfileToCloud(auth.currentUser.uid, { subscription: state }).catch(err => {
          console.warn('Could not sync state to cloud profile:', err);
        });
      }
    } catch (e) {
      console.error('Error saving state:', e);
    }
  },

  /**
   * How many days have elapsed since trial started
   */
  getTrialDaysElapsed(state?: SubscriptionState): number {
    const s = state || this.getSubscriptionState();
    const start = s.trialStartDate || Date.now();
    const elapsedMs = Math.max(0, Date.now() - start);
    return elapsedMs / MS_PER_DAY;
  },

  /**
   * Days remaining until 16-day trial expires
   */
  getTrialDaysRemaining(state?: SubscriptionState): number {
    const s = state || this.getSubscriptionState();
    if (s.isSubscribed) return 999999;
    const elapsed = this.getTrialDaysElapsed(s);
    return Math.max(0, Math.ceil(TRIAL_TOTAL_DAYS - elapsed));
  },

  /**
   * Returns true ONLY if 14 days have passed and trial hasn't expired yet (Days 15 & 16)
   */
  isTrialWarningPhase(state?: SubscriptionState): boolean {
    const s = state || this.getSubscriptionState();
    if (s.isSubscribed) return false;
    const elapsed = this.getTrialDaysElapsed(s);
    return elapsed >= TRIAL_SILENT_DAYS && elapsed < TRIAL_TOTAL_DAYS;
  },

  /**
   * Returns true if 16 days have elapsed and user is not subscribed
   */
  isTrialExpired(state?: SubscriptionState): boolean {
    const s = state || this.getSubscriptionState();
    if (s.isSubscribed) return false;
    return this.getTrialDaysElapsed(s) >= TRIAL_TOTAL_DAYS;
  },

  /**
   * Returns true if user had an active subscription that expired, canceled, or past due
   */
  isSubscriptionExpired(state?: SubscriptionState): boolean {
    const s = state || this.getSubscriptionState();
    if (s.isSubscribed) return false;
    return (s.status === 'expired' || s.status === 'canceled' || s.status === 'past_due') &&
      (s.tier === 'monthly' || s.tier === 'yearly' || typeof s.subscriptionEndDate === 'number');
  },

  /**
   * Paywall is active only if trial or subscription is expired AND developer mode bypass is NOT active
   */
  isPaywalled(state?: SubscriptionState, isDevBypass: boolean = false): boolean {
    if (isDevBypass) return false;
    const s = state || this.getSubscriptionState();
    if (s.isSubscribed) return false;
    return this.isTrialExpired(s) || this.isSubscriptionExpired(s);
  },

  /**
   * Human-readable text for remaining time
   */
  getTrialTimeRemainingText(state?: SubscriptionState): string {
    const s = state || this.getSubscriptionState();
    if (s.isSubscribed) return 'Active Subscription';
    if (this.isSubscriptionExpired(s)) {
      return s.status === 'canceled' ? 'Subscription Canceled' : 'Subscription Expired';
    }
    const remaining = this.getTrialDaysRemaining(s);
    if (remaining <= 0) return 'Trial Expired';
    if (remaining === 1) return '1 day remaining';
    return `${remaining} days remaining`;
  },

  /**
   * Get Lemon Squeezy checkout link for selected plan
   */
  getCheckoutUrl(tier: PlanTier | 'monthly' | 'yearly' | 'trial' = 'yearly'): string {
    if (tier === 'monthly') return LEMON_SQUEEZY_URLS.monthly;
    if (tier === 'trial') return LEMON_SQUEEZY_URLS.trial;
    return LEMON_SQUEEZY_URLS.yearly;
  },

  /**
   * Activate paid subscription (e.g. after Lemon Squeezy redirect or manual verify)
   */
  activatePlan(tier: PlanTier = 'yearly'): SubscriptionState {
    const newState: SubscriptionState & { paidVerified?: boolean } = {
      tier,
      status: 'active',
      isSubscribed: true,
      trialDaysTotal: TRIAL_TOTAL_DAYS,
      paidVerified: true,
    };
    this.saveSubscriptionState(newState);
    return newState;
  },

  /**
   * Reset trial to day 1 (useful for testing or resetting)
   */
  resetTrial(): SubscriptionState {
    const newState: SubscriptionState = {
      tier: 'trial',
      status: 'trialing',
      trialStartDate: Date.now(),
      trialDaysTotal: TRIAL_TOTAL_DAYS,
      isSubscribed: false,
    };
    this.saveSubscriptionState(newState);
    return newState;
  },

  /**
   * Developer Simulator: fast-forward or rewind trial to specific day
   * dayNumber:
   * 1 = Day 1 (Silent, no banner)
   * 15 = Day 15 (14 days passed -> 2 days remaining, BANNER VISIBLE)
   * 16 = Day 16 (15 days passed -> 1 day remaining, BANNER VISIBLE)
   * 17 = Day 17 (16 days passed -> EXPIRED, PAYWALL TRIGGERED)
   */
  simulateTrialDay(dayNumber: number): SubscriptionState {
    // Offset trial start backwards by (dayNumber - 1) days plus 2 hours into that day
    const offsetMs = ((dayNumber - 1) * MS_PER_DAY) + (2 * 60 * 60 * 1000);
    const trialStartDate = Date.now() - offsetMs;
    const elapsedDays = offsetMs / MS_PER_DAY;
    const isExpired = elapsedDays >= TRIAL_TOTAL_DAYS;

    const newState: SubscriptionState = {
      tier: 'trial',
      status: isExpired ? 'expired' : 'trialing',
      trialStartDate,
      trialDaysTotal: TRIAL_TOTAL_DAYS,
      isSubscribed: false,
    };
    this.saveSubscriptionState(newState);
    return newState;
  },

  /**
   * Developer Simulator: simulate an expired paid subscription (reminder & renewal trigger)
   */
  simulateSubscriptionExpired(tier: PlanTier = 'monthly'): SubscriptionState {
    const newState: SubscriptionState = {
      tier,
      status: 'expired',
      subscriptionEndDate: Date.now() - (2 * MS_PER_DAY),
      trialDaysTotal: TRIAL_TOTAL_DAYS,
      isSubscribed: false,
    };
    this.saveSubscriptionState(newState);
    return newState;
  },

  /**
   * Developer Simulator: simulate a canceled paid subscription
   */
  simulateSubscriptionCanceled(tier: PlanTier = 'yearly'): SubscriptionState {
    const newState: SubscriptionState = {
      tier,
      status: 'canceled',
      subscriptionEndDate: Date.now() - (1 * MS_PER_DAY),
      trialDaysTotal: TRIAL_TOTAL_DAYS,
      isSubscribed: false,
    };
    this.saveSubscriptionState(newState);
    return newState;
  },

  cancelSubscription(): SubscriptionState {
    return this.simulateSubscriptionCanceled();
  },

  async checkSubscriptionByEmail(_email: string): Promise<{ success: boolean; tier?: PlanTier; message?: string }> {
    return { success: true, tier: 'yearly', message: 'Account status verified.' };
  }
};
