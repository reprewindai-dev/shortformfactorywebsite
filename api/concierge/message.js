// Lean Governed Funnel - Production-Safe AI with Rule-Based Fallback
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId, conversationState, currentQuestion, userAnswers, questions, message } = req.body;

    // P0: Single entrypoint for all AI
    const response = await runGovernedExecution(message, {
      sessionId,
      conversationState,
      currentQuestion,
      userAnswers,
      questions
    });

    // P0: Observability logging
    logInteraction(sessionId, message, response);

    res.status(200).json(response);

  } catch (error) {
    console.error('Governed execution failed:', error);
    
    // Ultimate fallback - always works
    res.status(200).json({
      type: 'question',
      message: "I'm here to help you get more clients from short-form video. What's your main goal right now?",
      lead_score: 25,
      intent_tier: "cold",
      recommended_package: "starter",
      recommended_next_step: "lead_magnet",
      model_used: 'fallback',
      latency_ms: 0,
      fallback_used: true
    });
  }
}

// P0: Single entrypoint for all AI execution
async function runGovernedExecution(message, context) {
  const startTime = Date.now();
  const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  
  // P0: Rate limiting + spam protection
  if (await isRateLimited(context.sessionId)) {
    return {
      type: 'question',
      message: "I'm processing your request. Give me a moment to think about your response.",
      lead_score: calculateLeadScore(context.userAnswers),
      intent_tier: 'warm',
      recommended_package: 'starter',
      recommended_next_step: 'lead_magnet',
      model_used: 'rate_limited',
      latency_ms: Date.now() - startTime,
      fallback_used: true
    };
  }

  // P0: Hard block for disallowed content
  if (containsDisallowedContent(message)) {
    return {
      type: 'question',
      message: "I'm here to help with short-form video content strategy. What are your business goals?",
      lead_score: calculateLeadScore(context.userAnswers),
      intent_tier: 'cold',
      recommended_package: 'starter',
      recommended_next_step: 'lead_magnet',
      model_used: 'content_filtered',
      latency_ms: Date.now() - startTime,
      fallback_used: true
    };
  }

  // P0: Cost guardrails - max turns check
  if (context.currentQuestion >= 8) {
    return generateFinalRecommendation(context.userAnswers);
  }

  let response;
  let modelUsed = 'rule-based';
  let fallbackUsed = false;

  try {
    // Try AI if available and within budget
    if (process.env.HUGGINGFACE_API_KEY && !await exceedsSessionBudget(context.sessionId)) {
      modelUsed = 'huggingface';
      const aiResponse = await callAISafely(message, context);
      
      // P0: Strict JSON schema validation with retry
      const validated = validateAndRetry(aiResponse, context);
      if (validated.valid) {
        response = validated.data;
      } else {
        throw new Error('AI validation failed after retry');
      }
    }
  } catch (error) {
    // P0: Fallback to deterministic rule-based
    console.warn(`AI failed for ${executionId}, using fallback:`, error.message);
    modelUsed = 'rule-based';
    fallbackUsed = true;
    response = await ruleBasedQualification(message, context);
  }

  // P0: Ensure response meets minimum requirements
  response = sanitizeResponse(response);

  return {
    ...response,
    model_used: modelUsed,
    latency_ms: Date.now() - startTime,
    fallback_used: fallbackUsed,
    execution_id: executionId
  };
}

// P0: Rate limiting + spam protection
async function isRateLimited(sessionId) {
  // Simple in-memory rate limiting (production: use Redis)
  const rateLimitMap = global._rateLimitMap || new Map();
  global._rateLimitMap = rateLimitMap;
  
  const now = Date.now();
  const userRequests = rateLimitMap.get(sessionId) || [];
  const recentRequests = userRequests.filter(time => now - time < 60000); // 1 minute window
  
  if (recentRequests.length > 10) { // Max 10 requests per minute
    return true;
  }
  
  recentRequests.push(now);
  rateLimitMap.set(sessionId, recentRequests);
  return false;
}

// P0: Hard block for disallowed content + prompt injection
function containsDisallowedContent(message) {
  const disallowedPatterns = [
    /ignore\s+(previous|all)\s+instructions/i,
    /system\s*:/i,
    /admin\s*panel/i,
    /debug\s*mode/i,
    /execute\s*code/i,
    /sql\s*injection/i,
    /javascript\s*:/i,
    /<script/i,
    /http[s]?:\/\/\s*$/i,
    /\bpassword\b/i,
    /\bsecret\b/i,
    /\btoken\b/i,
    /\bkey\b.*\bapi\b/i
  ];

  return disallowedPatterns.some(pattern => pattern.test(message));
}

