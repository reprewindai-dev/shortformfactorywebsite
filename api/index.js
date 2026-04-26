// ShortFormFactory — Unified API Router
// Consolidates all endpoints into ONE function to fix the Vercel Hobby 12-function cap
//
// Routes handled:
//   POST /api/concierge/message   POST /api/concierge/track
//   POST /api/capture/email       POST /api/leads/create
//   GET  /api/paypal/config       POST /api/create-order   POST /api/capture-order
//   GET|POST /api/webhook
//   GET  /api/stripe/config       POST /api/stripe/create-session  GET /api/stripe/session

import { Resend } from 'resend';
import Stripe from 'stripe';

// ─── RESEND ──────────────────────────────────────────────────
const FROM_EMAIL  = 'ShortFormFactory <concierge@shortformfactory.com>';
const REPLY_TO    = 'concierge@shortformfactory.com';
const ADMIN_EMAIL = process.env.SALES_ALERT_EMAIL || 'shortformfactory.help@gmail.com';
let _resend = null;
function getResend() {
  if (!_resend && process.env.RESEND_API_KEY) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}
async function sendEmail({ to, subject, html, previewText, replyTo }) {
  const r = getResend();
  if (!r) { console.warn('[email] RESEND_API_KEY not set'); return; }
  const body = previewText ? `<div style="display:none;max-height:0;overflow:hidden;">${previewText}&nbsp;</div>${html}` : html;
  return r.emails.send({ from: FROM_EMAIL, to: Array.isArray(to) ? to : [to], reply_to: replyTo || REPLY_TO, subject, html: body });
}

// ─── KV (Vercel KV REST) ─────────────────────────────────────
const KV_URL  = process.env.KV_REST_API_URL;
const KV_TOK  = process.env.KV_REST_API_TOKEN;
const SUB_PFX = 'sff:sub:';
const LEADS_KEY = 'sff:leads:list';
globalThis.__SFF_LEADS_FALLBACK = globalThis.__SFF_LEADS_FALLBACK || [];
function kvH() { return { Authorization: `Bearer ${KV_TOK}`, 'Content-Type': 'application/json' }; }
async function kvGet(key) {
  if (!KV_URL || !KV_TOK) return null;
  try { const r = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, { headers: kvH() }); const d = await r.json(); if (!d.result) return null; try { return JSON.parse(d.result); } catch { return d.result; } } catch { return null; }
}
async function kvSet(key, value) {
  if (!KV_URL || !KV_TOK) return null;
  return fetch(`${KV_URL}/pipeline`, { method: 'POST', headers: kvH(), body: JSON.stringify([['SET', key, JSON.stringify(value)]]) });
}
const getSub = (e) => kvGet(`${SUB_PFX}${e}`);
const setSub = (e, d) => kvSet(`${SUB_PFX}${e}`, d);
async function getLeads() {
  if (!KV_URL || !KV_TOK) return globalThis.__SFF_LEADS_FALLBACK;
  const leads = await kvGet(LEADS_KEY);
  return Array.isArray(leads) ? leads : [];
}
async function appendLead(lead) {
  if (!KV_URL || !KV_TOK) {
    globalThis.__SFF_LEADS_FALLBACK.unshift(lead);
    if (globalThis.__SFF_LEADS_FALLBACK.length > 500) globalThis.__SFF_LEADS_FALLBACK.length = 500;
    return;
  }
  const leads = await getLeads();
  leads.unshift(lead);
  if (leads.length > 500) leads.length = 500;
  return kvSet(LEADS_KEY, leads);
}

