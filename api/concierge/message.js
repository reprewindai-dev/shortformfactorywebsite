// Fully Automated Rule-Based Concierge - No Paid APIs Required
// Smart pattern matching, intent detection, and natural conversation flow

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();

  try {
    const { sessionId, conversationState, currentQuestion, userAnswers, questions, message, conversationHistory } = req.body;

    // Rate limiting
    if (isRateLimited(sessionId)) {
      return res.status(200).json({
        message: "I'm processing your request. Give me just a moment!",
        lead_score: calculateLeadScore(userAnswers || {}),
        intent_tier: 'warm',
        recommended_package: null,
        recommended_next_step: 'continue_conversation',
        quick_actions: [],
        model_used: 'rate_limited'
      });
    }

    // Input sanitization
    if (containsDisallowedContent(message)) {
      return res.status(200).json({
        message: "I'm here to help with your short-form video content needs. What are you looking to accomplish?",
        lead_score: 25,
        intent_tier: 'cold',
        recommended_package: null,
        recommended_next_step: 'continue_conversation',
        quick_actions: ['Learn about services', 'See pricing', 'Book a call'],
        model_used: 'filtered'
      });
    }

    // Smart response generation
    const response = generateSmartResponse(message, {
      sessionId,
      conversationState,
      currentQuestion: currentQuestion || 0,
      userAnswers: userAnswers || {},
      questions: questions || [],
      conversationHistory: conversationHistory || []
    });

    // Log interaction
    logInteraction(sessionId, message, response, Date.now() - startTime);

    res.status(200).json({
      ...response,
      model_used: 'smart-rules',
      latency_ms: Date.now() - startTime
    });

  } catch (error) {
    console.error('Concierge error:', error);
    
    res.status(200).json({
      message: "I'd love to help you with your short-form content strategy. What's your main goal right now?",
      lead_score: 25,
      intent_tier: 'cold',
      recommended_package: null,
      recommended_next_step: 'continue_conversation',
      quick_actions: ['Generate more leads', 'Build brand awareness', 'Save time on editing'],
      model_used: 'fallback',
      latency_ms: Date.now() - startTime
    });
  }
}

// ===========================================
// COMPREHENSIVE KNOWLEDGE BASE
// ===========================================

