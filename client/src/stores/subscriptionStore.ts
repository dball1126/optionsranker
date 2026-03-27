import { create } from 'zustand';
import { stripeService, type SubscriptionStatus, type PricingInfo } from '@/lib/stripe';

interface SubscriptionState {
  // State
  subscription: SubscriptionStatus | null;
  pricing: PricingInfo | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  loadSubscription: () => Promise<void>;
  loadPricing: () => Promise<void>;
  createCheckoutSession: (successUrl?: string, cancelUrl?: string) => Promise<void>;
  manageBilling: (returnUrl?: string) => Promise<void>;
  clearError: () => void;
  
  // Getters
  isPro: () => boolean;
  isTrialing: () => boolean;
  subscriptionEndDate: () => Date | null;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  // Initial state
  subscription: null,
  pricing: null,
  loading: false,
  error: null,

  // Actions
  loadSubscription: async () => {
    set({ loading: true, error: null });
    
    try {
      const subscription = await stripeService.getSubscriptionStatus();
      set({ subscription, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load subscription',
        loading: false 
      });
    }
  },

  loadPricing: async () => {
    set({ loading: true, error: null });
    
    try {
      const pricing = await stripeService.getPricing();
      set({ pricing, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load pricing',
        loading: false 
      });
    }
  },

  createCheckoutSession: async (
    successUrl = `${window.location.origin}/dashboard?success=true`,
    cancelUrl = `${window.location.origin}/dashboard`
  ) => {
    set({ loading: true, error: null });
    
    try {
      const session = await stripeService.createCheckoutSession(successUrl, cancelUrl);
      await stripeService.redirectToCheckout(session.sessionId);
      set({ loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create checkout session',
        loading: false 
      });
    }
  },

  manageBilling: async (returnUrl = `${window.location.origin}/dashboard`) => {
    set({ loading: true, error: null });
    
    try {
      const session = await stripeService.createPortalSession(returnUrl);
      window.location.href = session.url;
      set({ loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to access billing portal',
        loading: false 
      });
    }
  },

  clearError: () => set({ error: null }),

  // Getters
  isPro: () => {
    const { subscription } = get();
    return subscription?.tier === 'pro';
  },

  isTrialing: () => {
    const { subscription } = get();
    return subscription?.subscriptions.some(sub => 
      sub.status === 'trialing' && sub.trialEnd && sub.trialEnd > Date.now() / 1000
    ) || false;
  },

  subscriptionEndDate: () => {
    const { subscription } = get();
    const activeSub = subscription?.subscriptions.find(sub => 
      sub.status === 'active' || sub.status === 'trialing'
    );
    
    if (!activeSub) return null;
    
    return new Date(activeSub.currentPeriodEnd * 1000);
  },
}));