// ─── PRICING ─────────────────────────────────────────────────
const SVC_P = {
  aiReel:{ basic:25, standard:60, premium:140 }, socialEdit:{ basic:30, standard:70, premium:160 },
  viralCaptions:{ basic:20, standard:50, premium:110 }, podcastRepurpose:{ basic:40, standard:95, premium:220 },
  autoCaptions:{ basic:15, standard:35, premium:75 }, smartCut:{ basic:20, standard:50, premium:120 },
  backgroundRemoval:{ basic:25, standard:60, premium:150 }, audioSync:{ basic:15, standard:40, premium:95 },
};
const ADD_P = { rush:25, extraClip:15, extraMinute:10, premiumCaptions:15, colorGrade:20, advancedEffects:25, thumbnails:20, musicLicense:10, sourceFiles:15 };
const SVC_L = { aiReel:'AI Reel Edit', socialEdit:'Social Media Edit', viralCaptions:'Viral Captions', podcastRepurpose:'Podcast / YouTube Repurpose', autoCaptions:'Auto Captions', smartCut:'Video Trim / Smart Cut', backgroundRemoval:'Background Removal', audioSync:'Add Music / Audio Sync' };
function calcTotal(svc, pkg, addons=[]) {
  const p = SVC_P[svc]; if (!p) throw new Error(`Invalid service: ${svc}`);
  const base = p[pkg]; if (base === undefined) throw new Error(`Invalid package: ${pkg}`);
  return base + addons.reduce((s,a) => s + (ADD_P[a]||0), 0);
}

// ─── PAYPAL ───────────────────────────────────────────────────
const PP = process.env.PAYPAL_MODE === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
async function ppToken() {
  const id = process.env.PAYPAL_CLIENT_ID, sec = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !sec) throw new Error('PayPal credentials not configured');
  const r = await fetch(`${PP}/v1/oauth2/token`, { method:'POST', headers:{ Authorization:`Basic ${Buffer.from(`${id}:${sec}`).toString('base64')}`, 'Content-Type':'application/x-www-form-urlencoded' }, body:'grant_type=client_credentials' });
  const d = await r.json(); if (!r.ok) throw new Error(d.error_description || 'PayPal token failed'); return d.access_token;
}
async function ppVerify(req, evt) {
  const wid = process.env.PAYPAL_WEBHOOK_ID; if (!wid) { console.warn('[webhook] no PAYPAL_WEBHOOK_ID'); return true; }
  const tok = await ppToken();
  const r = await fetch(`${PP}/v1/notifications/verify-webhook-signature`, { method:'POST', headers:{ Authorization:`Bearer ${tok}`, 'Content-Type':'application/json' }, body: JSON.stringify({ auth_algo: req.headers['paypal-auth-algo'], cert_url: req.headers['paypal-cert-url'], transmission_id: req.headers['paypal-transmission-id'], transmission_sig: req.headers['paypal-transmission-sig'], transmission_time: req.headers['paypal-transmission-time'], webhook_id: wid, webhook_event: evt }) });
  const d = await r.json(); return d.verification_status === 'SUCCESS';
}

