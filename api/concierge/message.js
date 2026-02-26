// Enhanced Concierge AI Message Handler with Hugging Face Integration
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId, conversationState, currentQuestion, userAnswers, questions, message } = req.body;

    // Try AI first, fallback to rule-based
    let response;
    try {
      response = await runGovernedExecution(message, {
        sessionId,
        conversationState,
        currentQuestion,
        userAnswers,
        questions
      });
    } catch (aiError) {
      console.warn('AI failed, using fallback:', aiError.message);
      response = await ruleBasedQualification(message, {
        sessionId,
        conversationState,
        currentQuestion,
        userAnswers,
        questions
      });
    }

    // Log the interaction
    await logInteraction(sessionId, message, response);

    res.status(200).json(response);

  } catch (error) {
    console.error('Concierge message error:', error);
    
    // Ultimate fallback
    res.status(200).json({
      type: 'question',
      message: "I'm here to help you get more clients from short-form video. What's your main goal right now - generating leads, sales, or brand awareness?",
      lead_score: 25,
      intent_tier: "cold",
      recommended_next_step: null,
      recommended_package: null,
      fallback_used: true
    });
  }
}

async function runGovernedExecution(message, context) {
  const startTime = Date.now();
  let modelUsed = 'rule-based';
  let fallbackUsed = false;
  
  try {
    // Try Hugging Face if token is available
    if (process.env.HUGGINGFACE_API_KEY) {
      modelUsed = 'huggingface';
      const aiResponse = await callHuggingFace(message, context);
      
      // Validate response schema
      const validated = validateResponseSchema(aiResponse);
      if (!validated.valid) {
        throw new Error('Invalid response schema from AI');
      }
      
      return {
        ...validated.data,
        model_used: modelUsed,
        latency_ms: Date.now() - startTime,
        fallback_used: false
      };
    }
  } catch (error) {
    console.warn('AI call failed:', error.message);
    fallbackUsed = true;
  }
  
  // Fallback to rule-based
  const ruleResponse = await ruleBasedQualification(message, context);
  
  return {
    ...ruleResponse,
    model_used: modelUsed,
    latency_ms: Date.now() - startTime,
    fallback_used: fallbackUsed
  };
}

async function callHuggingFace(message, context) {
  const prompt = buildPrompt(message, context);
  
  const response = await fetch('https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_length: 150,
        temperature: 0.7,
        return_full_text: false
      }
    })
  });

  if (!response.ok) {
    throw new Error('Hugging Face API error');
  }

  const data = await response.json();
  const aiText = data[0]?.generated_text || '';
  
  // Convert AI response to structured format
  return parseAIResponse(aiText, context);
}

function buildPrompt(message, context) {
  const { conversationState, currentQuestion, userAnswers, questions } = context;
  
  let prompt = `You are a professional business development assistant for ShortFormFactory, a short-form video editing service. Your goal is to qualify leads and recommend the best next step.

Current conversation state: ${conversationState}
Current question index: ${currentQuestion}
User answers so far: ${JSON.stringify(userAnswers, null, 2)}

Available questions:
${questions.map((q, i) => `${i}. ${q.text}`).join('\n')}

User just said: "${message}"

Respond with a JSON object containing:
{
  "type": "question" | "recommendation" | "objection",
  "message": "your response text",
  "quickActions": ["optional", "button", "texts"],
  "lead_score": 0-100,
  "intent_tier": "hot" | "warm" | "cold",
  "recommended_package": "starter" | "growth" | "scale",
  "recommended_next_step": "book_call" | "request_quote" | "lead_magnet"
}

Be conversational but professional. Focus on qualifying the lead and moving them to the appropriate next step.`;

  return prompt;
}

function parseAIResponse(aiText, context) {
  // Try to extract JSON from AI response
  const jsonMatch = aiText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return validateAndEnhanceResponse(parsed, context);
    } catch (e) {
      // Fall through to rule-based
    }
  }
  
  // If no valid JSON, create structured response from text
  return {
    type: 'question',
    message: aiText || "I'm here to help you get more clients from short-form content.",
    lead_score: 25,
    intent_tier: 'cold',
    recommended_package: 'starter',
    recommended_next_step: 'lead_magnet'
  };
}

