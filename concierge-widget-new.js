// Enhanced Concierge Widget - Production Version
(function() {
  'use strict';
  
class ConciergeWidget {
  constructor() {
    this.isOpen = false;
    this.sessionId = this.generateSessionId();
    this.conversationState = 'greeting';
    this.userAnswers = {};
    this.currentQuestion = 0;
    this.hasProactivelyOpened = false;
    
    this.questions = [
      {
        id: 'business',
        text: "What do you sell? (e.g., coaching, courses, products, services)",
        inputType: 'text',
        placeholder: "Tell me about your business..."
      },
      {
        id: 'target_audience',
        text: "Who do you sell to? (e.g., entrepreneurs, fitness enthusiasts, B2B SaaS)",
        inputType: 'text',
        placeholder: "Describe your ideal customers..."
      },
      {
        id: 'revenue',
        text: "What's your current monthly revenue range?",
        inputType: 'buttons',
        options: [
          { value: '0-5k', label: '$0 - $5K' },
          { value: '5k-25k', label: '$5K - $25K' },
          { value: '25k-100k', label: '$25K - $100K' },
          { value: '100k+', label: '$100K+' }
        ]
      },
      {
        id: 'marketing_budget',
        text: "What's your monthly marketing budget or what are you willing to invest in content?",
        inputType: 'buttons',
        options: [
          { value: '0-500', label: '$0 - $500' },
          { value: '500-2000', label: '$500 - $2,000' },
          { value: '2000-5000', label: '$2,000 - $5,000' },
          { value: '5000+', label: '$5,000+' }
        ]
      },
      {
        id: 'content_needs',
        text: "How many clips per week do you need and which platforms?",
        inputType: 'text',
        placeholder: "e.g., 10 clips/week on TikTok and Instagram Reels"
      },
      {
        id: 'bottleneck',
        text: "What's your biggest bottleneck right now?",
        inputType: 'buttons',
        options: [
          { value: 'editing', label: 'Video editing/production' },
          { value: 'strategy', label: 'Content strategy' },
          { value: 'posting', label: 'Consistent posting' },
          { value: 'leads', label: 'Getting leads from content' },
          { value: 'other', label: 'Something else' }
        ]
      },
      {
        id: 'timeline',
        text: "When are you looking to start?",
        inputType: 'buttons',
        options: [
          { value: 'asap', label: 'ASAP' },
          { value: '30days', label: 'Within 30 days' },
          { value: 'later', label: 'Just exploring' }
        ]
      },
      {
        id: 'decision_maker',
        text: "Are you the decision maker for marketing investments?",
        inputType: 'buttons',
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No, need to consult' }
        ]
      }
    ];

    this.init();
  }

  generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  init() {
    this.createWidget();
    this.setupEventListeners();
    this.queueInstantGreeting();
    this.trackEvent('widget_loaded');
    window.dispatchEvent(new Event('concierge:ready'));
  }

  createWidget() {
    const widgetHTML = `
      <div class="concierge-widget" id="conciergeWidget">
        <button class="concierge-toggle pulse" id="conciergeToggle" aria-label="Talk to Concierge">
          💬
          <span class="concierge-badge" id="conciergeBadge" style="display: none;">1</span>
        </button>
        
        <div class="concierge-window" id="conciergeWindow">
          <div class="concierge-header">
            <h3>ShortFormFactory Concierge</h3>
            <button class="concierge-close" id="conciergeClose" aria-label="Close">×</button>
          </div>
          
          <div class="concierge-body">
            <div class="concierge-messages" id="conciergeMessages"></div>
            
            <div class="concierge-input-area" id="conciergeInputArea">
              <div class="concierge-input-wrapper">
                <textarea 
                  class="concierge-input" 
                  id="conciergeInput" 
                  placeholder="Type your message..."
                  rows="1"
                  maxlength="500"
                ></textarea>
                <button class="concierge-send" id="conciergeSend">Send</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', widgetHTML);
  }

  setupEventListeners() {
    const toggle = document.getElementById('conciergeToggle');
    const close = document.getElementById('conciergeClose');
    const send = document.getElementById('conciergeSend');
    const input = document.getElementById('conciergeInput');

    toggle.addEventListener('click', () => this.toggle());
    close.addEventListener('click', () => this.close());
    send.addEventListener('click', () => this.sendMessage());
    
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    input.addEventListener('input', () => {
      this.autoResizeTextarea(input);
    });

    // Exit intent detection
    document.addEventListener('mouseleave', (e) => {
      if (e.clientY <= 0 && !this.hasProactivelyOpened && !this.isOpen) {
        this.proactiveOpen('exit');
      }
    });
  }

  autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  queueInstantGreeting() {
    setTimeout(() => {
      if (!this.hasProactivelyOpened && !this.isOpen) {
        this.proactiveOpen('instant_load');
      }
    }, 1200);
  }

  proactiveOpen(trigger) {
    this.hasProactivelyOpened = true;
    this.open();
    
    const greetingVariants = [
      "Hey — I'm the ShortFormFactory concierge. Want more clients from short-form? I can recommend the fastest plan. What are you trying to accomplish right now?",
      "Hi there! I help businesses like yours get predictable results from short-form content. What's your biggest goal right now?",
      "Welcome! I'm here to help you create a high-performing content plan. What would make the biggest impact for your business this month?"
    ];
    
    const greeting = greetingVariants[Math.floor(Math.random() * greetingVariants.length)];
    this.addMessage('assistant', greeting);
    this.conversationState = 'qualification';
    this.currentQuestion = 0;
    
    this.trackEvent('proactive_open', { trigger });
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    const widget = document.getElementById('conciergeWidget');
    const window = document.getElementById('conciergeWindow');
    const toggle = document.getElementById('conciergeToggle');
    
    this.isOpen = true;
    window.classList.add('open');
    toggle.classList.remove('pulse');
    
    if (this.conversationState === 'greeting') {
      this.addMessage('assistant', "Hey! I'm the ShortFormFactory concierge. I can help you create a high-performing short-form content plan in 60 seconds. What are you trying to accomplish right now?");
      this.conversationState = 'qualification';
      this.currentQuestion = 0;
    }
    
    this.trackEvent('widget_opened');
  }

  close() {
    const window = document.getElementById('conciergeWindow');
    const toggle = document.getElementById('conciergeToggle');
    
    this.isOpen = false;
    window.classList.remove('open');
    
    this.trackEvent('widget_closed');
  }

  async sendMessage() {
    const input = document.getElementById('conciergeInput');
    const send = document.getElementById('conciergeSend');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message
    this.addMessage('user', message);
    
    // Clear input and disable send
    input.value = '';
    send.disabled = true;
    this.autoResizeTextarea(input);
    
    // Handle email collection states
    if (this.conversationState.startsWith('collect_email')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(message)) {
        this.userAnswers.email = message;
        
        // Process based on what triggered email collection
        if (this.conversationState === 'collect_email_for_call') {
          await this.submitBookingRequest();
        } else if (this.conversationState === 'collect_email_for_quote') {
          await this.submitQuoteRequest();
        } else if (this.conversationState === 'collect_email_for_template') {
          await this.submitLeadMagnetRequest();
        }
        
        this.conversationState = 'completed';
        send.disabled = false;
        return;
      } else {
        this.addMessage('assistant', "That doesn't look like a valid email. Could you double-check and try again?");
        send.disabled = false;
        input.focus();
        return;
      }
    }
    
    // Store answer for current question
    if (this.questions[this.currentQuestion]?.id) {
      this.userAnswers[this.questions[this.currentQuestion].id] = message;
    }
    
    // Process the response
    await this.processResponse(message);
    
    send.disabled = false;
    input.focus();
  }

  async processResponse(message) {
    this.showTyping();
    
    try {
      const response = await this.callAI(message);
      this.hideTyping();
      
      // Add the AI message
      this.addMessage('assistant', response.message);
      
      // Handle based on response type and next step
      if (response.responseType === 'recommendation' && response.recommendedNextStep !== 'continue_conversation') {
        // Show CTA card for recommendations
        this.showCTACard(response.recommendedNextStep, response.recommendedPackage || 'growth');
      } else if (response.quickActions && response.quickActions.length > 0) {
        // Show quick action buttons for easier responses
        this.addQuickActions(response.quickActions);
      }
      
      // Track lead score changes
      if (response.leadScore >= 70) {
        this.trackEvent('hot_lead_detected', { score: response.leadScore });
      }
      
    } catch (error) {
      this.hideTyping();
      this.addMessage('assistant', "I'm having trouble connecting. Let me help you directly. Based on what you've shared, I recommend booking a call to discuss your specific needs.");
      this.showFallbackCTA();
    }
  }

  async callAI(message) {
    // Build conversation history for context
    const conversationHistory = this.getConversationHistory();
    
    const payload = {
      message: message,
      sessionId: this.sessionId,
      conversationState: this.conversationState,
      currentQuestion: this.currentQuestion,
      userAnswers: this.userAnswers,
      questions: this.questions,
      conversationHistory: conversationHistory
    };

    try {
      const response = await fetch('/api/concierge/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('API call failed');
      }

      const data = await response.json();
      
      // Update qualification data from response
      if (data.qualification_data) {
        this.userAnswers = { ...this.userAnswers, ...data.qualification_data };
      }
      
      // Map response to widget format
      return this.mapResponse(data);
    } catch (error) {
      console.error('Concierge API failed:', error);
      return this.fallbackLogic(message);
    }
  }

  getConversationHistory() {
    const messages = document.querySelectorAll('.concierge-message');
    const history = [];
    
    messages.forEach(msg => {
      const bubble = msg.querySelector('.concierge-bubble');
      if (bubble) {
        const role = msg.classList.contains('assistant') ? 'assistant' : 'user';
        history.push({ role, content: bubble.textContent });
      }
    });
    
    return history.slice(-10);
  }

  mapResponse(data) {
    // Determine response type based on recommendation
    let responseType = 'question';
    
    if (data.recommended_next_step === 'book_call' || 
        data.recommended_next_step === 'request_quote' || 
        data.recommended_next_step === 'lead_magnet') {
      if (data.lead_score >= 50) {
        responseType = 'recommendation';
      }
    }
    
    return {
      responseType: responseType,
      message: data.message,
      leadScore: data.lead_score,
      intentTier: data.intent_tier,
      recommendedPackage: data.recommended_package,
      recommendedNextStep: data.recommended_next_step,
      quickActions: data.quick_actions || []
    };
  }

  fallbackLogic(message) {
    const question = this.questions[this.currentQuestion];
    
    if (this.conversationState === 'qualification' && question) {
      this.currentQuestion++;
      
      if (this.currentQuestion >= this.questions.length) {
        // All questions answered, provide recommendation
        return this.generateRecommendation();
      } else {
        // Ask next question
        const nextQuestion = this.questions[this.currentQuestion];
        let response = { responseType: 'question', message: nextQuestion.text };
        
        if (nextQuestion.inputType === 'buttons') {
          response.quickActions = nextQuestion.options.map(opt => opt.label);
        }
        
        return response;
      }
    }
    
    // Handle general responses
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('expensive')) {
      return {
        responseType: 'objection',
        message: "I understand pricing is important. We have packages starting at $1,500/mo for 5 clips per week. Most clients see 3-5x ROI within the first 90 days. Would you like me to recommend the best package for your goals?",
        quickActions: ['Yes, recommend package', 'Tell me more about pricing']
      };
    }
    
    if (lowerMessage.includes('not sure') || lowerMessage.includes('think') || lowerMessage.includes('maybe')) {
      return {
        responseType: 'objection',
        message: "Totally understand - this is an important decision. How about I send you our content plan template to review while you think it over? No pressure, just helpful resources.",
        quickActions: ['Send template', 'I have questions']
      };
    }
    
    return {
      responseType: 'question',
      message: "Thanks for that! Let me ask you: " + (this.questions[this.currentQuestion]?.text || "What's your biggest goal right now?")
    };
  }

  generateRecommendation() {
    const score = this.calculateLeadScore();
    const tier = this.getIntentTier(score);
    const package = this.recommendPackage();
    const nextStep = this.getNextStep(tier);
    
    return {
      responseType: 'recommendation',
      leadScore: score,
      intentTier: tier,
      recommendedPackage: package,
      recommendedNextStep: nextStep,
      message: this.getRecommendationMessage(tier, package, nextStep)
    };
  }

  calculateLeadScore() {
    let score = 0;
    const answers = this.userAnswers;
    
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

  getIntentTier(score) {
    if (score >= 70) return 'hot';
    if (score >= 40) return 'warm';
    return 'cold';
  }

  recommendPackage() {
    const answers = this.userAnswers;
    const budget = answers.marketing_budget;
    const contentNeeds = answers.content_needs || '';
    
    if (budget === '5000+' || contentNeeds.includes('20')) return 'scale';
    if (budget === '2000-5000' || contentNeeds.includes('10')) return 'growth';
    return 'starter';
  }

  getNextStep(tier) {
    if (tier === 'hot') return 'book_call';
    if (tier === 'warm') return 'request_quote';
    return 'lead_magnet';
  }

  getRecommendationMessage(tier, package, nextStep) {
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
    
    return messages[tier][nextStep];
  }

  showRecommendation(recommendation) {
    const { leadScore, intentTier, recommendedPackage, recommendedNextStep, message } = recommendation;
    
    this.addMessage('assistant', message);
    
    // Store lead data
    this.storeLead({
      ...recommendation,
      userAnswers: this.userAnswers,
      sessionId: this.sessionId
    });
    
    // Show CTA card
    this.showCTACard(recommendedNextStep, recommendedPackage);
  }

  showCTACard(nextStep, recommendedPackage) {
    const ctaHTML = `
      <div class="concierge-cta-card">
        <h4>Recommended: ${recommendedPackage.charAt(0).toUpperCase() + recommendedPackage.slice(1)} Package</h4>
        <p>Based on your goals and budget, this is the fastest path to results.</p>
        <div class="concierge-cta-buttons">
          ${nextStep === 'book_call' ? `
            <button class="concierge-cta-btn primary" onclick="window.concierge.bookCall()">Book Call</button>
            <button class="concierge-cta-btn secondary" onclick="window.concierge.requestQuote()">Get Quote</button>
          ` : nextStep === 'request_quote' ? `
            <button class="concierge-cta-btn primary" onclick="window.concierge.requestQuote()">Get Quote</button>
            <button class="concierge-cta-btn secondary" onclick="window.concierge.sendLeadMagnet()">Send Template</button>
          ` : `
            <button class="concierge-cta-btn primary" onclick="window.concierge.sendLeadMagnet()">Get Free Template</button>
            <button class="concierge-cta-btn secondary" onclick="window.concierge.bookCall()">Schedule Call</button>
          `}
        </div>
      </div>
    `;
    
    this.addHTML(ctaHTML);
  }

  handleObjection(response) {
    this.addMessage('assistant', response.message);
    if (response.quickActions) {
      this.addQuickActions(response.quickActions);
    }
  }

  showFallbackCTA() {
    const ctaHTML = `
      <div class="concierge-cta-card">
        <h4>Let's Connect Directly</h4>
        <p>I'll help you find the perfect solution for your content needs.</p>
        <div class="concierge-cta-buttons">
          <button class="concierge-cta-btn primary" onclick="window.concierge.bookCall()">Book a Call</button>
          <button class="concierge-cta-btn secondary" onclick="window.concierge.requestQuote()">Get Quote</button>
        </div>
      </div>
    `;
    
    this.addHTML(ctaHTML);
  }

  addMessage(sender, message) {
    const messagesContainer = document.getElementById('conciergeMessages');
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const messageHTML = `
      <div class="concierge-message ${sender}">
        <div class="concierge-avatar">${sender === 'assistant' ? '🤖' : '👤'}</div>
        <div class="concierge-bubble">${message}</div>
        <div class="concierge-timestamp">${timestamp}</div>
      </div>
    `;
    
    messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    this.trackEvent('message_sent', { sender, message_length: message.length });
  }

  addQuickActions(actions) {
    const quickActionsHTML = actions.map(action => 
      `<button class="concierge-quick-action" onclick="window.concierge.selectQuickAction('${action}')">${action}</button>`
    ).join('');
    
    const container = document.createElement('div');
    container.className = 'concierge-quick-actions';
    container.innerHTML = quickActionsHTML;
    
    const messagesContainer = document.getElementById('conciergeMessages');
    messagesContainer.appendChild(container);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  addHTML(html) {
    const messagesContainer = document.getElementById('conciergeMessages');
    messagesContainer.insertAdjacentHTML('beforeend', html);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  selectQuickAction(action) {
    const input = document.getElementById('conciergeInput');
    input.value = action;
    this.sendMessage();
  }

  showTyping() {
    const messagesContainer = document.getElementById('conciergeMessages');
    const typingHTML = `
      <div class="concierge-typing" id="conciergeTyping">
        <div class="concierge-typing-dot"></div>
        <div class="concierge-typing-dot"></div>
        <div class="concierge-typing-dot"></div>
      </div>
    `;
    
    messagesContainer.insertAdjacentHTML('beforeend', typingHTML);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  hideTyping() {
    const typing = document.getElementById('conciergeTyping');
    if (typing) {
      typing.remove();
    }
  }

  async bookCall() {
    this.trackEvent('booking_clicked', { package: this.recommendPackage() });
    
    // Check if we have email, if not collect it first
    if (!this.userAnswers.email) {
      this.addMessage('assistant', "Perfect! To schedule your strategy call, I just need your email and we'll reach out within 24 hours to find a time that works. What's your best email?");
      this.conversationState = 'collect_email_for_call';
      return;
    }
    
    // Submit the booking request
    await this.submitBookingRequest();
  }

  async submitBookingRequest() {
    try {
      await this.storeLead({
        type: 'booking_request',
        leadScore: this.calculateLeadScore(),
        intentTier: 'hot',
        recommendedPackage: this.recommendPackage(),
        userAnswers: this.userAnswers
      });
      
      this.addMessage('assistant', "🎉 Awesome! We've received your request. Our team will email you within 24 hours to schedule your free 15-minute strategy call. Keep an eye on your inbox!");
      
      // Also redirect to contact page as backup
      setTimeout(() => {
        window.location.href = '/contact?source=concierge&type=booking';
      }, 2000);
    } catch (error) {
      // Fallback to contact page
      window.location.href = '/contact?source=concierge&type=booking';
    }
  }

  async requestQuote() {
    this.trackEvent('quote_requested', { package: this.recommendPackage() });
    
    // Collect email if not already collected
    if (!this.userAnswers.email) {
      this.addMessage('assistant', "I'll prepare a custom quote for you! What's the best email to send it to?");
      this.conversationState = 'collect_email_for_quote';
      return;
    }
    
    await this.submitQuoteRequest();
  }

  async submitQuoteRequest() {
    try {
      await this.storeLead({
        type: 'quote_request',
        leadScore: this.calculateLeadScore(),
        intentTier: this.getIntentTier(this.calculateLeadScore()),
        recommendedPackage: this.recommendPackage(),
        userAnswers: this.userAnswers
      });
      
      this.addMessage('assistant', "Perfect! I'm preparing your custom quote now. You'll receive it within 24 hours with detailed pricing and deliverables. Check your inbox!");
    } catch (error) {
      this.addMessage('assistant', "I'll get that quote ready for you! In the meantime, feel free to check out our pricing page.");
    }
  }

  async sendLeadMagnet() {
    this.trackEvent('lead_magnet_requested');
    
    if (!this.userAnswers.email) {
      this.addMessage('assistant', "I'll send you our free content plan template! What's the best email?");
      this.conversationState = 'collect_email_for_template';
      return;
    }
    
    await this.submitLeadMagnetRequest();
  }

  async submitLeadMagnetRequest() {
    try {
      await this.storeLead({
        type: 'lead_magnet',
        leadScore: this.calculateLeadScore(),
        intentTier: 'cold',
        userAnswers: this.userAnswers
      });
      
      this.addMessage('assistant', "Great! I've sent the content plan template to your email. It includes our proven framework for creating viral short-form content. 📧");
    } catch (error) {
      this.addMessage('assistant', "Thanks! Check your email for the template.");
    }
  }

  async storeLead(leadData) {
    try {
      await fetch('/api/leads/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...leadData,
          source_url: window.location.href,
          utm_params: this.getUTMParams(),
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to store lead:', error);
    }
  }

  async submitQuoteRequest() {
    // Implementation for quote submission
    this.trackEvent('quote_submitted');
  }

  async submitLeadMagnetRequest() {
    // Implementation for lead magnet delivery
    this.trackEvent('lead_magnet_delivered');
  }

  getUTMParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      utm_term: params.get('utm_term'),
      utm_content: params.get('utm_content')
    };
  }

  trackEvent(eventName, data = {}) {
    // Track to analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, {
        custom_parameter_1: this.sessionId,
        ...data
      });
    }
    
    // Track to our API
    fetch('/api/analytics/event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: eventName,
        session_id: this.sessionId,
        data: data,
        timestamp: new Date().toISOString()
      })
    }).catch(() => {
      // Fail silently
    });
  }
}

// Initialize the widget when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.concierge = new ConciergeWidget();
  window.dispatchEvent(new Event('concierge:ready'));
});

})();