// ─── EMAIL TEMPLATES ─────────────────────────────────────────
function tplContactReply(name) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;"><tr><td align="center"><table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;"><tr><td style="padding:32px 40px 24px;background:#111;border-radius:12px 12px 0 0;border-bottom:1px solid #1e1e1e;"><table width="100%"><tr><td><span style="font-size:13px;font-weight:700;letter-spacing:.12em;color:#888;text-transform:uppercase;">ShortFormFactory</span></td><td align="right"><span style="background:#18181b;border:1px solid #2a2a2a;border-radius:6px;padding:6px 12px;font-size:11px;color:#888;">RESPONSE IN 12–48 HRS</span></td></tr></table></td></tr><tr><td style="padding:40px;background:#111;"><p style="margin:0 0 8px;font-size:13px;color:#666;text-transform:uppercase;">Hey ${name},</p><h1 style="margin:0 0 24px;font-size:26px;font-weight:700;color:#fff;">We got your message.</h1><p style="margin:0 0 24px;font-size:15px;color:#999;line-height:1.7;">Our team will get back to you within <strong style="color:#fff;">12–48 hours</strong>. For active orders, reply with your order details for priority handling.</p><div style="border-top:1px solid #1e1e1e;margin:24px 0;"></div><table width="100%" cellpadding="0" cellspacing="0"><tr><td width="48%" style="background:#18181b;border:1px solid #222;border-radius:8px;padding:18px;"><div style="font-size:11px;color:#666;text-transform:uppercase;margin-bottom:6px;">Services</div><div style="font-size:13px;color:#ccc;">Review our packages + pricing</div><a href="https://shortformfactory.com/services" style="display:inline-block;margin-top:10px;font-size:12px;color:#C6FF40;text-decoration:none;">View services →</a></td><td width="4%"></td><td width="48%" style="background:#18181b;border:1px solid #222;border-radius:8px;padding:18px;"><div style="font-size:11px;color:#666;text-transform:uppercase;margin-bottom:6px;">Order now</div><div style="font-size:13px;color:#ccc;">Place your first order directly</div><a href="https://shortformfactory.com/order" style="display:inline-block;margin-top:10px;font-size:12px;color:#C6FF40;text-decoration:none;">Place order →</a></td></tr></table></td></tr><tr><td style="padding:0 40px 36px;background:#111;"><a href="https://shortformfactory.com/order" style="display:block;text-align:center;background:#fff;color:#000;font-size:14px;font-weight:700;padding:15px 32px;border-radius:8px;text-decoration:none;">Place Your First Order</a></td></tr><tr><td style="padding:20px 40px;background:#0d0d0d;border-radius:0 0 12px 12px;border-top:1px solid #1a1a1a;"><p style="margin:0;font-size:11px;color:#444;">© 2025 ShortFormFactory &bull; <a href="https://shortformfactory.com" style="color:#555;text-decoration:none;">shortformfactory.com</a></p></td></tr></table></td></tr></table></body></html>`;
}

function tplOrderConfirm({ name, service, pkg, total, orderId }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;"><tr><td align="center"><table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;"><tr><td style="padding:32px 40px;background:#111;border-radius:12px 12px 0 0;border-bottom:1px solid #1e1e1e;"><div style="font-size:13px;font-weight:700;letter-spacing:.12em;color:#888;text-transform:uppercase;margin-bottom:16px;">ShortFormFactory</div><div style="background:#052e16;border:1px solid #166534;border-radius:8px;padding:12px 18px;display:inline-block;"><span style="font-size:12px;color:#4ade80;font-weight:600;letter-spacing:.06em;">✓ ORDER CONFIRMED</span></div></td></tr><tr><td style="padding:40px;background:#111;"><h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#fff;">You're in the queue, ${name}.</h1><p style="margin:0 0 28px;font-size:15px;color:#888;">Editing starts immediately. Delivery within 24–48 hours.</p><div style="background:#18181b;border:1px solid #222;border-radius:10px;padding:22px;"><div style="font-size:11px;color:#555;text-transform:uppercase;letter-spacing:.1em;margin-bottom:14px;">Order Summary</div><table width="100%"><tr><td style="font-size:13px;color:#888;padding:5px 0;">Order ID</td><td align="right" style="font-size:13px;color:#ccc;font-weight:600;">SFF-${orderId}</td></tr><tr><td style="font-size:13px;color:#888;padding:5px 0;">Service</td><td align="right" style="font-size:13px;color:#ccc;">${service}</td></tr><tr><td style="font-size:13px;color:#888;padding:5px 0;">Package</td><td align="right" style="font-size:13px;color:#ccc;">${pkg}</td></tr><tr><td colspan="2" style="border-top:1px solid #222;padding-top:10px;"></td></tr><tr><td style="font-size:15px;color:#fff;font-weight:700;">Total</td><td align="right" style="font-size:15px;color:#4ade80;font-weight:700;">$${total} USD</td></tr></table></div><div style="border-top:1px solid #1e1e1e;margin:28px 0;"></div><p style="margin:0 0 8px;font-size:13px;color:#666;text-transform:uppercase;letter-spacing:.08em;">Next step</p><p style="margin:0 0 22px;font-size:15px;color:#999;line-height:1.7;">Reply to this email with your footage links (Google Drive, Dropbox, WeTransfer) and any brand guidelines.</p><a href="mailto:concierge@shortformfactory.com?subject=Assets for SFF-${orderId}" style="display:block;text-align:center;background:#fff;color:#000;font-size:14px;font-weight:700;padding:15px 32px;border-radius:8px;text-decoration:none;">Send Your Assets →</a></td></tr><tr><td style="padding:20px 40px;background:#0d0d0d;border-radius:0 0 12px 12px;border-top:1px solid #1a1a1a;"><p style="margin:0;font-size:11px;color:#444;">© 2025 ShortFormFactory &bull; Questions? Reply to this email.</p></td></tr></table></td></tr></table></body></html>`;
}

