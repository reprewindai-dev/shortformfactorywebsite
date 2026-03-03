import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Concierge <concierge@shortformfactory.com>';
const SALES_ALERT_EMAIL = process.env.SALES_ALERT_EMAIL || 'shortformfactory.help@gmail.com';

// Enhanced Lead Creation API with Email Notifications
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

async function sendEmailSafely({ to, subject, body }) {
  if (!resend) {
    console.log('Resend not configured. Skipping email send.', { to, subject });
    console.log(body);
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html: body.replace(/\n/g, '<br>'),
    });
  } catch (error) {
    console.error('Failed to send email via Resend:', error);
  }
}

  try {
    const {
      email,
      name,
      phone,
      leadScore,
      intentTier,
      recommendedPackage,
      recommendedNextStep,
      userAnswers,
      sessionId,
      source_url,
      utm_params,
      user_agent,
      timestamp
    } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Create lead record
    const leadData = {
      id: 'lead_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      email: email.toLowerCase(),
      name: name || '',
      phone: phone || '',
      lead_score: leadScore || 0,
      intent_tier: intentTier || 'cold',
      recommended_package: recommendedPackage || null,
      recommended_next_step: recommendedNextStep || null,
      answers_json: JSON.stringify(userAnswers || {}),
      source_url: source_url || '',
      utm_params: JSON.stringify(utm_params || {}),
      session_id: sessionId || '',
      user_agent: user_agent || '',
      created_at: timestamp || new Date().toISOString()
    };

    // Store lead (in production, save to database)
    console.log('Lead created:', leadData);

    // Send notifications based on intent tier
    await sendNotifications(leadData);

    // Store conversation
    await storeConversation(sessionId, {
      lead_id: leadData.id,
      answers: userAnswers,
      final_recommendation: {
        lead_score: leadScore,
        intent_tier: intentTier,
        recommended_package: recommendedPackage,
        recommended_next_step: recommendedNextStep
      }
    });

    res.status(200).json({
      success: true,
      lead_id: leadData.id,
      message: 'Lead created successfully'
    });

  } catch (error) {
    console.error('Lead creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create lead',
      message: error.message 
    });
  }
}

async function sendNotifications(leadData) {
  try {
    const { intent_tier, email, name, recommended_package, lead_score } = leadData;
    
    // Send notification to business owner for hot leads
    if (intent_tier === 'hot') {
      await sendHotLeadNotification(leadData);
    }
    
    // Send confirmation email to lead
    await sendLeadConfirmation(leadData);
    
    console.log('Notifications sent for lead:', email, 'Intent tier:', intent_tier);
    
  } catch (error) {
    console.error('Failed to send notifications:', error);
  }
}

async function sendHotLeadNotification(leadData) {
  const { email, name, lead_score, recommended_package, answers_json } = leadData;
  const answers = JSON.parse(answers_json || '{}');
  
  const subject = `🔥 New HOT Lead — ShortFormFactory (Score: ${lead_score})`;
  
  const body = `
New hot lead captured!

Contact Information:
- Name: ${name || 'Not provided'}
- Email: ${email}
- Lead Score: ${lead_score}/100
- Intent Tier: ${leadData.intent_tier}
- Recommended Package: ${recommended_package || 'Not determined'}

Qualification Answers:
${Object.entries(answers).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

Next Steps:
1. Contact within 2 hours
2. Send personalized proposal
3. Schedule strategy call

Book a call: https://calendly.com/shortformfactory/strategy-call
  `;

  await sendEmailSafely({ to: SALES_ALERT_EMAIL, subject, body });
}

async function sendLeadConfirmation(leadData) {
  const { email, name, recommended_next_step, recommended_package } = leadData;
  
  let subject, body;
  
  switch (recommended_next_step) {
    case 'book_call':
      subject = 'Your Strategy Call - ShortFormFactory';
      body = `
Hi ${name || 'there'},

Thanks for your interest in ShortFormFactory! Based on our conversation, I recommend scheduling a strategy call to discuss your content goals.

Book your 15-minute strategy call here: https://calendly.com/shortformfactory/strategy-call

During the call, we'll:
- Review your current content strategy
- Discuss your recommended ${recommended_package} package
- Outline a plan to help you achieve your goals
- Answer any questions you have

Looking forward to speaking with you!

Best regards,
The ShortFormFactory Team
      `;
      break;
      
    case 'request_quote':
      subject = 'Your Custom Quote - ShortFormFactory';
      body = `
Hi ${name || 'there'},

Thank you for your interest in ShortFormFactory! I'm preparing a custom quote based on your specific needs and goals.

You can expect to receive your detailed proposal within 24 hours, including:
- Package recommendations
- Pricing options
- Deliverables and timeline
- Next steps to get started

If you have any questions in the meantime, feel free to reply to this email.

Best regards,
The ShortFormFactory Team
      `;
      break;
      
    case 'lead_magnet':
      subject = 'Your Free Content Plan Template - ShortFormFactory';
      body = `
Hi ${name || 'there'},

Here's your free short-form content planning template!

📋 Download Template: https://shortformfactory.com/content-plan-template

This template includes:
- Our proven content planning framework
- Examples of high-performing content structures
- Tips for creating viral short-form content
- A fill-in-the-blank template you can use immediately

When you're ready to take your content to the next level, we're here to help!

Best regards,
The ShortFormFactory Team
      `;
      break;
      
    default:
      subject = 'Thanks for connecting - ShortFormFactory';
      body = `
Hi ${name || 'there'},

Thanks for your interest in ShortFormFactory! I'm here to help you create high-performing short-form content.

Feel free to reply to this email with any questions, or schedule a call to discuss your goals:
https://calendly.com/shortformfactory/strategy-call

Best regards,
The ShortFormFactory Team
      `;
  }
  
  await sendEmailSafely({ to: email, subject, body });
}

async function storeConversation(sessionId, data) {
  try {
    // In production, save to database
    console.log('Conversation stored:', sessionId, data);
  } catch (error) {
    console.error('Failed to store conversation:', error);
  }
}
