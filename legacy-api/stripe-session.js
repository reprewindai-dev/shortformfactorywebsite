import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sessionId = req.query.id || req.query.sessionId;
  if (!sessionId) {
    return res.status(400).json({ error: 'Stripe session id is required.' });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return res.status(500).json({ error: 'Stripe secret key not configured.' });
  }

  try {
    const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' });
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'line_items']
    });

    return res.status(200).json({
      id: session.id,
      status: session.status,
      payment_status: session.payment_status,
      amount_total: session.amount_total,
      currency: session.currency,
      customer_details: session.customer_details || null,
      metadata: session.metadata || {},
      created: session.created
    });
  } catch (error) {
    console.error('[Stripe] session lookup error:', error);
    if (error && error.code === 'resource_missing') {
      return res.status(404).json({ error: 'Session not found.' });
    }
    return res.status(500).json({ error: error.message || 'Unable to retrieve session.' });
  }
}