function tplLeadAlert({ name, email, score, tier, pkg, source }) {
  const c = score >= 70 ? '#4ade80' : score >= 40 ? '#fbbf24' : '#f87171';
  return `<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#0a0a0a;font-family:monospace;"><div style="max-width:500px;background:#111;border:1px solid #222;border-radius:8px;padding:26px;"><div style="font-size:11px;color:#555;text-transform:uppercase;letter-spacing:.12em;margin-bottom:18px;">SFF Lead · ${new Date().toISOString()}</div><table width="100%" style="border-collapse:collapse;"><tr><td style="padding:7px 0;border-bottom:1px solid #1a1a1a;color:#666;font-size:12px;width:80px;">SOURCE</td><td style="padding:7px 0;border-bottom:1px solid #1a1a1a;color:#fff;font-size:13px;">${source||'website'}</td></tr><tr><td style="padding:7px 0;border-bottom:1px solid #1a1a1a;color:#666;font-size:12px;">NAME</td><td style="padding:7px 0;border-bottom:1px solid #1a1a1a;color:#fff;font-size:13px;">${name||'—'}</td></tr><tr><td style="padding:7px 0;border-bottom:1px solid #1a1a1a;color:#666;font-size:12px;">EMAIL</td><td style="padding:7px 0;border-bottom:1px solid #1a1a1a;color:#4ade80;font-size:13px;">${email}</td></tr><tr><td style="padding:7px 0;border-bottom:1px solid #1a1a1a;color:#666;font-size:12px;">SCORE</td><td style="padding:7px 0;border-bottom:1px solid #1a1a1a;font-weight:700;font-size:13px;color:${c};">${score??'N/A'}/100 — ${(tier||'').toUpperCase()}</td></tr><tr><td style="padding:7px 0;color:#666;font-size:12px;">PACKAGE</td><td style="padding:7px 0;color:#ccc;font-size:13px;">${pkg||'—'}</td></tr></table><a href="mailto:${email}" style="display:inline-block;margin-top:18px;background:${c};color:#000;font-size:12px;font-weight:700;padding:10px 20px;border-radius:6px;text-decoration:none;">Reply to Lead →</a></div></body></html>`;
}

function tplWelcome(name) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;"><tr><td align="center"><table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;"><tr><td style="padding:28px 40px;background:#111;border-radius:12px 12px 0 0;border-bottom:1px solid #1e1e1e;"><span style="color:#C6FF40;font-size:18px;font-weight:800;">SFF</span><span style="color:#fff;font-size:18px;font-weight:600;"> ShortFormFactory</span></td></tr><tr><td style="padding:40px;background:#111;"><p style="margin:0 0 6px;font-size:13px;color:#666;text-transform:uppercase;">Hey${name ? ` ${name}` : ''},</p><h1 style="margin:0 0 18px;font-size:24px;font-weight:800;color:#fff;line-height:1.2;">You found the shortcut most creators never use.</h1><p style="font-size:15px;color:#999;line-height:1.75;margin:0 0 18px;">Every podcast or recorded call you have contains 8–12 short-form moments. We extract them for you — professional quality, 24–48 hours, flat-rate pricing.</p><p style="font-size:15px;color:#999;line-height:1.75;margin:0 0 26px;">Over the next few weeks I'll send you our exact playbook: ROI math, our 14-step extraction process, real case studies, and cost comparisons.</p><a href="https://shortformfactory.com/services" style="display:block;text-align:center;background:#C6FF40;color:#000;font-size:14px;font-weight:800;padding:15px 32px;border-radius:8px;text-decoration:none;margin-bottom:14px;">See Services + Pricing →</a><p style="font-size:13px;color:#555;text-align:center;">Questions? Just reply to this email.</p></td></tr><tr><td style="padding:18px 40px;background:#0d0d0d;border-radius:0 0 12px 12px;border-top:1px solid #1a1a1a;"><p style="margin:0;font-size:11px;color:#333;text-align:center;">ShortFormFactory &bull; shortformfactory.com &bull; North America</p></td></tr></table></td></tr></table></body></html>`;
}

// ─── ROUTE HANDLERS ──────────────────────────────────────────

async function rConciergeMsg(req, res) {
  // Delegate to the existing rule-based concierge — it has no external imports
  const mod = await import('./concierge/message.js');
  return mod.default(req, res);
}