function validateResponseSchema(response) {
  const required = ['type', 'message', 'lead_score', 'intent_tier', 'recommended_package', 'recommended_next_step'];
  const missing = required.filter(field => !(field in response));
  
  if (missing.length > 0) {
    return { valid: false, error: `Missing required fields: ${missing.join(', ')}` };
  }
  
  const validTypes = ['question', 'recommendation', 'objection'];
  if (!validTypes.includes(response.type)) {
    return { valid: false, error: `Invalid type: ${response.type}` };
  }
  
  const validTiers = ['hot', 'warm', 'cold'];
  if (!validTiers.includes(response.intent_tier)) {
    return { valid: false, error: `Invalid intent_tier: ${response.intent_tier}` };
  }
  
  const validPackages = ['starter', 'growth', 'scale'];
  if (!validPackages.includes(response.recommended_package)) {
    return { valid: false, error: `Invalid recommended_package: ${response.recommended_package}` };
  }
  
  const validSteps = ['book_call', 'request_quote', 'lead_magnet'];
  if (!validSteps.includes(response.recommended_next_step)) {
    return { valid: false, error: `Invalid recommended_next_step: ${response.recommended_next_step}` };
  }
  
  return { valid: true, data: response };
}

function validateAndEnhanceResponse(response, context) {
  // Ensure all required fields exist
  const enhanced = {
    type: response.type || 'question',
    message: response.message || "I'm here to help you.",
    quickActions: response.quickActions || [],
    lead_score: Math.min(100, Math.max(0, response.lead_score || 25)),
    intent_tier: response.intent_tier || 'cold',
    recommended_package: response.recommended_package || 'starter',
    recommended_next_step: response.recommended_next_step || 'lead_magnet'
  };
  
  return enhanced;
}

async function ruleBasedQualification(message, context) {
  const { conversationState, currentQuestion, userAnswers, questions } = context;
  const lowerMessage = message.toLowerCase();
  
  // Handle qualification flow
  if (conversationState === 'qualification' && questions[currentQuestion]) {
    const question = questions[currentQuestion];
    
    if (question.type === 'buttons') {
      // Check if user selected a valid option
      const option = question.options.find(opt => 
        lowerMessage.includes(opt.label.toLowerCase()) || 
        lowerMessage.includes(opt.value.toLowerCase())
      );
      
      if (option) {
        // Move to next question
        const nextIndex = currentQuestion + 1;
        
        if (nextIndex >= questions.length) {
          // All questions answered - generate recommendation
          return generateFinalRecommendation(userAnswers, message);
        } else {
          // Ask next question
          const nextQuestion = questions[nextIndex];
          return {
            type: 'question',
            message: nextQuestion.text,
            quickActions: nextQuestion.type === 'buttons' ? nextQuestion.options.map(opt => opt.label) : [],
            lead_score: calculateLeadScore(userAnswers),
            intent_tier: 'warm',
            recommended_package: 'starter',
            recommended_next_step: 'lead_magnet'
          };
        }
      }
    }
    
    // For text questions, just move to next question
    const nextIndex = currentQuestion + 1;
    if (nextIndex >= questions.length) {
      return generateFinalRecommendation(userAnswers, message);
    } else {
      const nextQuestion = questions[nextIndex];
      return {
        type: 'question',
        message: nextQuestion.text,
        quickActions: nextQuestion.type === 'buttons' ? nextQuestion.options.map(opt => opt.label) : [],
        lead_score: calculateLeadScore(userAnswers),
        intent_tier: 'warm',
        recommended_package: 'starter',
        recommended_next_step: 'lead_magnet'
      };
    }
  }
  
  // Handle objections and general conversation
  const objections = {
    'price': {
      message: "I understand pricing is important. We have packages starting at $1,500/mo for 5 clips per week. Most clients see 3-5x ROI within 90 days. Would you like me to recommend the best package for your goals?",
      quickActions: ['Yes, recommend package', 'Tell me more about pricing']
    },
    'expensive': {
      message: "I understand pricing is important. We have packages starting at $1,500/mo for 5 clips per week. Most clients see 3-5x ROI within 90 days. Would you like me to recommend the best package for your goals?",
      quickActions: ['Yes, recommend package', 'Tell me more about pricing']
    },
    'not sure': {
      message: "Totally understand - this is an important decision. How about I send you our content plan template to review while you think it over? No pressure, just helpful resources.",
      quickActions: ['Send template', 'I have questions']
    },
    'think': {
      message: "Totally understand - this is an important decision. How about I send you our content plan template to review while you think it over? No pressure, just helpful resources.",
      quickActions: ['Send template', 'I have questions']
    }
  };
  
  for (const [trigger, response] of Object.entries(objections)) {
    if (lowerMessage.includes(trigger)) {
      return {
        type: 'objection',
        ...response,
        lead_score: calculateLeadScore(userAnswers),
        intent_tier: 'warm',
        recommended_package: 'starter',
        recommended_next_step: 'lead_magnet'
      };
    }
  }
  
  // Default response
  return {
    type: 'question',
    message: "Thanks for sharing! Let me ask you: " + (questions[currentQuestion]?.text || "What's your biggest goal right now?"),
    lead_score: calculateLeadScore(userAnswers),
    intent_tier: 'cold',
    recommended_package: 'starter',
    recommended_next_step: 'lead_magnet'
  };
}

