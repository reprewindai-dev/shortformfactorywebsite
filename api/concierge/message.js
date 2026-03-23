// ShortFormFactory Booking Concierge
// Service-guide focused — only references actual website services and pricing

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
        message: "Give me just a second — I'm still processing your last message!",
        lead_score: 50,
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
        message: "I'm here to help you with ShortFormFactory's video editing services. What can I help you with today?",
        lead_score: 25,
        intent_tier: 'cold',
        recommended_package: null,
        recommended_next_step: 'continue_conversation',
        quick_actions: ['See our services', 'Get pricing', 'Book a call'],
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
      message: "Happy to help! You can explore our services at shortformfactory.com/services, place an order at /order, or book a strategy call. What would you like to do?",
      lead_score: 25,
      intent_tier: 'cold',
      recommended_package: null,
      recommended_next_step: 'continue_conversation',
      quick_actions: ['See services', 'Get pricing', 'Place an order', 'Book a call'],
      model_used: 'fallback',
      latency_ms: Date.now() - startTime
    });
  }
}

// ===========================================
// COMPREHENSIVE KNOWLEDGE BASE
// ===========================================

const KNOWLEDGE_BASE = {
  // ShortFormFactory — actual services & pricing from the website
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
      description: 'Send one podcast, interview, or talking-head video and get 5–15 ready-to-post clips in 24–48 hours. Our flagship service.',
      pricing: { basic: 40, standard: 95, premium: 220 },
      batchPrice: 220,
      turnaround: '24-48 hours',
      features: ['5–15 clips per video', 'Hook-focused cuts', 'Platform-ready formatting', 'Captions available as add-on']
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

  // Flagship offer (shown on homepage)
  flagship: {
    name: 'Podcast / YouTube Repurpose',
    description: 'Turn one long video into a batch of short-form content',
    startingPrice: 220,
    includes: '5–15 clips, hook-focused cuts, platform-ready formatting',
    turnaround: '24-48 hours',
    orderUrl: 'https://shortformfactory.com/order'
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

  // Business model
  businessModel: {
    pricing: 'Flat-rate, per project/batch',
    contracts: 'No contracts required',
    market: 'North America focused',
    delivery: '24–48 hours standard',
    revisions: {
      basic: 0,
      standard: 1,
      premium: 2,
      note: 'Within 7 days, within original scope'
    }
  },

  // SFFOS — separate SaaS product at shortformfactory.shop
  sffos: {
    name: 'ShortFormFactory OS (SFFOS)',
    tagline: 'The All-In-One Video Editor OS',
    description: 'A SaaS platform for video editors and agencies. Merges sales, delivery, and operations into one control panel.',
    url: 'https://shortformfactory.shop',
    pricing: {
      creator: { price: 99, period: 'month', description: 'Perfect for freelance video editors — up to 10 projects, AI lead qualification, automated proposals' },
      professional: { price: 299, period: 'month', description: 'For growing video agencies — unlimited projects, all integrations, team collaboration (5 members), advanced analytics' },
      enterprise: { price: 999, period: 'month', description: 'For large production companies — everything in Professional plus white-label, dedicated account manager, SLA guarantee' }
    },
    features: ['AI Lead Qualification', 'Smart Proposal Generator', 'Video Tool Integrations (Premiere, Final Cut, CapCut)', 'Automatic Time Tracking', 'Revenue Engine with invoicing', 'Content Repurposing AI']
  },

  // Company info
  company: {
    name: 'ShortFormFactory',
    website: 'https://shortformfactory.com',
    email: 'shortformfactory.help@gmail.com',
    orderPage: '/order',
    servicesPage: '/services',
    demoPage: '/demo',
    contactPage: '/contact',
    bookingUrl: 'https://calendly.com/shortformfactory/30min',
    socials: {
      tiktok: 'https://www.tiktok.com/@short.formfactory',
      instagram: 'https://www.instagram.com/short.formfactory',
      youtube: 'https://www.youtube.com/@short.formfactory'
    }
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

  // SFFOS product questions
  sffos: [
    /sffos/i, /shortformfactory os/i, /video editor os/i, /saas/i, /platform/i,
    /software/i, /app/i, /subscription/i, /monthly plan/i, /creator plan/i,
    /professional plan/i, /enterprise/i, /tool/i, /shortformfactory\.shop/i
  ],

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
      message: "Hey! I'm the ShortFormFactory concierge. I can help you explore our services, get a quote, or book a call. What are you looking for?",
      lead_score: leadScore,
      intent_tier: intentTier,
      recommended_package: null,
      recommended_next_step: 'continue_conversation',
      qualification_data: updatedAnswers,
      quick_actions: ['See all services', 'Get pricing', 'Book a strategy call', 'Learn about SFFOS']
    };
  }

  // Check for SFFOS questions
  if (INTENT_PATTERNS.sffos.some(p => p.test(lowerMessage))) {
    return handleSFFOSQuestion(updatedAnswers, leadScore, intentTier);
  }

  // Check for ready to buy / order signals
  if (INTENT_PATTERNS.readyToBuy.some(p => p.test(lowerMessage))) {
    return {
      message: "Let's get you set up! Our flagship service is Podcast/YouTube Repurpose — starting at $220 per batch, you get 5–15 ready-to-post clips in 24–48 hours. Want to place an order now, or would you like to book a quick call first?",
      lead_score: Math.max(leadScore, 70),
      intent_tier: 'hot',
      recommended_package: 'podcastRepurpose',
      recommended_next_step: 'book_call',
      qualification_data: updatedAnswers,
      quick_actions: ['Place an order now', 'Book a call first', 'See all services']
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

  // Default: guide toward services or booking
  return getServiceGuideResponse(updatedAnswers, leadScore, intentTier);
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

  // General pricing overview — actual website pricing only
  return {
    message: `Here's our pricing (flat-rate, no contracts):\n\n**Flagship Service:**\n• Podcast/YouTube Repurpose — starting at $220/batch (5–15 clips, 24–48hr delivery)\n\n**Per-Video Services:**\n• Auto Captions: $15–75\n• Viral Captions: $20–110\n• AI Reel Edit: $25–140\n• Social Media Edit: $30–160\n• Background Removal: $25–150\n• Audio Sync: $15–95\n• Smart Cut: $20–120\n\n**Add-ons:** Rush Delivery +$25, Extra Clips +$15, Color Grade +$20, and more.\n\nReady to place an order or have questions?`,
    lead_score: leadScore,
    intent_tier: intentTier,
    recommended_package: null,
    recommended_next_step: 'continue_conversation',
    qualification_data: answers,
    quick_actions: ['Place an order', 'Book a call', 'See all services', 'What\'s the turnaround?']
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
      message: "Budget is important — and ours is flat-rate with no contracts. Individual services start at $15 for auto captions. Our flagship Podcast Repurpose batch starts at $220 and gives you 5–15 clips ready to post. You can also start with a single video to test us out. What type of content are you working with?",
      lead_score: leadScore,
      intent_tier: 'warm',
      recommended_package: null,
      recommended_next_step: 'continue_conversation',
      qualification_data: answers,
      quick_actions: ['Start with one video', 'See all services', 'Book a call to discuss']
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

function handleSFFOSQuestion(answers, leadScore, intentTier) {
  const sffos = KNOWLEDGE_BASE.sffos;
  return {
    message: `SFFOS (ShortFormFactory OS) is our all-in-one platform for video editors and agencies. It consolidates 15+ tools into one control panel:\n\n• **Creator** — $99/month (freelancers, up to 10 projects, AI lead qualification, automated proposals)\n• **Professional** — $299/month (agencies, unlimited projects, team of 5, all integrations, advanced analytics)\n• **Enterprise** — $999/month (large companies, white-label, dedicated account manager, SLA guarantee)\n\nFeatures include AI Lead Qualification, Smart Proposals, Premiere/Final Cut/CapCut integrations, Time Tracking, and a Revenue Engine.\n\nSFFOS is available at shortformfactory.shop. Want to know more or get started?`,
    lead_score: leadScore,
    intent_tier: intentTier,
    recommended_package: null,
    recommended_next_step: 'continue_conversation',
    qualification_data: answers,
    quick_actions: ['Start free trial at shortformfactory.shop', 'Tell me more about features', 'I need editing services instead']
  };
}

function getServiceGuideResponse(answers, leadScore, intentTier) {
  // Guide users toward the right service or action — no business qualification
  if (!answers.content_type && !answers.service_interest) {
    return {
      message: "What type of content are you working with? That'll help me point you to the right service.",
      lead_score: leadScore,
      intent_tier: intentTier,
      recommended_package: null,
      recommended_next_step: 'continue_conversation',
      qualification_data: answers,
      quick_actions: ['Podcast / long-form video', 'Talking-head / solo clips', 'Short clips / reels', 'Something else']
    };
  }

  if (answers.content_type === 'podcast' || answers.service_interest === 'repurpose') {
    return {
      message: `Our Podcast/YouTube Repurpose service sounds like a great fit. Send us one long-form video and we return 5–15 platform-ready short clips in 24–48 hours. Starting at $220 per batch. No contracts, flat-rate pricing. Ready to place an order?`,
      lead_score: Math.max(leadScore, 60),
      intent_tier: 'warm',
      recommended_package: 'podcastRepurpose',
      recommended_next_step: 'book_call',
      qualification_data: answers,
      quick_actions: ['Place an order', 'Book a call first', 'See what\'s included']
    };
  }

  // General guide
  return {
    message: "Here's the quickest way to get started with ShortFormFactory:\n\n1. **Order online** at shortformfactory.com/order — pick your service, upload your footage, and receive your clips in 24–48 hours.\n2. **Book a call** if you want to talk through your content needs first.\n3. **Explore services** at shortformfactory.com/services to see the full menu.\n\nWhat works best for you?",
    lead_score: leadScore,
    intent_tier: intentTier,
    recommended_package: null,
    recommended_next_step: 'continue_conversation',
    qualification_data: answers,
    quick_actions: ['Place an order', 'Book a call', 'See all services', 'Get pricing']
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
  const nextStep = getNextStep(intentTier);
  
  const messages = {
    hot: "Our flagship Podcast/YouTube Repurpose service starts at $220 per batch — you get 5–15 ready-to-post clips in 24–48 hours. No contracts, flat-rate. Ready to place an order or book a quick call?",
    warm: "Sounds like ShortFormFactory could be a great fit. Check out our services at shortformfactory.com/services or book a 30-min call to talk through your project.",
    cold: "No rush! Explore our full service menu at shortformfactory.com/services whenever you're ready. Our prices start at $15 per video."
  };
  
  return {
    type: 'recommendation',
    message: messages[intentTier],
    lead_score: leadScore,
    intent_tier: intentTier,
    recommended_package: null,
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
  // Returns the most relevant service key, not a fake monthly package
  const content = (answers.content_type || '').toLowerCase();
  if (content.includes('podcast') || content.includes('repurpose') || content.includes('long')) return 'podcastRepurpose';
  if (content.includes('caption')) return 'viralCaptions';
  if (content.includes('reel') || content.includes('tiktok') || content.includes('short')) return 'aiReel';
  return 'podcastRepurpose'; // default to flagship
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
    message: aiText || "I'm here to help you with ShortFormFactory's services. What can I help you with?",
    lead_score: 25,
    intent_tier: 'cold',
    recommended_package: null,
    recommended_next_step: 'continue_conversation'
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