function rTrack(req, res) {
  const { event, session_id, url } = req.body || {};
  if (!event || !session_id) return res.status(400).json({ error: 'event and session_id required' });
  console.log('[track]', { event, session_id, url, ts: Date.now() });
  return res.status(200).json({ success: true });
}

async function rCaptureEmail(req, res) {
  const { email, firstName, source = 'website' } = req.body || {};
  if (!email || !/.+@.+\..+/.test(email)) return res.status(400).json({ error: 'Valid email required' });
  const norm = email.toLowerCase().trim();
  const existing = await getSub(norm).catch(() => null);
  if (existing && !existing.unsubscribed) return res.status(200).json({ status: 'already_subscribed' });
  await setSub(norm, { email: norm, firstName: firstName || '', source, subscribedAt: Date.now(), lastStep: 0, lastSentAt: Date.now(), unsubscribed: false });
  const r = getResend();
  if (r && process.env.RESEND_AUDIENCE_ID) {
    r.contacts.create({ email: norm, firstName: firstName || '', unsubscribed: false, audienceId: process.env.RESEND_AUDIENCE_ID }).catch(e => console.error('[capture] Resend audience:', e.message));
  }
  let welcomeEmailSent = false;
  try {
    const out = await sendEmail({ to: norm, subject: "You found the shortcut — here's what's coming", previewText: 'The content strategy most operators never use.', html: tplWelcome(firstName || '') });
    welcomeEmailSent = Boolean(out && !out.error);
  } catch (e) {
    console.error('[capture] welcome:', e.message);
  }
  console.log(`[funnel] subscribed: ${norm} via ${source}`);
  return res.status(200).json({ status: 'subscribed', email: { welcomeEmailSent } });
}

async function rLeadsCreate(req, res) {
  const { email, name, leadScore, intentTier, recommendedPackage, userAnswers, source_url } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email required' });
  const leadId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const lead = {
    id: leadId,
    created_at: new Date().toISOString(),
    name: name || '',
    email: String(email).toLowerCase(),
    lead_score: Number.isFinite(Number(leadScore)) ? Number(leadScore) : 0,
    intent_tier: intentTier || 'cold',
    recommended_package: recommendedPackage || null,
    recommended_next_step: null,
    answers_json: JSON.stringify(userAnswers || {}),
    source_url: source_url || ''
  };
  console.log('[lead]', { leadId, email, leadScore, intentTier });
  await appendLead(lead).catch((e) => console.error('[lead] kv store:', e.message));
  let adminAlertSent = false;
  let leadConfirmSent = false;
  if (intentTier === 'hot') {
    try {
      const out = await sendEmail({ to: ADMIN_EMAIL, subject: `🔥 HOT Lead — ${name || email} (Score: ${leadScore})`, html: tplLeadAlert({ name, email, score: leadScore, tier: intentTier, pkg: recommendedPackage, source: source_url }) });
      adminAlertSent = Boolean(out && !out.error);
    } catch (e) {
      console.error('[lead] hot alert:', e.message);
    }
  }
  try {
    const out = await sendEmail({ to: email, subject: 'Got your message — ShortFormFactory', html: tplContactReply(name || 'there') });
    leadConfirmSent = Boolean(out && !out.error);
  } catch (e) {
    console.error('[lead] confirm:', e.message);
  }
  return res.status(200).json({ success: true, lead_id: leadId, email: { leadConfirmSent, adminAlertSent } });
}

async function rLeadsList(req, res) {
  const leads = await getLeads().catch(() => []);
  return res.status(200).json(leads);
}

function rPaypalConfig(req, res) {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  if (!clientId) return res.status(200).json({ enabled: false, error: 'PayPal not configured' });
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).json({ enabled: true, clientId, mode: process.env.PAYPAL_MODE || 'sandbox', currency: 'USD' });
}

