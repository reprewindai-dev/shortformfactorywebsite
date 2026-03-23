// GET /api/capture/unsubscribe?token=base64url(email)
// Handles one-click unsubscribe from all funnel emails

const { unsubscribeContact } = require('../../lib/resend-client');
const { getSubscriber, setSubscriber } = require('../../lib/kv-client');

module.exports = async function handler(req, res) {
  const { token } = req.query || {};

  if (!token) {
    return res.status(400).send(page('Missing token', 'Invalid unsubscribe link.'));
  }

  let email;
  try {
    email = Buffer.from(token, 'base64url').toString('utf8');
    if (!/.+@.+\..+/.test(email)) throw new Error('invalid');
  } catch {
    return res.status(400).send(page('Invalid link', 'This unsubscribe link is not valid.'));
  }

  try {
    // Mark in KV
    const sub = await getSubscriber(email).catch(() => null);
    if (sub) {
      await setSubscriber(email, { ...sub, unsubscribed: true, unsubscribedAt: Date.now() });
    }

    // Remove from Resend audience
    await unsubscribeContact(email).catch(err =>
      console.error('[unsubscribe] Resend error:', err.message)
    );

    console.log(`[funnel] Unsubscribed: ${email}`);
    return res.status(200).send(page('Unsubscribed', `You've been removed from all ShortFormFactory marketing emails. No further emails will be sent to ${email}.`));
  } catch (err) {
    console.error('[unsubscribe] Error:', err);
    return res.status(500).send(page('Error', 'Something went wrong. Please email us directly at shortformfactory.help@gmail.com to be removed.'));
  }
};

function page(title, message) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — ShortFormFactory</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}
.card{background:#111;border:1px solid rgba(255,255,255,.07);border-radius:20px;padding:48px 40px;max-width:480px;width:100%;text-align:center}
h1{color:#fff;font-size:24px;font-weight:800;margin:0 0 14px}
p{color:#888;font-size:15px;line-height:1.7;margin:0 0 28px}
a{display:inline-block;background:#C6FF40;color:#000;font-weight:800;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none}
</style></head>
<body><div class="card">
<h1>${title}</h1>
<p>${message}</p>
<a href="https://shortformfactory.com">Back to site</a>
</div></body></html>`;
}