function generateFinalRecommendation(userAnswers, lastMessage) {
  const leadScore = calculateLeadScore(userAnswers);
  const intentTier = getIntentTier(leadScore);
  const recommendedPackage = recommendPackage(userAnswers);
  const nextStep = getNextStep(intentTier);
  
  const messages = {
    hot: {
      book_call: "Perfect! Based on your answers, you're exactly who we help get results. I recommend our Growth package to start. Let's book a 15-minute call to finalize your content strategy.",
      request_quote: "Great! You're a good fit for our services. I'll prepare a custom quote for you based on your needs.",
      lead_magnet: "Thanks for sharing! Here's a free resource to help you get started."
    },
    warm: {
      book_call: "You're on the right track! A quick call would help me give you the best recommendation.",
      request_quote: "I can prepare a detailed proposal for your review. Let me gather a few more details.",
      lead_magnet: "Here's some helpful information while you consider your options."
    },
    cold: {
      book_call: "When you're ready to explore this seriously, we should definitely talk.",
      request_quote: "I can send you some information to review when the time is right.",
      lead_magnet: "Here's a free template to help you plan your content strategy."
    }
  };
  
  return {
    type: 'recommendation',
    message: messages[intentTier][nextStep],
    lead_score: leadScore,
    intent_tier: intentTier,
    recommended_package: recommendedPackage,
    recommended_next_step: nextStep
  };
}

function calculateLeadScore(answers) {
  let score = 0;
  
  // Revenue scoring
  if (answers.revenue === '100k+') score += 25;
  else if (answers.revenue === '25k-100k') score += 20;
  else if (answers.revenue === '5k-25k') score += 15;
  else score += 5;
  
  // Budget scoring
  if (answers.marketing_budget === '5000+') score += 25;
  else if (answers.marketing_budget === '2000-5000') score += 20;
  else if (answers.marketing_budget === '500-2000') score += 15;
  else score += 5;
  
  // Timeline scoring
  if (answers.timeline === 'asap') score += 20;
  else if (answers.timeline === '30days') score += 15;
  else score += 5;
  
  // Decision maker scoring
  if (answers.decision_maker === 'yes') score += 15;
  else score += 5;
  
  // Content needs scoring
  if (answers.content_needs && answers.content_needs.includes('10')) score += 15;
  else if (answers.content_needs && answers.content_needs.includes('5')) score += 10;
  else score += 5;
  
  return Math.min(score, 100);
}

function getIntentTier(score) {
  if (score >= 70) return 'hot';
  if (score >= 40) return 'warm';
  return 'cold';
}

function recommendPackage(answers) {
  const budget = answers.marketing_budget;
  const contentNeeds = answers.content_needs || '';
  
  if (budget === '5000+' || contentNeeds.includes('20')) return 'scale';
  if (budget === '2000-5000' || contentNeeds.includes('10')) return 'growth';
  return 'starter';
}

function getNextStep(tier) {
  if (tier === 'hot') return 'book_call';
  if (tier === 'warm') return 'request_quote';
  return 'lead_magnet';
}

async function logInteraction(sessionId, message, response) {
  try {
    // Log to database or analytics service
    console.log('Interaction logged:', {
      sessionId,
      message: message.substring(0, 100),
      response_type: response.type,
      lead_score: response.lead_score,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // Fail silently
  }
}
