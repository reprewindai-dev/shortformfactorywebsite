// Enhanced Concierge Widget - Production Version
(function() {
  'use strict';

const SESSION_FLAG_KEY = 'sffConciergeSessionOpened';
const MOBILE_PROMPT_KEY = 'sffConciergeMobilePromptHidden';

function getSafeSessionStorage() {
  try {
    const testKey = '__concierge_session_test__';
    window.sessionStorage.setItem(testKey, '1');
    window.sessionStorage.removeItem(testKey);
    return window.sessionStorage;
  } catch (error) {
    console.warn('Session storage unavailable for concierge state persistence.', error);
    return null;
  }
}

const sessionStore = getSafeSessionStorage();

function readSessionFlag(key) {
  if (!sessionStore) return null;
  try {
    return sessionStore.getItem(key);
  } catch (error) {
    console.warn('Failed to read concierge session flag', error);
    return null;
  }
}

function writeSessionFlag(key, value) {
  if (!sessionStore) return;
  try {
    sessionStore.setItem(key, value);
  } catch (error) {
    console.warn('Failed to persist concierge session flag', error);
  }
}

class ConciergeWidget {
  constructor() {
    this.isOpen = false;
    this.sessionId = this.generateSessionId();
    this.conversationState = 'greeting';
    this.userAnswers = {};
    this.currentQuestion = 0;
    this.hasProactivelyOpened = false;
    this.isMobileQuery = window.matchMedia('(max-width: 768px)');
    this.isMobileViewport = this.isMobileQuery.matches;
    this.sessionHasOpened = readSessionFlag(SESSION_FLAG_KEY) === 'true';
    this.mobilePromptDismissed = readSessionFlag(MOBILE_PROMPT_KEY) === 'true';
    const initialConsentState = window.__cookieConsentVisibility || null;
    this.cookieBannerOffset = initialConsentState?.visible ? (initialConsentState.height || 0) : 0;
    this.mobilePromptEl = null;
    this.handleViewportChange = (event) => {
      this.isMobileViewport = event.matches;
      if (this.isMobileViewport) {
        this.renderMobilePromptIfNeeded();
      } else {
        this.dismissMobilePrompt();
      }
    };
    this.isMobileQuery.addEventListener('change', this.handleViewportChange);
    
    this.questions = [
      {
        id: 'content_type',
        text: "What type of content are you working with?",
        inputType: 'buttons',
        options: [
          { value: 'podcast', label: 'Podcast / Long-form video' },
          { value: 'talking_head', label: 'Talking-head / Solo clips' },
          { value: 'reels', label: 'Short clips / Reels' },
          { value: 'other', label: 'Something else' }
        ]
      },
      {
        id: 'service_interest',
        text: "What do you need most help with?",
        inputType: 'buttons',
        options: [
          { value: 'repurpose', label: 'Repurposing long videos into clips' },
          { value: 'captions', label: 'Adding viral captions' },
          { value: 'editing', label: 'Full video editing / reels' },
          { value: 'not_sure', label: 'Not sure yet' }
        ]
      },
      {
        id: 'platform',
        text: "Which platform(s) are you targeting?",
        inputType: 'buttons',
        options: [
          { value: 'tiktok_reels', label: 'TikTok & Instagram Reels' },
          { value: 'youtube_shorts', label: 'YouTube Shorts' },
          { value: 'linkedin', label: 'LinkedIn' },
          { value: 'all', label: 'All platforms' }
        ]
      },
      {
        id: 'timeline',
        text: "When do you want to get started?",
        inputType: 'buttons',
        options: [
          { value: 'asap', label: 'Ready now' },
          { value: '30days', label: 'Within a few weeks' },
          { value: 'later', label: 'Just exploring' }
        ]
      }
    ];

    this.init();
  }

  bindGlobalEvents() {
    window.addEventListener('cookie-consent:visibility', (event) => {
      const { visible, height } = event.detail || {};
      this.cookieBannerOffset = visible ? (height || 0) : 0;
      this.updateFloatingOffsets();
    });
  }

  updateFloatingOffsets() {
    const offsetValue = `${this.cookieBannerOffset}px`;
    const widget = document.getElementById('conciergeWidget');
    if (widget) {
      widget.style.setProperty('--concierge-offset-bottom', offsetValue);
    }
    if (this.mobilePromptEl) {
      this.mobilePromptEl.style.setProperty('--concierge-offset-bottom', offsetValue);
    }
  }

  generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  init() {
    this.createWidget();
    this.updateFloatingOffsets();
    this.bindGlobalEvents();
    this.setupEventListeners();
    this.setupCalendlyListener();
    this.renderMobilePromptIfNeeded();
    if (!this.sessionHasOpened) {
      this.queueInstantGreeting();
    }
    this.trackEvent('widget_loaded');
    window.dispatchEvent(new Event('concierge:ready'));
  }

  setupCalendlyListener() {
    // Listen for Calendly events via postMessage
    window.addEventListener('message', (e) => {
      if (e.origin === 'https://calendly.com' && e.data.event) {
        if (e.data.event === 'calendly.event_scheduled') {
          // Booking completed!
          this.handleCalendlyBooking(e.data.payload);
        }
      }
    });
  }

  handleCalendlyBooking(payload) {
    // Show confirmation in chat
    this.addMessage('assistant', "🎉 Awesome! Your call is booked! You'll receive a confirmation email shortly. Looking forward to chatting with you!");
    this.addQuickActions(['Tell me more about services', 'See pricing', 'I\'m all set!']);
    
    // Track the conversion
    this.trackEvent('calendly_booking_completed', {
      eventUri: payload?.event?.uri,
      inviteeUri: payload?.invitee?.uri
    });

    // Store lead with booking confirmation
    this.storeLead({
      type: 'calendly_booked',
      leadScore: 100,
      intentTier: 'hot',
      recommendedPackage: this.recommendPackage(),
      userAnswers: this.userAnswers,
      calendlyEvent: payload?.event?.uri
    }).catch(() => {});
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
      if (this.isMobileViewport) {
        return;
      }
      if (!this.hasProactivelyOpened && !this.isOpen) {
        this.proactiveOpen('instant_load');
      }
    }, 1200);
  }

  proactiveOpen(trigger) {
    if (trigger === 'instant_load' && this.sessionHasOpened) {
      return;
    }
    this.hasProactivelyOpened = true;
    this.sessionHasOpened = true;
    writeSessionFlag(SESSION_FLAG_KEY, 'true');
    this.open();
    
    const greetingVariants = [
      "Hey — I'm the ShortFormFactory concierge. I can help you find the right service, get a quote, or book a call. What are you looking for?",
      "Hi! Need help picking the right editing service or want to book a strategy call? I've got you covered.",
      "Welcome to ShortFormFactory! I can walk you through our services or get you set up. What do you need today?"
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
    if (!this.sessionHasOpened) {
      this.sessionHasOpened = true;
      writeSessionFlag(SESSION_FLAG_KEY, 'true');
    }
    if (!this.mobilePromptDismissed) {
      this.mobilePromptDismissed = true;
      writeSessionFlag(MOBILE_PROMPT_KEY, 'true');
    }
    window.classList.add('open');
    toggle.classList.remove('pulse');
    this.dismissMobilePrompt();
    
    if (this.conversationState === 'greeting') {
      this.addMessage('assistant', "Hey! I'm the ShortFormFactory concierge. I can help you explore our services, get a quote, or book a call. What do you need today?");
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
        message: "Our pricing is flat-rate with no contracts. Individual services start at $15. Our flagship Podcast/YouTube Repurpose batch starts at $220 and delivers 5–15 ready-to-post clips in 24–48 hours. Want the full pricing breakdown?",
        quickActions: ['See full pricing', 'Place an order', 'Book a call']
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
    const pkg = this.recommendPackage();
    const nextStep = this.getNextStep(tier);
    
    return {
      responseType: 'recommendation',
      leadScore: score,
      intentTier: tier,
      recommendedPackage: pkg,
      recommendedNextStep: nextStep,
      message: this.getRecommendationMessage(tier, pkg, nextStep)
    };
  }

  calculateLeadScore() {
    let score = 20; // Base score for visiting
    const answers = this.userAnswers;
    
    // Content type scoring
    if (answers.content_type && answers.content_type !== 'other') score += 20;
    
    // Service interest scoring
    if (answers.service_interest && answers.service_interest !== 'not_sure') score += 20;
    
    // Timeline scoring
    if (answers.timeline === 'asap') score += 20;
    else if (answers.timeline === '30days') score += 15;
    else score += 5;
    
    // Platform scoring
    if (answers.platform) score += 15;
    
    return Math.min(score, 100);
  }

  getIntentTier(score) {
    if (score >= 70) return 'hot';
    if (score >= 40) return 'warm';
    return 'cold';
  }

  recommendPackage() {
    const answers = this.userAnswers;
    const content = (answers.content_type || '').toLowerCase();
    const interest = (answers.service_interest || '').toLowerCase();
    if (content === 'podcast' || interest === 'repurpose') return 'Podcast/YouTube Repurpose';
    if (interest === 'captions') return 'Viral Captions';
    if (interest === 'editing' || content === 'reels') return 'AI Reel Edit';
    return 'Podcast/YouTube Repurpose';
  }

  getNextStep(tier) {
    if (tier === 'hot') return 'book_call';
    if (tier === 'warm') return 'request_quote';
    return 'lead_magnet';
  }

  getRecommendationMessage(tier, pkg, nextStep) {
    const messages = {
      hot: {
        book_call: `Great! Based on your content needs, I'd recommend our ${pkg} service. Let's book a quick 15-min call to get you started. Ready?`,
        request_quote: `Our ${pkg} service sounds like a great fit. Ready to place an order, or want a custom quote first?`,
        lead_magnet: `Our ${pkg} service is exactly what you need. Explore the details at shortformfactory.com/services whenever you're ready.`
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
    const container = document.createElement('div');
    container.className = 'concierge-quick-actions';
    
    actions.forEach(action => {
      const button = document.createElement('button');
      button.className = 'concierge-quick-action';
      button.textContent = action;
      button.setAttribute('data-action', action);
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.selectQuickAction(action);
      });
      container.appendChild(button);
    });
    
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
    // Remove the quick actions container after selection
    const quickActionsContainers = document.querySelectorAll('.concierge-quick-actions');
    quickActionsContainers.forEach(container => container.remove());
    
    // Set the input and send
    const input = document.getElementById('conciergeInput');
    input.value = action;
    this.sendMessage();
  }

  renderMobilePromptIfNeeded() {
    if (!this.isMobileViewport || this.mobilePromptDismissed || this.sessionHasOpened || this.isOpen) {
      this.dismissMobilePrompt();
      return;
    }

    if (this.mobilePromptEl) {
      return;
    }

    const prompt = document.createElement('div');
    prompt.className = 'concierge-mobile-prompt';
    prompt.innerHTML = `
      <button type="button" class="concierge-mobile-dismiss" aria-label="Close concierge intro">×</button>
      <div class="concierge-mobile-copy">
        <span class="label">Concierge</span>
        <p>Tap to get help finding the right editing service or book a call.</p>
      </div>
      <button type="button" class="concierge-mobile-cta">Open</button>
    `;

    prompt.querySelector('.concierge-mobile-dismiss').addEventListener('click', () => {
      this.mobilePromptDismissed = true;
      writeSessionFlag(MOBILE_PROMPT_KEY, 'true');
      this.dismissMobilePrompt();
    });

    prompt.querySelector('.concierge-mobile-cta').addEventListener('click', () => {
      this.dismissMobilePrompt();
      this.open();
    });

    document.body.appendChild(prompt);
    this.mobilePromptEl = prompt;
    this.updateFloatingOffsets();
  }

  dismissMobilePrompt() {
    if (this.mobilePromptEl) {
      this.mobilePromptEl.remove();
      this.mobilePromptEl = null;
    }
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
    
    // Open Calendly popup for instant booking
    this.openCalendlyPopup();
  }

  openCalendlyPopup() {
    // Check if Calendly is loaded
    if (typeof Calendly === 'undefined') {
      this.addMessage('assistant', "Let me open our scheduling page for you...");
      window.open('https://calendly.com/shortformfactory/30min', '_blank');
      return;
    }

    this.addMessage('assistant', "📅 Opening our calendar - pick a time that works for you!");

    // Prefill data if we have it
    const prefill = {};
    if (this.userAnswers.email) {
      prefill.email = this.userAnswers.email;
    }
    if (this.userAnswers.name) {
      prefill.name = this.userAnswers.name;
    }

    // Open Calendly popup with brand styling
    Calendly.initPopupWidget({
      url: 'https://calendly.com/shortformfactory/30min?hide_event_type_details=1&hide_gdpr_banner=1&background_color=1b1818&text_color=68eb3d&primary_color=020202',
      prefill: prefill,
      utm: {
        utmSource: 'concierge_widget',
        utmMedium: 'chat',
        utmCampaign: 'booking'
      }
    });

    // Store lead data
    this.storeLead({
      type: 'calendly_opened',
      leadScore: this.calculateLeadScore(),
      intentTier: 'hot',
      recommendedPackage: this.recommendPackage(),
      userAnswers: this.userAnswers
    }).catch(() => {});
  }

  async submitBookingRequest() {
    // Legacy fallback - now handled by Calendly
    this.openCalendlyPopup();
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
      
      const pkg = this.recommendPackage();
      const pkgName = pkg.charAt(0).toUpperCase() + pkg.slice(1);
      this.addMessage('assistant', `📧 Done! I'm sending your custom ${pkgName} package quote to ${this.userAnswers.email}. You'll have it within 24 hours. While you wait, any questions about how we work?`);
      this.addQuickActions(['How fast is delivery?', 'What\'s included?', 'I\'m all set!']);
    } catch (error) {
      this.addMessage('assistant', "I'll get that quote ready for you! Any other questions in the meantime?");
      this.addQuickActions(['How fast is delivery?', 'What\'s included?']);
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
      
      this.addMessage('assistant', `📧 Done! I just sent our viral content planning template to ${this.userAnswers.email}. It's the same framework our clients use to 3x their engagement. Once you've had a chance to review it, I'd love to help you put it into action!`);
      this.addQuickActions(['Tell me about packages', 'How much does it cost?', 'Thanks, I\'ll check it out']);
    } catch (error) {
      this.addMessage('assistant', "The template is on its way! Let me know if you have any questions.");
      this.addQuickActions(['Tell me about packages', 'How much does it cost?']);
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
