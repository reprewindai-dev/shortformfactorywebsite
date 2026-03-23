// Vercel KV REST client — no package needed, pure fetch
// Setup: Create a KV database in Vercel dashboard → Storage → KV
// Copy KV_REST_API_URL and KV_REST_API_TOKEN into your Vercel env vars

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

function kvHeaders() {
  return { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' };
}

async function kvPipeline(commands) {
  if (!KV_URL || !KV_TOKEN) throw new Error('KV_REST_API_URL / KV_REST_API_TOKEN not configured');
  const res = await fetch(`${KV_URL}/pipeline`, {
    method: 'POST',
    headers: kvHeaders(),
    body: JSON.stringify(commands)
  });
  return res.json();
}

async function kvGet(key) {
  if (!KV_URL || !KV_TOKEN) return null;
  const res = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, { headers: kvHeaders() });
  const data = await res.json();
  if (!data.result) return null;
  try { return JSON.parse(data.result); } catch { return data.result; }
}

async function kvSet(key, value) {
  return kvPipeline([['SET', key, JSON.stringify(value)]]);
}

async function kvKeys(pattern) {
  if (!KV_URL || !KV_TOKEN) return [];
  const res = await fetch(`${KV_URL}/keys/${encodeURIComponent(pattern)}`, { headers: kvHeaders() });
  const data = await res.json();
  return data.result || [];
}

async function kvDel(key) {
  return kvPipeline([['DEL', key]]);
}

// Subscriber-specific helpers
const SUB_PREFIX = 'sff:sub:';

async function getSubscriber(email) {
  return kvGet(`${SUB_PREFIX}${email}`);
}

async function setSubscriber(email, data) {
  return kvSet(`${SUB_PREFIX}${email}`, data);
}

async function getAllSubscriberKeys() {
  return kvKeys(`${SUB_PREFIX}*`);
}

async function deleteSubscriber(email) {
  return kvDel(`${SUB_PREFIX}${email}`);
}

module.exports = { kvGet, kvSet, kvKeys, kvDel, getSubscriber, setSubscriber, getAllSubscriberKeys, deleteSubscriber };
