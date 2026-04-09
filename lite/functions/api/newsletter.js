export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    
    // Parse request body
    const body = await request.json();
    const { email, frequency, site } = body;
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email address' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }
    
    // Validate frequency
    if (!['daily', 'weekly'].includes(frequency)) {
      return new Response(JSON.stringify({ error: 'Invalid frequency' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    // Store subscription in KV (if available)
    // For MVP, we'll just return success
    // In production, you'd store this in a database or email service
    const subscription = {
      email,
      frequency,
      site,
      subscribedAt: new Date().toISOString(),
      status: 'active'
    };
    
    // Store in KV if available
    if (env && env.NEWSLETTER_KV) {
      const key = `subscription:${site}:${email}`;
      await env.NEWSLETTER_KV.put(key, JSON.stringify(subscription));
    }
    
    // In production, you'd also add to your email service like:
    // - Mailchimp
    // - ConvertKit  
    // - Sendgrid
    // - Resend
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Successfully subscribed to newsletter',
      subscription: { email, frequency, site }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
    
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}