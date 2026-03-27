import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { config } from '../config/env.js';
import type { ApiResponse } from '@optionsranker/shared';
import {
  createCheckoutSession,
  createPortalSession,
  getCustomerByEmail,
  getCustomerSubscriptions,
  handleWebhook,
  getPricingInfo,
} from '../services/stripe.service.js';

const router = Router();

/**
 * Get pricing information
 */
router.get('/pricing', (req, res) => {
  try {
    const pricing = getPricingInfo();
    
    const response: ApiResponse<typeof pricing> = {
      success: true,
      data: pricing,
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error getting pricing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pricing information',
    });
  }
});

/**
 * Create checkout session for Pro subscription
 */
router.post('/create-checkout-session', authenticate, async (req, res) => {
  try {
    const { user } = req as any;
    const { successUrl, cancelUrl } = req.body;
    
    if (!successUrl || !cancelUrl) {
      return res.status(400).json({
        success: false,
        error: 'Success URL and cancel URL are required',
      });
    }

    const session = await createCheckoutSession({
      userId: user.id.toString(),
      userEmail: user.email,
      successUrl,
      cancelUrl,
    });

    const response: ApiResponse<{ sessionId: string; url: string }> = {
      success: true,
      data: {
        sessionId: session.id,
        url: session.url!,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create checkout session',
    });
  }
});

/**
 * Create customer portal session for subscription management
 */
router.post('/create-portal-session', authenticate, async (req, res) => {
  try {
    const { user } = req as any;
    const { returnUrl } = req.body;
    
    if (!returnUrl) {
      return res.status(400).json({
        success: false,
        error: 'Return URL is required',
      });
    }

    // Get customer by email
    const customer = await getCustomerByEmail(user.email);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'No subscription found for this account',
      });
    }

    const session = await createPortalSession({
      customerId: customer.id,
      returnUrl,
    });

    const response: ApiResponse<{ url: string }> = {
      success: true,
      data: {
        url: session.url,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create portal session',
    });
  }
});

/**
 * Get subscription status for current user
 */
router.get('/subscription-status', authenticate, async (req, res) => {
  try {
    const { user } = req as any;
    
    // Get customer by email
    const customer = await getCustomerByEmail(user.email);
    
    if (!customer) {
      return res.json({
        success: true,
        data: {
          tier: 'free',
          status: 'inactive',
          subscriptions: [],
        },
      });
    }

    // Get subscriptions
    const subscriptions = await getCustomerSubscriptions(customer.id);
    
    // Find active subscription
    const activeSubscription = subscriptions.find(
      sub => sub.status === 'active' || sub.status === 'trialing'
    );
    
    const response: ApiResponse<{
      tier: 'free' | 'pro';
      status: string;
      subscriptions: any[];
      customer: any;
    }> = {
      success: true,
      data: {
        tier: activeSubscription ? 'pro' : 'free',
        status: activeSubscription?.status || 'inactive',
        subscriptions: subscriptions.map(sub => ({
          id: sub.id,
          status: sub.status,
          currentPeriodEnd: (sub as any).current_period_end,
          cancelAtPeriodEnd: (sub as any).cancel_at_period_end,
          trialEnd: (sub as any).trial_end,
        })),
        customer: {
          id: customer.id,
          email: customer.email,
        },
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting subscription status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get subscription status',
    });
  }
});

/**
 * Stripe webhook endpoint
 */
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  
  if (!config.STRIPE_WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).send('Webhook secret not configured');
  }

  try {
    const event = await handleWebhook(req.body, sig, config.STRIPE_WEBHOOK_SECRET);
    console.log('Processed webhook event:', event.type);
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error}`);
  }
});

export default router;