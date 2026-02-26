// Concierge AI Message Handler
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, session_id, conversation_history, qualification_data } = req.body;

    // Rule-based qualification for now (can be enhanced with AI)
    const response = await ruleBasedQualification(message, {
      session_id,
      conversation_history,
      qualification_data
    });

    res.status(200).json(response);

  } catch (error) {
    console.error('Concierge message error:', error);
    
    // Fallback response
    res.status(200).json({
      message: "I'm here to help you get more clients from short-form video. What's your main goal right now - generating leads, sales, or brand awareness?",
      lead_score: 25,
      intent_tier: "cold",
      recommended_next_step: null,
      recommended_package: null,
      next_step: null,
      fallback_used: true
    });
  }
}

async function ruleBasedQualification(message, context) {
  const lowerMessage = message.toLowerCase();
  const messages = context.conversation_history || [];
  const qualificationData = context.qualification_data || {};
  
  let lead_score = qualificationData.lead_score || 25;
  let intent_tier = 'cold';
  let recommended_next_step = null;
  let recommended_package = null;
  let responseMessage = '';

  // Analyze message content
  const buyingSignals = [
    'price', 'cost', 'how much', 'budget', 'invest', 'pay',
    'book', 'call', 'schedule', 'meeting', 'consultation',
    'quote', 'proposal', 'estimate', 'custom',
    'start', 'begin', 'ready', 'interested', 'serious'
  ];

  const highIntentSignals = [
    'urgent', 'asap', 'right now', 'immediately', 'need',
    'decision maker', 'owner', 'founder', 'manager',
    'revenue', 'clients', 'customers', 'growth', 'scale'
  ];

  const hasBuyingSignal = buyingSignals.some(signal => lowerMessage.includes(signal));
  const hasHighIntent = highIntentSignals.some(signal => lowerMessage.includes(signal));

  // Update lead score
  if (hasBuyingSignal) lead_score += 20;
  if (hasHighIntent) lead_score += 15;
  if (messages.length > 3) lead_score += 10; // Engagement bonus

  // Determine intent tier
  if (lead_score >= 70) {
    intent_tier = 'hot';
    recommended_next_step = 'book_call';
    recommended_package = 'growth';
    responseMessage = "Based on what you've shared, you sound like a perfect fit for our services. Let's schedule a quick strategy call to discuss your specific needs and how we can help you scale. I'll prepare personalized recommendations for our conversation.";
  } else if (lead_score >= 40) {
    intent_tier = 'warm';
    recommended_next_step = 'request_quote';
    recommended_package = 'starter';
    responseMessage = "I can definitely help you with short-form video content. Let me prepare a custom quote based on your needs. I'll include different package options so you can see what works best for your budget and goals.";
  } else {
    intent_tier = 'cold';
    recommended_next_step = 'lead_magnet';
    responseMessage = "Great question! Before we dive into specific services, would you like our proven short-form content planning template? It's the exact framework we use with clients to plan viral content. I'll send it over while you think about your goals.";
  }

  // Handle specific keywords
  if (lowerMessage.includes('template') || lowerMessage.includes('guide') || lowerMessage.includes('framework')) {
    recommended_next_step = 'lead_magnet';
    responseMessage = "Perfect! I'll send you our short-form content planning template. It includes our proven framework for planning content that converts. What's the best email to send it to?";
  }

  return {
    message: responseMessage,
    lead_score: Math.min(100, lead_score),
    intent_tier,
    recommended_next_step,
    recommended_package,
    qualification_update: {
      last_message: message,
      buying_signals_detected: hasBuyingSignal,
      high_intent_detected: hasHighIntent
    },
    next_step: recommended_next_step,
    fallback_used: true
  };
}
