import Stripe from 'stripe';
import { env } from '../config/env.js';

if (!env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required');
}

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-03-25.dahlia',
});

export interface CreateCheckoutSessionParams {
  userId: string;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
  priceId?: string;
}

export interface CreatePortalSessionParams {
  customerId: string;
  returnUrl: string;
}

/**
 * Create a Stripe Checkout session for Pro subscription
 */
export async function createCheckoutSession({
  userId,
  userEmail,
  successUrl,
  cancelUrl,
  priceId = env.STRIPE_PRICE_ID_PRO_MONTHLY,
}: CreateCheckoutSessionParams) {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: userEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 7, // 7-day free trial
        metadata: {
          userId: userId,
        },
      },
      metadata: {
        userId: userId,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
    });

    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw new Error('Failed to create checkout session');
  }
}

/**
 * Create a Stripe Customer Portal session for subscription management
 */
export async function createPortalSession({
  customerId,
  returnUrl,
}: CreatePortalSessionParams) {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session;
  } catch (error) {
    console.error('Error creating portal session:', error);
    throw new Error('Failed to create portal session');
  }
}

/**
 * Retrieve a customer by email
 */
export async function getCustomerByEmail(email: string) {
  try {
    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    return customers.data.length > 0 ? customers.data[0] : null;
  } catch (error) {
    console.error('Error retrieving customer:', error);
    throw new Error('Failed to retrieve customer');
  }
}

/**
 * Get subscription status for a customer
 */
export async function getCustomerSubscriptions(customerId: string) {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 10,
    });

    return subscriptions.data;
  } catch (error) {
    console.error('Error retrieving subscriptions:', error);
    throw new Error('Failed to retrieve subscriptions');
  }
}

/**
 * Handle webhook events from Stripe
 */
export async function handleWebhook(
  body: string | Buffer,
  signature: string,
  webhookSecret: string
) {
  try {
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return event;
  } catch (error) {
    console.error('Error handling webhook:', error);
    throw new Error('Webhook signature verification failed');
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;
  
  if (!userId) {
    console.error('No userId in subscription metadata');
    return;
  }

  // Update user's subscription status in database
  // This would integrate with your user service
  console.log(`Subscription ${subscription.status} for user ${userId}`);
  
  // TODO: Update user tier in database based on subscription status
  // await updateUserTier(userId, subscription.status === 'active' ? 'pro' : 'free');
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const subscriptionId = ((invoice as any).subscription as string) || '';
  
  console.log(`Payment succeeded for customer ${customerId}, subscription ${subscriptionId}`);
  
  // TODO: Log successful payment, send confirmation email, etc.
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const subscriptionId = ((invoice as any).subscription as string) || '';
  
  console.log(`Payment failed for customer ${customerId}, subscription ${subscriptionId}`);
  
  // TODO: Handle failed payment, send email notification, etc.
}

/**
 * Get pricing information for the frontend
 */
export function getPricingInfo() {
  return {
    pro: {
      priceId: env.STRIPE_PRICE_ID_PRO_MONTHLY,
      price: 29,
      currency: 'USD',
      interval: 'month',
      trialDays: 7,
      features: [
        'Real-time options signals',
        'Advanced analytics & charts',
        'Unlimited watchlists',
        'Live market data feeds',
        'Priority support',
        'Mobile app access',
        'Custom alerts & notifications',
        'Portfolio performance tracking'
      ]
    }
  };
}