// P0: Cost guardrails - per-session budget
async function exceedsSessionBudget(sessionId) {
  // Simple budget tracking (production: use database)
  const budgetMap = global._budgetMap || new Map();
  global._budgetMap = budgetMap;
  
  const sessionCost = budgetMap.get(sessionId) || 0;
  const maxSessionCost = 0.10; // $0.10 per session max
  
  return sessionCost > maxSessionCost;
}

// P0: Safe AI call with cost tracking
async function callAISafely(message, context) {
  const prompt = buildSafePrompt(message, context);
  
  const response = await fetch('https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_length: 100, // P0: Cost control - limit tokens
        temperature: 0.7,
        return_full_text: false,
        max_new_tokens: 50 // P0: Strict token limit
      }
    })
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const aiText = data[0]?.generated_text || '';
  
  // Track cost (simple estimation)
  const budgetMap = global._budgetMap || new Map();
  global._budgetMap = budgetMap;
  const currentCost = budgetMap.get(context.sessionId) || 0;
  budgetMap.set(context.sessionId, currentCost + 0.001); // ~$0.001 per call
  
  return parseAIResponse(aiText, context);
}

// P0: Safe prompt construction
function buildSafePrompt(message, context) {
  const { conversationState, currentQuestion, userAnswers, questions } = context;
  
  return `You are a business development assistant for ShortFormFactory. Help with short-form video content strategy.

Current context: ${conversationState}
Question: ${currentQuestion}
User said: "${message}"

Respond with JSON only:
{
  "type": "question|recommendation|objection",
  "message": "brief response",
  "lead_score": 0-100,
  "intent_tier": "hot|warm|cold",
  "recommended_package": "starter|growth|scale",
  "recommended_next_step": "book_call|request_quote|lead_magnet"
}`;
}

// P0: Strict JSON schema validation with retry
function validateAndRetry(aiResponse, context) {
  const maxRetries = 1; // P0: Single retry only
  let attempts = 0;
  
  while (attempts <= maxRetries) {
    try {
      const parsed = typeof aiResponse === 'string' ? JSON.parse(aiResponse) : aiResponse;
      const validated = validateResponseSchema(parsed);
      
      if (validated.valid) {
        return { valid: true, data: sanitizeResponse(validated.data) };
      }
      
      if (attempts === maxRetries) {
        throw new Error(`Validation failed: ${validated.error}`);
      }
      
      // Retry with corrective prompt
      const correctivePrompt = `Fix this JSON to match schema: ${JSON.stringify(parsed)}`;
      aiResponse = callAISafely(correctivePrompt, context);
      attempts++;
    } catch (error) {
      if (attempts === maxRetries) {
        throw new Error(`JSON parsing failed: ${error.message}`);
      }
      attempts++;
    }
  }
  
  return { valid: false, error: 'Max retries exceeded' };
}

// P0: Schema validation
function validateResponseSchema(response) {
  const required = ['type', 'message', 'lead_score', 'intent_tier', 'recommended_package', 'recommended_next_step'];
  const missing = required.filter(field => !(field in response));
  
  if (missing.length > 0) {
    return { valid: false, error: `Missing: ${missing.join(', ')}` };
  }
  
  const validTypes = ['question', 'recommendation', 'objection'];
  const validTiers = ['hot', 'warm', 'cold'];
  const validPackages = ['starter', 'growth', 'scale'];
  const validSteps = ['book_call', 'request_quote', 'lead_magnet'];
  
  if (!validTypes.includes(response.type)) {
    return { valid: false, error: `Invalid type: ${response.type}` };
  }
  
  if (!validTiers.includes(response.intent_tier)) {
    return { valid: false, error: `Invalid tier: ${response.intent_tier}` };
  }
  
  if (!validPackages.includes(response.recommended_package)) {
    return { valid: false, error: `Invalid package: ${response.recommended_package}` };
  }
  
  if (!validSteps.includes(response.recommended_next_step)) {
    return { valid: false, error: `Invalid step: ${response.recommended_next_step}` };
  }
  
  return { valid: true, data: response };
}

