import { loadStripe } from '@stripe/stripe-js';
import { config } from '@/config/env';

export const stripePromise = loadStripe(config.STRIPE_PUBLISHABLE_KEY);

export interface PricingInfo {
  pro: {
    priceId: string;
    price: number;
    currency: string;
    interval: string;
    trialDays: number;
    features: string[];
  };
}

export interface SubscriptionStatus {
  tier: 'free' | 'pro';
  status: string;
  subscriptions: Array<{
    id: string;
    status: string;
    currentPeriodEnd: number;
    cancelAtPeriodEnd: boolean;
    trialEnd: number | null;
  }>;
  customer?: {
    id: string;
    email: string;
  };
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
}

class StripeService {
  private baseUrl = `${config.API_BASE_URL}/payments`;

  async getPricing(): Promise<PricingInfo> {
    const response = await fetch(`${this.baseUrl}/pricing`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to get pricing');
    }
    
    return data.data;
  }

  async createCheckoutSession(successUrl: string, cancelUrl: string): Promise<CheckoutSession> {
    const response = await fetch(`${this.baseUrl}/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        successUrl,
        cancelUrl,
      }),
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to create checkout session');
    }
    
    return data.data;
  }

  async createPortalSession(returnUrl: string): Promise<{ url: string }> {
    const response = await fetch(`${this.baseUrl}/create-portal-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        returnUrl,
      }),
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to create portal session');
    }
    
    return data.data;
  }

  async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    const response = await fetch(`${this.baseUrl}/subscription-status`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to get subscription status');
    }
    
    return data.data;
  }

  async redirectToCheckout(sessionId: string) {
    const stripe = await stripePromise;
    
    if (!stripe) {
      throw new Error('Stripe failed to load');
    }

    const { error } = await (stripe as any).redirectToCheckout({ sessionId });
    
    if (error) {
      throw new Error(error.message || 'Failed to redirect to checkout');
    }
  }
}

export const stripeService = new StripeService();