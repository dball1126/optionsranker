export async function onRequest(context) {
  if (context.request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { STRIPE_WEBHOOK_SECRET } = context.env;
  if (!STRIPE_WEBHOOK_SECRET) {
    return new Response('Webhook secret not configured', { status: 500 });
  }

  const db = context.env.DB;
  if (!db) {
    return new Response('Database not configured', { status: 500 });
  }

  const body = await context.request.text();
  const sig = context.request.headers.get('stripe-signature');

  // Verify HMAC-SHA256 signature
  const verified = await verifyStripeSignature(body, sig, STRIPE_WEBHOOK_SECRET);
  if (!verified) {
    return new Response('Invalid signature', { status: 400 });
  }

  const event = JSON.parse(body);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.metadata?.user_id;
      const customerId = session.customer;
      const subscriptionId = session.subscription;
      if (userId && subscriptionId) {
        await db.prepare(
          `INSERT INTO users (user_id, stripe_customer_id, stripe_subscription_id, subscription_tier, subscription_status, updated_at)
           VALUES (?, ?, ?, 'pro', 'active', datetime('now'))
           ON CONFLICT(user_id) DO UPDATE SET
             stripe_customer_id = excluded.stripe_customer_id,
             stripe_subscription_id = excluded.stripe_subscription_id,
             subscription_tier = 'pro',
             subscription_status = 'active',
             updated_at = datetime('now')`
        ).bind(userId, customerId, subscriptionId).run();
      }
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object;
      const customerId = invoice.customer;
      const row = await db.prepare('SELECT user_id FROM users WHERE stripe_customer_id = ?').bind(customerId).first();
      if (row) {
        await db.prepare(
          `UPDATE users SET subscription_status = 'active', subscription_tier = 'pro', updated_at = datetime('now') WHERE user_id = ?`
        ).bind(row.user_id).run();
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const customerId = invoice.customer;
      const row = await db.prepare('SELECT user_id FROM users WHERE stripe_customer_id = ?').bind(customerId).first();
      if (row) {
        await db.prepare(
          `UPDATE users SET subscription_status = 'past_due', updated_at = datetime('now') WHERE user_id = ?`
        ).bind(row.user_id).run();
      }
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object;
      const customerId = sub.customer;
      const row = await db.prepare('SELECT user_id FROM users WHERE stripe_customer_id = ?').bind(customerId).first();
      if (row) {
        const status = sub.cancel_at_period_end ? 'canceled' : sub.status;
        const expiresAt = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
        await db.prepare(
          `UPDATE users SET subscription_status = ?, subscription_expires_at = ?, updated_at = datetime('now') WHERE user_id = ?`
        ).bind(status, expiresAt, row.user_id).run();
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const customerId = sub.customer;
      const row = await db.prepare('SELECT user_id FROM users WHERE stripe_customer_id = ?').bind(customerId).first();
      if (row) {
        const expiresAt = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : new Date().toISOString();
        await db.prepare(
          `UPDATE users SET subscription_status = 'canceled', subscription_tier = 'free', subscription_expires_at = ?, updated_at = datetime('now') WHERE user_id = ?`
        ).bind(expiresAt, row.user_id).run();
      }
      break;
    }
  }

  return new Response('ok', { status: 200 });
}

async function verifyStripeSignature(payload, header, secret) {
  if (!header) return false;

  const parts = header.split(',').reduce((acc, part) => {
    const [key, val] = part.split('=');
    acc[key.trim()] = val;
    return acc;
  }, {});

  const timestamp = parts['t'];
  const sig = parts['v1'];
  if (!timestamp || !sig) return false;

  // Check timestamp tolerance (5 minutes)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
  const computedSig = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');

  return computedSig === sig;
}
