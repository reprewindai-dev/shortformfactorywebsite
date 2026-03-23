// POST /api/capture/email
// Silent subscriber capture — adds to Resend audience + KV state + sends welcome email
// Called from: concierge widget, scroll capture bar, order form, any interaction

const { sendEmail, createContact } = require('../../lib/resend-client');
const { getSubscriber, setSubscriber } = require('../../lib/kv-client');
const { buildEmail, getSequenceStep } = require('../../lib/email-sequences');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function unsubUrl(email) {
  const token = Buffer.from(email).toString('base64url');
  return `https://shortformfactory.com/api/capture/unsubscribe?token=${token}`;
}

module.exports = async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).set(CORS_HEADERS).end();
  }
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, firstName, source = 'website' } = req.body || {};

    if (!email || !/.+@.+\..+/.test(email)) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Idempotency — skip if already subscribed
    const existing = await getSubscriber(normalizedEmail).catch(() => null);
    if (existing && !existing.unsubscribed) {
      return res.status(200).json({ status: 'already_subscribed' });
    }

    const subscribedAt = Date.now();
    const subData = {
      email: normalizedEmail,
      firstName: firstName || '',
      source,
      subscribedAt,
      lastStep: 0,
      lastSentAt: subscribedAt,
      unsubscribed: false,
    };

    // Store in KV (fire-and-forget friendly)
    await setSubscriber(normalizedEmail, subData);

    // Add to Resend audience (non-blocking — don't fail if Resend is down)
    createContact({ email: normalizedEmail, firstName: firstName || '' }).catch(err =>
      console.error('[capture] Resend createContact error:', err.message)
    );

    // Send welcome email (step 0) immediately
    const seq = getSequenceStep(0);
    const html = buildEmail(0, unsubUrl(normalizedEmail));

    if (html && process.env.RESEND_API_KEY) {
      await sendEmail({
        to: normalizedEmail,
        subject: seq.subject,
        previewText: seq.preview,
        html,
      }).catch(err => console.error('[capture] Welcome email error:', err.message));
    }

    // Track the capture event silently
    console.log(`[funnel] New subscriber: ${normalizedEmail} via ${source}`);

    return res.status(200).json({ status: 'subscribed' });
  } catch (err) {
    console.error('[capture/email] Error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
};