async function rCreateOrder(req, res) {
  const { service, package: pkg, addons = [] } = req.body || {};
  if (!service || !pkg) return res.status(400).json({ error: 'service and package required' });
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) return res.status(503).json({ error: 'PayPal checkout unavailable' });
  const total = calcTotal(service, pkg, addons);
  const token = await ppToken();
  const base  = process.env.SITE_URL || req.headers.origin || 'https://shortformfactory.com';
  const r = await fetch(`${PP}/v2/checkout/orders`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ intent: 'CAPTURE', purchase_units: [{ amount: { currency_code: 'USD', value: total.toFixed(2) }, description: `ShortFormFactory - ${service} (${pkg})`, custom_id: JSON.stringify({ service, package: pkg, addons }) }], application_context: { brand_name: 'ShortFormFactory', user_action: 'PAY_NOW', return_url: `${base}/thank-you`, cancel_url: `${base}/order` } }) });
  const d = await r.json();
  if (!r.ok) return res.status(r.status).json({ error: d.message || 'PayPal error', debug_id: d.debug_id });
  return res.status(200).json({ orderID: d.id, status: d.status });
}

async function rCaptureOrder(req, res) {
  const { orderID } = req.body || {};
  if (!orderID) return res.status(400).json({ error: 'orderID required' });
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) return res.status(503).json({ error: 'PayPal capture unavailable' });
  const token = await ppToken();
  const r = await fetch(`${PP}/v2/checkout/orders/${orderID}/capture`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
  const d = await r.json();
  if (!r.ok) return res.status(r.status).json({ error: d.message || 'Capture failed', debug_id: d.debug_id });
  const captureId  = d.purchase_units?.[0]?.payments?.captures?.[0]?.id;
  const payerEmail = d.payer?.email_address;
  const payerName  = d.payer?.name?.given_name || 'there';
  const amount     = d.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value;
  let od = {}; try { const c = d.purchase_units?.[0]?.custom_id; if (c) od = JSON.parse(c); } catch {}
  console.log('[capture-order]', { orderID, captureId, payerEmail, amount });
  if (payerEmail) {
    const oid = (captureId || '').slice(-8).toUpperCase() || Date.now().toString(36).toUpperCase();
    await sendEmail({ to: payerEmail, subject: `Order confirmed — SFF-${oid}`, html: tplOrderConfirm({ name: payerName, service: SVC_L[od.service] || 'Video Editing', pkg: od.package || '', total: amount, orderId: oid }) }).catch(e => console.error('[capture-order] confirm:', e.message));
    await sendEmail({ to: ADMIN_EMAIL, subject: `💰 New Order — $${amount} — ${payerEmail}`, html: tplLeadAlert({ name: payerName, email: payerEmail, score: 100, tier: 'hot', pkg: `${od.service}/${od.package}`, source: 'paypal' }) }).catch(e => console.error('[capture-order] alert:', e.message));
  }
  return res.status(200).json({ success: true, status: d.status, orderID, captureID: captureId, payerEmail, amountPaid: amount });
}

async function rWebhook(req, res) {
  const evt  = req.body;
  const type = evt?.event_type;
  console.log('[webhook] incoming:', type);
  const valid = await ppVerify(req, evt);
  if (!valid) return res.status(401).json({ error: 'Invalid signature' });
  if (type === 'PAYMENT.CAPTURE.COMPLETED' || type === 'CHECKOUT.ORDER.COMPLETED') {
    const rs2 = evt.resource;
    const pe  = rs2?.payer?.email_address;
    const amt = rs2?.purchase_units?.[0]?.amount?.value || rs2?.amount?.value;
    let od = {}; try { const c = rs2?.purchase_units?.[0]?.custom_id; if (c) od = JSON.parse(c); } catch {}
    console.log('[webhook] payment completed', { pe, amt });
    if (pe) {
      const oid = (rs2?.id || '').slice(-8).toUpperCase();
      sendEmail({ to: pe, subject: `Order confirmed — SFF-${oid}`, html: tplOrderConfirm({ name: rs2?.payer?.name?.given_name || 'there', service: SVC_L[od.service] || 'Video Editing', pkg: od.package || '', total: amt, orderId: oid }) }).catch(() => {});
    }
  }
  return res.status(200).json({ received: true, eventType: type });
}

function rStripeConfig(req, res) {
  const key = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!key) return res.status(200).json({ enabled: false, error: 'Stripe not configured' });
  return res.status(200).json({ enabled: true, publishableKey: key, mode: key.startsWith('pk_live') ? 'live' : 'test' });
}

