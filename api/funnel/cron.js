// GET /api/funnel/cron
// Vercel Cron Job — runs daily at 9am UTC
// Iterates all active subscribers and sends the next email in their sequence
// Secured with CRON_SECRET header to prevent public triggering

const { sendEmail } = require('../../lib/resend-client');
const { getAllSubscriberKeys, getSubscriber, setSubscriber } = require('../../lib/kv-client');
const { buildEmail, getSequenceStep, getDueStep, SEQUENCE } = require('../../lib/email-sequences');

const MAX_STEPS = SEQUENCE.length - 1;

function unsubUrl(email) {
  const token = Buffer.from(email).toString('base64url');
  return `https://shortformfactory.com/api/capture/unsubscribe?token=${token}`;
}

module.exports = async function handler(req, res) {
  // Allow Vercel cron (Authorization header) or manual trigger with secret
  const authHeader = req.headers['authorization'] || '';
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stats = { processed: 0, sent: 0, skipped: 0, errors: 0, completed: 0 };

  try {
    const keys = await getAllSubscriberKeys();
    stats.processed = keys.length;

    for (const key of keys) {
      const email = key.replace('sff:sub:', '');
      try {
        const sub = await getSubscriber(email);
        if (!sub || sub.unsubscribed) { stats.skipped++; continue; }

        // Calculate which step they should receive next
        const dueStep = getDueStep(sub.subscribedAt);
        const nextStep = (sub.lastStep ?? -1) + 1;

        // Already completed the sequence
        if (nextStep > MAX_STEPS) { stats.completed++; continue; }

        // Not yet time for the next step
        const stepMeta = getSequenceStep(nextStep);
        if (!stepMeta) { stats.skipped++; continue; }

        const daysSince = Math.floor((Date.now() - sub.subscribedAt) / (1000 * 60 * 60 * 24));
        if (daysSince < stepMeta.dayOffset) { stats.skipped++; continue; }

        // Don't resend — check lastStep already covers this
        if (sub.lastStep !== undefined && sub.lastStep >= nextStep) { stats.skipped++; continue; }

        // Build and send email
        const html = buildEmail(nextStep, unsubUrl(email));
        if (!html) { stats.skipped++; continue; }

        await sendEmail({
          to: email,
          subject: stepMeta.subject,
          previewText: stepMeta.preview,
          html,
        });

        // Update subscriber state
        await setSubscriber(email, {
          ...sub,
          lastStep: nextStep,
          lastSentAt: Date.now(),
        });

        stats.sent++;
        console.log(`[funnel:cron] Sent step ${nextStep} to ${email}`);

        // Rate limiting — avoid Resend burst limits
        await new Promise(r => setTimeout(r, 100));
      } catch (err) {
        console.error(`[funnel:cron] Error processing ${email}:`, err.message);
        stats.errors++;
      }
    }

    console.log('[funnel:cron] Complete:', stats);
    return res.status(200).json({ success: true, stats });
  } catch (err) {
    console.error('[funnel:cron] Fatal error:', err);
    return res.status(500).json({ error: 'Cron job failed', message: err.message });
  }
};
