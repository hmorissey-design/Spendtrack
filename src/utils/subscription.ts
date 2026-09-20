/**
 * Lifetime Access Management Utility for ExpenseTrack / LooseBudget
 * Provides unlocked lifetime access (marketed via Digistore24 course bundle).
 */

import { SubscriptionState, PlanTier } from '../types';
import { auth } from '../firebase';
import { CloudDb } from './cloudDb';

const SUBSCRIPTION_STORAGE_KEY = 'expensetrack_subscription_state';

export const DEFAULT_SUBSCRIPTION_STATE: SubscriptionState = {
  tier: 'yearly',
  status: 'active',
  trialDaysTotal: 0,
  isSubscribed: true,
};

export const SubscriptionManager = {
  /**
   * Retrieves the current state from localStorage or returns active lifetime access
   */
  getSubscriptionState(): SubscriptionState {
    try {
      const saved = localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed) {
          // Always ensure full active status
          parsed.isSubscribed = true;
          parsed.status = 'active';
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error reading subscription state:', e);
    }

    const initialState: SubscriptionState = { ...DEFAULT_SUBSCRIPTION_STATE };
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

  getTrialHoursRemaining(_state?: SubscriptionState): number {
    return 999999;
  },

  getTrialDaysRemaining(_state?: SubscriptionState): number {
    return 999999;
  },

  getTrialTimeRemainingText(_state?: SubscriptionState): string {
    return 'Active';
  },

  /**
   * Always false — app is completely unlocked
   */
  isPaywalled(_state?: SubscriptionState): boolean {
    return false;
  },

  startTrial(): SubscriptionState {
    const newState: SubscriptionState = { ...DEFAULT_SUBSCRIPTION_STATE };
    this.saveSubscriptionState(newState);
    return newState;
  },

  activatePlan(tier: PlanTier = 'yearly'): SubscriptionState {
    const newState: SubscriptionState = {
      tier,
      status: 'active',
      isSubscribed: true,
      trialDaysTotal: 0,
    };
    this.saveSubscriptionState(newState);
    return newState;
  },

  cancelSubscription(): SubscriptionState {
    return this.getSubscriptionState();
  },

  async checkSubscriptionByEmail(_email: string): Promise<{ success: boolean; tier?: PlanTier; message?: string }> {
    return { success: true, tier: 'yearly', message: 'Account is active.' };
  },

  getCheckoutUrl(_tier?: string): string {
    return '';
  }
};