async function rStripeCreate(req, res) {
  const sk = process.env.STRIPE_SECRET_KEY; if (!sk) return res.status(503).json({ error: 'Stripe checkout unavailable' });
  const stripe = new Stripe(sk, { apiVersion: '2023-10-16' });
  const { service, package: pkg, addons = [] } = req.body || {};
  if (!service || !pkg) return res.status(400).json({ error: 'service and package required' });
  const p = SVC_P[service]; if (!p) return res.status(400).json({ error: 'Invalid service' });
  const base = p[pkg]; if (!base) return res.status(400).json({ error: 'Invalid package' });
  const items = [{ quantity: 1, price_data: { currency: 'usd', product_data: { name: `${SVC_L[service]} — ${pkg}` }, unit_amount: Math.round(base * 100) } }];
  for (const a of addons) { const ap = ADD_P[a]; if (ap) items.push({ quantity: 1, price_data: { currency: 'usd', product_data: { name: `Add-on: ${a}` }, unit_amount: Math.round(ap * 100) } }); }
  const origin = process.env.SITE_URL || req.headers.origin || 'https://shortformfactory.com';
  const session = await stripe.checkout.sessions.create({ mode: 'payment', line_items: items, payment_method_types: ['card'], allow_promotion_codes: true, metadata: { service, package: pkg, addons: addons.join(',') }, success_url: process.env.STRIPE_SUCCESS_URL || `${origin}/thank-you?provider=stripe&session_id={CHECKOUT_SESSION_ID}`, cancel_url: process.env.STRIPE_CANCEL_URL || `${origin}/order?status=cancelled` });
  return res.status(200).json({ sessionId: session.id });
}

async function rStripeSession(req, res) {
  const sid = req.query.id || req.query.sessionId; if (!sid) return res.status(400).json({ error: 'Session ID required' });
  const sk = process.env.STRIPE_SECRET_KEY; if (!sk) return res.status(500).json({ error: 'Stripe not configured' });
  const stripe = new Stripe(sk, { apiVersion: '2023-10-16' });
  try {
    const s = await stripe.checkout.sessions.retrieve(sid, { expand: ['payment_intent', 'line_items'] });
    return res.status(200).json({ id: s.id, status: s.status, payment_status: s.payment_status, amount_total: s.amount_total, currency: s.currency, customer_details: s.customer_details || null, metadata: s.metadata || {}, created: s.created });
  } catch (e) {
    if (e?.code === 'resource_missing') return res.status(404).json({ error: 'Session not found' });
    return res.status(500).json({ error: e.message });
  }
}

// ─── MAIN ROUTER ─────────────────────────────────────────────
const CORS_H = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req, res) {
  Object.entries(CORS_H).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = (req.url || '').split('?')[0].replace(/\/$/, '');
  const m   = (req.method || '').toUpperCase();

  try {
    if (url.endsWith('/concierge/message')    && m === 'POST') return await rConciergeMsg(req, res);
    if (url.endsWith('/concierge/track')       && m === 'POST') return rTrack(req, res);
    if (url.endsWith('/capture/email')         && m === 'POST') return await rCaptureEmail(req, res);
    if (url.endsWith('/leads/create')          && m === 'POST') return await rLeadsCreate(req, res);
    if (url.endsWith('/leads/list')            && m === 'GET')  return await rLeadsList(req, res);
    if (url.endsWith('/paypal/config')         && m === 'GET')  return rPaypalConfig(req, res);
    if (url.endsWith('/create-order')          && m === 'POST') return await rCreateOrder(req, res);
    if (url.endsWith('/capture-order')         && m === 'POST') return await rCaptureOrder(req, res);
    if (url.endsWith('/webhook')               && m === 'POST') return await rWebhook(req, res);
    if (url.endsWith('/webhook')               && m === 'GET')  return res.status(200).json({ status: 'ok', ts: Date.now() });
    if (url.endsWith('/stripe/config')         && m === 'GET')  return rStripeConfig(req, res);
    if (url.endsWith('/stripe/create-session') && m === 'POST') return await rStripeCreate(req, res);
    if (url.endsWith('/stripe/session')        && m === 'GET')  return await rStripeSession(req, res);
    return res.status(404).json({ error: 'Not found', url, method: m });
  } catch (err) {
    console.error('[api/index] unhandled:', err.message);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