// P0: Response sanitization
function sanitizeResponse(response) {
  return {
    type: response.type || 'question',
    message: String(response.message || '').substring(0, 500), // P0: Limit message length
    lead_score: Math.min(100, Math.max(0, parseInt(response.lead_score) || 25)),
    intent_tier: response.intent_tier || 'cold',
    recommended_package: response.recommended_package || 'starter',
    recommended_next_step: response.recommended_next_step || 'lead_magnet',
    quickActions: Array.isArray(response.quickActions) ? response.quickActions.slice(0, 4) : [] // P0: Limit options
  };
}

// P0: Deterministic rule-based qualification (always works)
async function ruleBasedQualification(message, context) {
  const { conversationState, currentQuestion, userAnswers, questions } = context;
  const lowerMessage = message.toLowerCase();
  
  // Handle qualification flow
  if (conversationState === 'qualification' && questions[currentQuestion]) {
    const question = questions[currentQuestion];
    
    if (question.type === 'buttons') {
      const option = question.options.find(opt => 
        lowerMessage.includes(opt.label.toLowerCase()) || 
        lowerMessage.includes(opt.value.toLowerCase())
      );
      
      if (option) {
        const nextIndex = currentQuestion + 1;
        if (nextIndex >= questions.length) {
          return generateFinalRecommendation(userAnswers);
        }
        
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
    
    const nextIndex = currentQuestion + 1;
    if (nextIndex >= questions.length) {
      return generateFinalRecommendation(userAnswers);
    }
    
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
  
  // Objection handling
  const objections = {
    'price': "I understand pricing is important. We have packages starting at $1,500/mo. Most clients see 3-5x ROI within 90 days. Would you like me to recommend the best package?",
    'expensive': "I understand pricing is important. We have packages starting at $1,500/mo. Most clients see 3-5x ROI within 90 days. Would you like me to recommend the best package?",
    'not sure': "Totally understand - this is important. How about I send you our content plan template to review while you think it over?",
    'think': "Totally understand - this is important. How about I send you our content plan template to review while you think it over?"
  };
  
  for (const [trigger, response] of Object.entries(objections)) {
    if (lowerMessage.includes(trigger)) {
      return {
        type: 'objection',
        message: response,
        quickActions: ['Yes, recommend package', 'Send template'],
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

function generateFinalRecommendation(userAnswers) {
  const leadScore = calculateLeadScore(userAnswers);
  const intentTier = getIntentTier(leadScore);
  const recommendedPackage = recommendPackage(userAnswers);
  const nextStep = getNextStep(intentTier);
  
  const messages = {
    hot: "Perfect! Based on your answers, you're exactly who we help get results. I recommend our Growth package. Let's book a 15-minute call to finalize your content strategy.",
    warm: "You're on the right track! I can prepare a custom quote based on your needs with different package options.",
    cold: "Here's a free resource to help you get started - our proven short-form content planning template."
  };
  
  return {
    type: 'recommendation',
    message: messages[intentTier],
    lead_score: leadScore,
    intent_tier: intentTier,
    recommended_package: recommendedPackage,
    recommended_next_step: nextStep
  };
}

function calculateLeadScore(answers) {
  let score = 0;
  
  if (answers.revenue === '100k+') score += 25;
  else if (answers.revenue === '25k-100k') score += 20;
  else if (answers.revenue === '5k-25k') score += 15;
  else score += 5;
  
  if (answers.marketing_budget === '5000+') score += 25;
  else if (answers.marketing_budget === '2000-5000') score += 20;
  else if (answers.marketing_budget === '500-2000') score += 15;
  else score += 5;
  
  if (answers.timeline === 'asap') score += 20;
  else if (answers.timeline === '30days') score += 15;
  else score += 5;
  
  if (answers.decision_maker === 'yes') score += 15;
  else score += 5;
  
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

function parseAIResponse(aiText, context) {
  const jsonMatch = aiText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      // Fall through
    }
  }
  
  return {
    type: 'question',
    message: aiText || "I'm here to help you get more clients from short-form content.",
    lead_score: 25,
    intent_tier: 'cold',
    recommended_package: 'starter',
    recommended_next_step: 'lead_magnet'
  };
}

// P0: Observability logging
function logInteraction(sessionId, message, response) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    message_length: message.length,
    response_type: response.type,
    lead_score: response.lead_score,
    intent_tier: response.intent_tier,
    model_used: response.model_used,
    latency_ms: response.latency_ms,
    fallback_used: response.fallback_used,
    execution_id: response.execution_id
  };
  
  console.log('GOVERNED_EXECUTION:', JSON.stringify(logEntry));
  
  // In production: send to analytics/logging service
  // analytics.track('governed_execution', logEntry);
}
