// Lead Creation API
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      email,
      name,
      phone,
      next_step,
      qualification_data,
      session_id,
      source_url,
      utm_params,
      conversation_history
    } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Create lead record (simplified for now - would normally save to database)
    const leadData = {
      email: email.toLowerCase(),
      name: name || '',
      phone: phone || '',
      lead_score: qualification_data?.lead_score || 0,
      intent_tier: qualification_data?.intent_tier || 'cold',
      recommended_package: qualification_data?.recommended_package || null,
      recommended_next_step: next_step || null,
      source_url: source_url || '',
      utm_params: JSON.stringify(utm_params || {}),
      answers_json: JSON.stringify(qualification_data || {}),
      conversation_history: JSON.stringify(conversation_history || []),
      session_id: session_id || '',
      created_at: new Date().toISOString()
    };

    // Log the lead (in production, save to database)
    console.log('Lead created:', leadData);

    // Send notifications (simplified for now)
    await sendNotifications(leadData, next_step);

    res.status(200).json({
      success: true,
      lead_id: 'lead_' + Date.now(),
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

async function sendNotifications(leadData, nextStep) {
  try {
    // Log notification (in production, send actual emails)
    console.log('Notification sent for lead:', leadData.email, 'Next step:', nextStep);
    
    // In production, you would use Resend or similar service:
    // await resend.emails.send({...});
    
  } catch (error) {
    console.error('Failed to send notifications:', error);
  }
}
