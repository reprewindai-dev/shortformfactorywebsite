const { Resend } = require('resend');

let _client = null;
function getClient() {
  if (!_client) _client = new Resend(process.env.RESEND_API_KEY);
  return _client;
}

const FROM = process.env.RESEND_FROM_EMAIL || 'ShortFormFactory <hello@shortformfactory.com>';
const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;

async function sendEmail({ to, subject, html, previewText, replyTo }) {
  const client = getClient();
  const finalHtml = previewText
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${previewText}&nbsp;‌&nbsp;‌&nbsp;</div>${html}`
    : html;
  return client.emails.send({
    from: FROM,
    to: Array.isArray(to) ? to : [to],
    subject,
    html: finalHtml,
    ...(replyTo ? { reply_to: replyTo } : {})
  });
}

async function createContact({ email, firstName, lastName }) {
  if (!AUDIENCE_ID) throw new Error('RESEND_AUDIENCE_ID not configured');
  const client = getClient();
  return client.contacts.create({
    email,
    firstName: firstName || '',
    lastName: lastName || '',
    unsubscribed: false,
    audienceId: AUDIENCE_ID
  });
}

async function listContacts() {
  if (!AUDIENCE_ID) throw new Error('RESEND_AUDIENCE_ID not configured');
  const client = getClient();
  const result = await client.contacts.list({ audienceId: AUDIENCE_ID });
  return result.data?.data || [];
}

async function unsubscribeContact(email) {
  if (!AUDIENCE_ID) throw new Error('RESEND_AUDIENCE_ID not configured');
  const client = getClient();
  const contacts = await listContacts();
  const contact = contacts.find(c => c.email === email);
  if (contact) {
    await client.contacts.update({
      id: contact.id,
      audienceId: AUDIENCE_ID,
      unsubscribed: true
    });
    return true;
  }
  return false;
}

module.exports = { sendEmail, createContact, listContacts, unsubscribeContact };