const KNOWLEDGE_BASE = {
  // Services with full details
  services: {
    aiReel: {
      name: 'AI Reel Edit',
      description: 'AI-powered scene detection with viral-style transitions and professional caption overlays',
      pricing: { basic: 25, standard: 60, premium: 140 },
      turnaround: '12-24 hours',
      features: ['AI scene detection', 'Viral transitions', 'Caption overlays', 'Color grading']
    },
    socialEdit: {
      name: 'Social Media Edit',
      description: 'Multi-clip combinations with professional transitions and animated graphics',
      pricing: { basic: 30, standard: 70, premium: 160 },
      turnaround: '12-24 hours',
      features: ['Multi-clip editing', 'Motion graphics', 'Animated text', 'Platform-ready formats']
    },
    viralCaptions: {
      name: 'Viral Captions',
      description: 'High-retention animated captions that keep viewers watching',
      pricing: { basic: 20, standard: 50, premium: 110 },
      turnaround: '12-24 hours',
      features: ['Word-by-word animation', 'Custom fonts', 'Emoji integration', 'Brand colors']
    },
    podcastRepurpose: {
      name: 'Podcast/YouTube Repurpose',
      description: 'Transform long-form content into viral clips',
      pricing: { basic: 40, standard: 95, premium: 220 },
      turnaround: '24-48 hours',
      features: ['Clip discovery', 'Viral captions included', 'B-roll integration', 'Multi-platform crops']
    },
    autoCaptions: {
      name: 'Auto Captions',
      description: 'Automatic transcription with manual review for accuracy',
      pricing: { basic: 15, standard: 35, premium: 75 },
      turnaround: '12-24 hours',
      features: ['AI transcription', 'Manual review', 'SRT delivery', 'Brand styling']
    },
    smartCut: {
      name: 'Video Trim/Smart Cut',
      description: 'Intelligent trimming that removes fillers and pauses',
      pricing: { basic: 20, standard: 50, premium: 120 },
      turnaround: '24-48 hours',
      features: ['Filler removal', 'Pacing optimization', 'Chapter markers', 'Smooth transitions']
    },
    backgroundRemoval: {
      name: 'Background Removal',
      description: 'Professional green screen keying with edge refinement',
      pricing: { basic: 25, standard: 60, premium: 150 },
      turnaround: '12-24 hours',
      features: ['Chroma keying', 'Edge refinement', 'Spill removal', 'Color matching']
    },
    audioSync: {
      name: 'Add Music/Audio Sync',
      description: 'Perfect audio synchronization with beat-matched editing',
      pricing: { basic: 15, standard: 40, premium: 95 },
      turnaround: '12-24 hours',
      features: ['Royalty-free music', 'Beat matching', 'Professional mixing', 'Audio leveling']
    }
  },

  // Monthly packages
  packages: {
    starter: {
      name: 'Starter',
      price: 1500,
      clips: '5/week (20/month)',
      features: ['Basic editing & captions', '2 revisions/month', '48-hour delivery'],
      bestFor: 'Small businesses just starting with video'
    },
    growth: {
      name: 'Growth',
      price: 3500,
      clips: '15/week (60/month)',
      features: ['Premium editing + strategy', 'Content repurposing', '24-hour delivery', 'Performance analytics'],
      bestFor: 'Growing businesses serious about content',
      popular: true
    },
    scale: {
      name: 'Scale',
      price: 7500,
      clips: '30+/week (120+/month)',
      features: ['Full-service production', 'Strategy consulting', '12-hour delivery', 'Dedicated account manager'],
      bestFor: 'Agencies, large brands, high-volume needs'
    }
  },

  // Add-ons (all prices in USD)
  addons: [
    { name: 'Rush Delivery', price: 25 },
    { name: 'Extra Clip', price: 15 },
    { name: 'Extra Minute Raw Footage', price: 10 },
    { name: 'Premium Captions Upgrade', price: 15 },
    { name: 'Color Grade Enhancement', price: 20 },
    { name: 'Advanced Effects Pack', price: 25 },
    { name: 'Thumbnail Pack (3 designs)', price: 20 },
    { name: 'Music Licensing Support', price: 10 },
    { name: 'Source File Delivery', price: 15 }
  ],

  // Revision policy
  revisions: {
    basic: 0,
    standard: 1,
    premium: 2,
    note: 'Within 7 days, within original scope'
  }
};

// ===========================================
// INTENT DETECTION PATTERNS
// ===========================================

