export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    return res.status(500).json({ error: 'Stripe publishable key not configured.' });
  }

  res.status(200).json({
    publishableKey,
    mode: publishableKey.startsWith('pk_live') ? 'live' : 'test'
  });
}