const INTENT_PATTERNS = {
  // Pricing questions
  pricing: [
    /how much/i, /price/i, /cost/i, /pricing/i, /expensive/i, /afford/i,
    /budget/i, /rate/i, /fee/i, /charge/i, /\$\d+/i, /dollar/i,
    /cheap/i, /discount/i, /deal/i, /package/i, /plan/i
  ],

  // Service questions
  services: [
    /what.*service/i, /what.*offer/i, /what.*do/i, /what.*provide/i,
    /caption/i, /edit/i, /reel/i, /tiktok/i, /instagram/i, /youtube/i,
    /podcast/i, /repurpose/i, /background/i, /music/i, /audio/i,
    /trim/i, /cut/i, /short.?form/i, /video/i
  ],

  // Turnaround questions
  turnaround: [
    /how long/i, /turnaround/i, /delivery/i, /when.*ready/i, /how fast/i,
    /rush/i, /urgent/i, /asap/i, /quickly/i, /timeline/i, /deadline/i
  ],

  // Ready to buy signals
  readyToBuy: [
    /book.*call/i, /schedule/i, /get started/i, /sign up/i, /ready/i,
    /let'?s do/i, /i want/i, /i need/i, /interested/i, /buy/i,
    /purchase/i, /order/i, /start/i, /begin/i, /hire/i
  ],

  // Objections
  objections: {
    price: [/too expensive/i, /can'?t afford/i, /out of.*budget/i, /cheaper/i],
    timing: [/not.*right time/i, /later/i, /not now/i, /maybe.*future/i],
    trust: [/how.*know/i, /guarantee/i, /refund/i, /trust/i, /scam/i],
    competition: [/already have/i, /use.*else/i, /competitor/i, /other.*service/i],
    uncertainty: [/not sure/i, /think about/i, /need.*time/i, /consider/i]
  },

  // Qualification signals
  qualification: {
    highBudget: [/\$5000/i, /\$10000/i, /5k/i, /10k/i, /unlimited/i, /whatever.*takes/i],
    mediumBudget: [/\$2000/i, /\$3000/i, /2k/i, /3k/i, /few thousand/i],
    lowBudget: [/\$500/i, /\$1000/i, /limited/i, /tight/i, /small.*budget/i],
    highVolume: [/20.*clip/i, /30.*clip/i, /daily/i, /every day/i, /lot.*content/i],
    decisionMaker: [/i.*decide/i, /my.*company/i, /i.*owner/i, /founder/i, /ceo/i],
    urgency: [/asap/i, /urgent/i, /immediately/i, /this week/i, /right away/i]
  },

  // Greetings
  greeting: [
    /^hi$/i, /^hello$/i, /^hey$/i, /^yo$/i, /^sup$/i, /good morning/i,
    /good afternoon/i, /good evening/i, /what'?s up/i
  ],

  // FAQ topics
  faq: {
    revisions: [/revision/i, /change/i, /modify/i, /update/i, /fix/i, /redo/i],
    process: [/how.*work/i, /process/i, /step/i, /workflow/i],
    quality: [/quality/i, /professional/i, /good/i, /example/i, /portfolio/i, /sample/i],
    platforms: [/platform/i, /tiktok/i, /instagram/i, /youtube/i, /facebook/i, /linkedin/i]
  }
};

// ===========================================
// SMART RESPONSE GENERATOR
// ===========================================

function generateSmartResponse(message, context) {
  const lowerMessage = message.toLowerCase().trim();
  const { userAnswers, currentQuestion, conversationHistory } = context;
  
  // Extract any new qualification data from the message
  const extractedData = extractQualificationData(message, userAnswers);
  const updatedAnswers = { ...userAnswers, ...extractedData };
  const leadScore = calculateLeadScore(updatedAnswers);
  const intentTier = getIntentTier(leadScore);

  // Check for greeting first
  if (INTENT_PATTERNS.greeting.some(p => p.test(lowerMessage)) && conversationHistory.length < 2) {
    return {
      message: "Hey! I'm the ShortFormFactory concierge. I help businesses get more clients through short-form video. What are you looking to accomplish with your content?",
      lead_score: leadScore,
      intent_tier: intentTier,
      recommended_package: null,
      recommended_next_step: 'continue_conversation',
      qualification_data: updatedAnswers,
      quick_actions: ['Generate more leads', 'Build brand awareness', 'Save time on editing', 'See pricing']
    };
  }

  // Check for ready to buy signals
  if (INTENT_PATTERNS.readyToBuy.some(p => p.test(lowerMessage))) {
    const pkg = recommendPackage(updatedAnswers);
    return {
      message: `Awesome! Based on what you've shared, I'd recommend our ${KNOWLEDGE_BASE.packages[pkg].name} package at $${KNOWLEDGE_BASE.packages[pkg].price}/month. It includes ${KNOWLEDGE_BASE.packages[pkg].clips} clips with ${KNOWLEDGE_BASE.packages[pkg].features[0].toLowerCase()}. Ready to book a quick strategy call to get you set up?`,
      lead_score: Math.max(leadScore, 70),
      intent_tier: 'hot',
      recommended_package: pkg,
      recommended_next_step: 'book_call',
      qualification_data: updatedAnswers,
      quick_actions: ['Book a call', 'Get a quote first', 'Tell me more about this package']
    };
  }

  // Check for pricing questions
  if (INTENT_PATTERNS.pricing.some(p => p.test(lowerMessage))) {
    return handlePricingQuestion(message, updatedAnswers, leadScore, intentTier);
  }

  // Check for service questions
  if (INTENT_PATTERNS.services.some(p => p.test(lowerMessage))) {
    return handleServiceQuestion(message, updatedAnswers, leadScore, intentTier);
  }

  // Check for turnaround questions
  if (INTENT_PATTERNS.turnaround.some(p => p.test(lowerMessage))) {
    return {
      message: "Most of our services deliver within 12-24 hours. Podcast repurposing and smart cuts take 24-48 hours due to the extra work involved. Need something faster? We offer rush delivery (+$25) for same-day turnaround. What's your timeline looking like?",
      lead_score: leadScore,
      intent_tier: intentTier,
      recommended_package: recommendPackage(updatedAnswers),
      recommended_next_step: 'continue_conversation',
      qualification_data: updatedAnswers,
      quick_actions: ['I need it ASAP', 'Within a week is fine', 'Just exploring for now']
    };
  }

  // Check for objections
  const objectionResponse = handleObjections(message, updatedAnswers, leadScore);
  if (objectionResponse) return objectionResponse;

  // Check for FAQ topics
  const faqResponse = handleFAQ(message, updatedAnswers, leadScore, intentTier);
  if (faqResponse) return faqResponse;

  // Default: Continue qualification or provide recommendation
  if (leadScore >= 60 && Object.keys(updatedAnswers).length >= 3) {
    // Enough info to make recommendation
    const pkg = recommendPackage(updatedAnswers);
    return {
      message: `Based on what you've shared, I think our ${KNOWLEDGE_BASE.packages[pkg].name} package would be perfect for you. It's $${KNOWLEDGE_BASE.packages[pkg].price}/month and includes ${KNOWLEDGE_BASE.packages[pkg].clips} clips. ${KNOWLEDGE_BASE.packages[pkg].bestFor}. Want me to set up a quick call to discuss the details?`,
      lead_score: leadScore,
      intent_tier: intentTier,
      recommended_package: pkg,
      recommended_next_step: intentTier === 'hot' ? 'book_call' : 'request_quote',
      qualification_data: updatedAnswers,
      quick_actions: ['Book a call', 'Get a custom quote', 'Tell me more first']
    };
  }

  // Need more qualification info
  return getNextQualificationQuestion(updatedAnswers, leadScore, intentTier);
}

// ===========================================
// SPECIALIZED HANDLERS
// ===========================================

function handlePricingQuestion(message, answers, leadScore, intentTier) {
  const lowerMessage = message.toLowerCase();
  
  // Check if asking about specific service
  for (const [key, service] of Object.entries(KNOWLEDGE_BASE.services)) {
    if (lowerMessage.includes(service.name.toLowerCase()) || 
        lowerMessage.includes(key.toLowerCase().replace(/([A-Z])/g, ' $1').trim())) {
      return {
        message: `${service.name} pricing: Basic $${service.pricing.basic} | Standard $${service.pricing.standard} | Premium $${service.pricing.premium}. ${service.description}. Turnaround is ${service.turnaround}. Which tier interests you?`,
        lead_score: leadScore,
        intent_tier: intentTier,
        recommended_package: null,
        recommended_next_step: 'continue_conversation',
        qualification_data: answers,
        quick_actions: ['Basic tier', 'Standard tier', 'Premium tier', 'See monthly packages']
      };
    }
  }

  // General pricing overview - show individual services first for accessibility
  return {
    message: `Here's our pricing:\n\n**Individual Services (per video):**\n• Auto Captions: $15-75\n• Viral Captions: $20-110\n• AI Reel Edit: $25-140\n• Social Media Edit: $30-160\n• Podcast Repurpose: $40-220\n• Background Removal: $25-150\n• Audio Sync: $15-95\n• Smart Cut: $20-120\n\n**Monthly Packages (for regular content):**\n• Starter: $1,500/mo (5 clips/week)\n• Growth: $3,500/mo (15 clips/week)\n• Scale: $7,500/mo (30+ clips/week)\n\nAre you looking for a one-time project or ongoing content?`,
    lead_score: leadScore,
    intent_tier: intentTier,
    recommended_package: recommendPackage(answers),
    recommended_next_step: 'continue_conversation',
    qualification_data: answers,
    quick_actions: ['Just one video', 'A few videos', 'Ongoing weekly content', 'Tell me more about packages']
  };
}

function handleServiceQuestion(message, answers, leadScore, intentTier) {
  const lowerMessage = message.toLowerCase();
  
  // Check for specific service mentions
  if (lowerMessage.includes('caption')) {
    return {
      message: "We have two caption services:\n\n**Viral Captions** ($20-110): Animated word-by-word captions that boost retention 3x. Custom fonts, colors, and emoji integration.\n\n**Auto Captions** ($15-75): AI transcription with manual review, SRT file delivery.\n\nViral Captions are our most popular - 85% of videos are watched without sound! Which sounds right for you?",
      lead_score: leadScore,
      intent_tier: intentTier,
      recommended_package: null,
      recommended_next_step: 'continue_conversation',
      qualification_data: answers,
      quick_actions: ['Viral Captions', 'Auto Captions', 'What\'s the difference?', 'See all services']
    };
  }

  if (lowerMessage.includes('podcast') || lowerMessage.includes('repurpose') || lowerMessage.includes('long form') || lowerMessage.includes('youtube')) {
    return {
      message: "Our Podcast/YouTube Repurpose service transforms long-form content into viral clips. We identify the best moments, add viral captions, integrate B-roll, and format for all platforms. Pricing: Basic $40 | Standard $95 | Premium $220. How long are your typical episodes?",
      lead_score: leadScore,
      intent_tier: intentTier,
      recommended_package: null,
      recommended_next_step: 'continue_conversation',
      qualification_data: answers,
      quick_actions: ['Under 30 minutes', '30-60 minutes', 'Over 1 hour', 'See pricing details']
    };
  }

  // General services overview
  return {
    message: "Here's what we offer:\n\n• **AI Reel Edit** - Viral-style editing with AI scene detection\n• **Social Media Edit** - Multi-clip combinations with motion graphics\n• **Viral Captions** - Animated captions that boost retention\n• **Podcast Repurpose** - Turn long-form into viral clips\n• **Background Removal** - Professional green screen keying\n• **Audio Sync** - Beat-matched editing with royalty-free music\n\nWhat type of content are you creating?",
    lead_score: leadScore,
    intent_tier: intentTier,
    recommended_package: null,
    recommended_next_step: 'continue_conversation',
    qualification_data: answers,
    quick_actions: ['Talking head videos', 'Podcast clips', 'Product videos', 'Something else']
  };
}

function handleObjections(message, answers, leadScore) {
  const lowerMessage = message.toLowerCase();

  // Price objection
  if (INTENT_PATTERNS.objections.price.some(p => p.test(lowerMessage))) {
    return {
      message: "I totally get it - budget matters. Here's the thing: our Starter package at $1,500/mo breaks down to just $75 per clip for professional editing. Most clients see 3-5x ROI within 90 days through increased engagement and conversions. We also have individual services starting at $15 if you want to test us out first. What would work better for your situation?",
      lead_score: leadScore,
      intent_tier: 'warm',
      recommended_package: 'starter',
      recommended_next_step: 'request_quote',
      qualification_data: answers,
      quick_actions: ['Tell me about Starter', 'Try a single video first', 'What ROI do clients see?']
    };
  }

  // Timing objection
  if (INTENT_PATTERNS.objections.timing.some(p => p.test(lowerMessage))) {
    return {
      message: "No problem at all! When would be a better time to revisit this? In the meantime, I can send you our free content planning template - it shows exactly how we structure viral content strategies. That way you'll be ready when the time is right.",
      lead_score: Math.max(leadScore - 10, 20),
      intent_tier: 'cold',
      recommended_package: null,
      recommended_next_step: 'lead_magnet',
      qualification_data: answers,
      quick_actions: ['Send the template', 'Check back next month', 'Actually, let\'s talk now']
    };
  }

  // Trust/guarantee objection
  if (INTENT_PATTERNS.objections.trust.some(p => p.test(lowerMessage))) {
    return {
      message: "Great question! We offer a satisfaction guarantee on all work. If you're not happy with the result, we'll revise it until you are (within scope). We've worked with 100+ businesses and maintain a 4.9/5 satisfaction rating. Want to see some examples of our work or client testimonials?",
      lead_score: leadScore,
      intent_tier: 'warm',
      recommended_package: recommendPackage(answers),
      recommended_next_step: 'continue_conversation',
      qualification_data: answers,
      quick_actions: ['Show me examples', 'What\'s your refund policy?', 'I\'m convinced, let\'s go']
    };
  }

  // Already have editor objection
  if (INTENT_PATTERNS.objections.competition.some(p => p.test(lowerMessage))) {
    return {
      message: "That's actually common! Many of our clients have editors too. We provide the systems, strategy, and production infrastructure that makes your existing team more effective. Think of us as your content production partner, not a replacement. What's your current bottleneck - is it volume, quality, or strategy?",
      lead_score: leadScore,
      intent_tier: 'warm',
      recommended_package: recommendPackage(answers),
      recommended_next_step: 'continue_conversation',
      qualification_data: answers,
      quick_actions: ['Volume - need more content', 'Quality - need better results', 'Strategy - need direction']
    };
  }

  // Uncertainty objection
  if (INTENT_PATTERNS.objections.uncertainty.some(p => p.test(lowerMessage))) {
    return {
      message: "Totally understand - this is an important decision. How about I send you our content plan template to review? It shows exactly how we'd structure your content strategy. No pressure, just helpful resources. Or if you prefer, we can do a quick 15-min call where I can answer all your questions.",
      lead_score: leadScore,
      intent_tier: 'warm',
      recommended_package: recommendPackage(answers),
      recommended_next_step: 'lead_magnet',
      qualification_data: answers,
      quick_actions: ['Send the template', 'Book a quick call', 'I have more questions']
    };
  }

  return null; // No objection detected
}

function handleFAQ(message, answers, leadScore, intentTier) {
  const lowerMessage = message.toLowerCase();

  // Revisions FAQ
  if (INTENT_PATTERNS.faq.revisions.some(p => p.test(lowerMessage))) {
    return {
      message: "Here's our revision policy:\n• Basic tier: 0 revisions included\n• Standard tier: 1 revision\n• Premium tier: 2 revisions\n\nAll revision requests must be within the original project scope and submitted within 7 days of delivery. Out-of-scope changes are quoted separately. Most clients find Standard or Premium covers their needs. Which tier are you considering?",
      lead_score: leadScore,
      intent_tier: intentTier,
      recommended_package: recommendPackage(answers),
      recommended_next_step: 'continue_conversation',
      qualification_data: answers,
      quick_actions: ['Standard sounds good', 'Premium for safety', 'What counts as out-of-scope?']
    };
  }

  // Process FAQ
  if (INTENT_PATTERNS.faq.process.some(p => p.test(lowerMessage))) {
    return {
      message: "Here's how it works:\n\n1. **Submit** - Upload your raw footage through our portal\n2. **Edit** - Our team edits within 12-24 hours\n3. **Review** - You get the finished video + revisions if needed\n4. **Publish** - Download and post to your platforms\n\nFor monthly packages, you get a dedicated workflow and priority support. Want to see a demo of the process?",
      lead_score: leadScore,
      intent_tier: intentTier,
      recommended_package: recommendPackage(answers),
      recommended_next_step: 'continue_conversation',
      qualification_data: answers,
      quick_actions: ['Show me a demo', 'How do I submit footage?', 'Let\'s get started']
    };
  }

  // Quality/examples FAQ
  if (INTENT_PATTERNS.faq.quality.some(p => p.test(lowerMessage))) {
    return {
      message: "Great question! We use industry-standard tools and techniques. Our editors specialize in viral short-form content - we know what works on TikTok, Reels, and Shorts. Check out our demo page at shortformfactory.com/demo to see examples of our work. Want me to send you the link?",
      lead_score: leadScore,
      intent_tier: intentTier,
      recommended_package: recommendPackage(answers),
      recommended_next_step: 'continue_conversation',
      qualification_data: answers,
      quick_actions: ['Send the demo link', 'What platforms do you specialize in?', 'I\'m ready to try']
    };
  }

  // Platforms FAQ
  if (INTENT_PATTERNS.faq.platforms.some(p => p.test(lowerMessage))) {
    return {
      message: "We optimize for all major platforms:\n• TikTok (9:16 vertical)\n• Instagram Reels (9:16)\n• YouTube Shorts (9:16)\n• Facebook/LinkedIn (1:1 or 9:16)\n\nWe can deliver multiple formats from the same edit at no extra charge. Which platforms are you focusing on?",
      lead_score: leadScore,
      intent_tier: intentTier,
      recommended_package: recommendPackage(answers),
      recommended_next_step: 'continue_conversation',
      qualification_data: answers,
      quick_actions: ['TikTok & Reels', 'YouTube Shorts', 'All platforms', 'LinkedIn focused']
    };
  }

  return null; // No FAQ match
}

function getNextQualificationQuestion(answers, leadScore, intentTier) {
  // Determine what info we're missing and ask naturally
  
  if (!answers.business_type && !answers.content_type) {
    return {
      message: "To give you the best recommendation, tell me a bit about your business. What do you sell or what industry are you in?",
      lead_score: leadScore,
      intent_tier: intentTier,
      recommended_package: null,
      recommended_next_step: 'continue_conversation',
      qualification_data: answers,
      quick_actions: ['Coaching/Consulting', 'E-commerce/Products', 'SaaS/Tech', 'Agency/Services']
    };
  }

  if (!answers.content_volume && !answers.content_needs) {
    return {
      message: "How much content are you looking to produce? This helps me recommend the right package for you.",
      lead_score: leadScore,
      intent_tier: intentTier,
      recommended_package: null,
      recommended_next_step: 'continue_conversation',
      qualification_data: answers,
      quick_actions: ['5-10 videos/week', '15-20 videos/week', '30+ videos/week', 'Just a few to start']
    };
  }

  if (!answers.budget_range && !answers.marketing_budget) {
    return {
      message: "What's your monthly budget for content production? This helps me match you with the right solution.",
      lead_score: leadScore,
      intent_tier: intentTier,
      recommended_package: null,
      recommended_next_step: 'continue_conversation',
      qualification_data: answers,
      quick_actions: ['Under $1,000', '$1,000-$3,000', '$3,000-$5,000', '$5,000+']
    };
  }

  if (!answers.timeline) {
    return {
      message: "When are you looking to get started? This helps me prioritize your setup.",
      lead_score: leadScore,
      intent_tier: intentTier,
      recommended_package: null,
      recommended_next_step: 'continue_conversation',
      qualification_data: answers,
      quick_actions: ['ASAP', 'Within 2 weeks', 'Within a month', 'Just exploring']
    };
  }

  // Have enough info, make recommendation
  const pkg = recommendPackage(answers);
  return {
    message: `Thanks for sharing! Based on what you've told me, I'd recommend our ${KNOWLEDGE_BASE.packages[pkg].name} package. It's $${KNOWLEDGE_BASE.packages[pkg].price}/month and includes ${KNOWLEDGE_BASE.packages[pkg].clips} clips. ${KNOWLEDGE_BASE.packages[pkg].bestFor}. Sound like a fit?`,
    lead_score: Math.max(leadScore, 50),
    intent_tier: leadScore >= 60 ? 'warm' : intentTier,
    recommended_package: pkg,
    recommended_next_step: leadScore >= 60 ? 'book_call' : 'request_quote',
    qualification_data: answers,
    quick_actions: ['Yes, let\'s do it', 'Tell me more', 'I have questions']
  };
}

// ===========================================
// DATA EXTRACTION
// ===========================================

function extractQualificationData(message, existingData) {
  const lowerMessage = message.toLowerCase();
  const extracted = {};

  // Extract business type
  const businessTypes = {
    'coach': 'coaching', 'coaching': 'coaching', 'consultant': 'consulting',
    'ecommerce': 'ecommerce', 'e-commerce': 'ecommerce', 'product': 'ecommerce',
    'saas': 'saas', 'software': 'saas', 'tech': 'saas', 'app': 'saas',
    'agency': 'agency', 'service': 'services', 'freelance': 'freelance',
    'real estate': 'real_estate', 'realtor': 'real_estate',
    'fitness': 'fitness', 'gym': 'fitness', 'personal trainer': 'fitness',
    'restaurant': 'restaurant', 'food': 'food', 'chef': 'food'
  };
  
  for (const [keyword, type] of Object.entries(businessTypes)) {
    if (lowerMessage.includes(keyword)) {
      extracted.business_type = type;
      break;
    }
  }

  // Extract budget signals
  if (INTENT_PATTERNS.qualification.highBudget.some(p => p.test(lowerMessage))) {
    extracted.budget_range = 'high';
    extracted.marketing_budget = '5000+';
  } else if (INTENT_PATTERNS.qualification.mediumBudget.some(p => p.test(lowerMessage))) {
    extracted.budget_range = 'medium';
    extracted.marketing_budget = '2000-5000';
  } else if (INTENT_PATTERNS.qualification.lowBudget.some(p => p.test(lowerMessage))) {
    extracted.budget_range = 'low';
    extracted.marketing_budget = '500-2000';
  }

  // Extract volume signals
  const volumeMatch = lowerMessage.match(/(\d+)\s*(?:video|clip|reel)/i);
  if (volumeMatch) {
    const num = parseInt(volumeMatch[1]);
    if (num >= 20) extracted.content_volume = 'high';
    else if (num >= 10) extracted.content_volume = 'medium';
    else extracted.content_volume = 'low';
    extracted.content_needs = `${num} clips/week`;
  }

  // Extract timeline
  if (INTENT_PATTERNS.qualification.urgency.some(p => p.test(lowerMessage))) {
    extracted.timeline = 'asap';
  } else if (lowerMessage.includes('month') || lowerMessage.includes('later') || lowerMessage.includes('exploring')) {
    extracted.timeline = 'later';
  } else if (lowerMessage.includes('week') || lowerMessage.includes('soon')) {
    extracted.timeline = '30days';
  }

  // Extract decision maker status
  if (INTENT_PATTERNS.qualification.decisionMaker.some(p => p.test(lowerMessage))) {
    extracted.decision_maker = 'yes';
  }

  // Extract content type preferences
  if (lowerMessage.includes('podcast') || lowerMessage.includes('interview')) {
    extracted.content_type = 'podcast';
  } else if (lowerMessage.includes('talking head') || lowerMessage.includes('face to camera')) {
    extracted.content_type = 'talking_head';
  } else if (lowerMessage.includes('product') || lowerMessage.includes('demo')) {
    extracted.content_type = 'product';
  }

  return extracted;
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

function isRateLimited(sessionId) {
  if (!sessionId) return false;
  
  const rateLimitMap = global._rateLimitMap || new Map();
  global._rateLimitMap = rateLimitMap;
  
  const now = Date.now();
  const requests = rateLimitMap.get(sessionId) || [];
  const recentRequests = requests.filter(t => now - t < 60000);
  
  if (recentRequests.length >= 15) return true;
  
  recentRequests.push(now);
  rateLimitMap.set(sessionId, recentRequests);
  return false;
}

function containsDisallowedContent(message) {
  if (!message) return true;
  
  const disallowedPatterns = [
    /ignore\s+(previous|all)\s+instructions/i,
    /system\s*:/i,
    /<script/i,
    /javascript:/i
  ];
  
  return disallowedPatterns.some(p => p.test(message));
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

// Observability logging
function logInteraction(sessionId, message, response, latencyMs) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    message_preview: message?.substring(0, 50) || '',
    lead_score: response.lead_score,
    intent_tier: response.intent_tier,
    recommended_package: response.recommended_package,
    latency_ms: latencyMs
  };
  
  console.log('CONCIERGE:', JSON.stringify(logEntry));
}
