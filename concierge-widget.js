// Concierge Widget - Lead Generation & Qualification System
class ConciergeWidget {
  constructor() {
    this.isOpen = false;
    this.isTyping = false;
    this.sessionId = this.generateSessionId();
    this.messages = [];
    this.qualificationData = {};
    this.currentStep = 0;
    this.hasOpened = false;
    
    this.init();
  }

  generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  init() {
    this.createWidget();
    this.setupEventListeners();
    
    // Auto-open after delay or exit intent
    setTimeout(() => this.maybeOpen(), 8000);
    this.setupExitIntent();
  }

  createWidget() {
    const widgetHTML = `
      <div class="concierge-widget">
        <button class="concierge-bubble pulse" id="conciergeBubble" aria-label="Talk to concierge">
          <svg viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
          </svg>
        </button>
        
        <div class="concierge-window" id="conciergeWindow">
          <div class="concierge-header">
            <h3>ShortFormFactory Concierge</h3>
            <button class="concierge-close" id="conciergeClose" aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
          
          <div class="concierge-messages" id="conciergeMessages"></div>
          
          <div class="concierge-input-area" id="conciergeInputArea">
            <textarea 
              class="concierge-input" 
              id="conciergeInput" 
              placeholder="Type your message..."
              rows="1"
            ></textarea>
            <button class="concierge-send" id="conciergeSend">Send</button>
          </div>
          
          <div class="concierge-actions" id="conciergeActions" style="display: none;"></div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', widgetHTML);
  }

  setupEventListeners() {
    const bubble = document.getElementById('conciergeBubble');
    const close = document.getElementById('conciergeClose');
    const send = document.getElementById('conciergeSend');
    const input = document.getElementById('conciergeInput');

    bubble.addEventListener('click', () => this.open());
    close.addEventListener('click', () => this.close());
    send.addEventListener('click', () => this.sendMessage());
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Auto-resize textarea
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });
  }

  setupExitIntent() {
    let exitTriggered = false;
    document.addEventListener('mouseleave', (e) => {
      if (!exitTriggered && e.clientY <= 10 && !this.hasOpened) {
        exitTriggered = true;
        setTimeout(() => this.maybeOpen(), 500);
      }
    });
  }

  maybeOpen() {
    if (!this.hasOpened && Math.random() > 0.3) { // 70% chance to show
      this.open();
    }
  }

  open() {
    this.isOpen = true;
    this.hasOpened = true;
    const window = document.getElementById('conciergeWindow');
    const bubble = document.getElementById('conciergeBubble');
    
    window.classList.add('open');
    bubble.classList.remove('pulse');
    
    if (this.messages.length === 0) {
      this.startConversation();
    }
    
    this.trackEvent('widget_opened');
  }

  close() {
    this.isOpen = false;
    const window = document.getElementById('conciergeWindow');
    window.classList.remove('open');
  }

  startConversation() {
    const openingMessages = [
      "Hey — I'm the ShortFormFactory concierge. Want more clients from short-form? I can recommend the fastest plan. What are you trying to accomplish right now?",
      "Hi there! I help businesses like yours get predictable results from short-form content. What's your main goal with video marketing right now?",
      "Quick question - are you looking to generate more leads, sales, or brand awareness with short-form video? I can help you figure out the best approach."
    ];

    const message = openingMessages[Math.floor(Math.random() * openingMessages.length)];
    this.addMessage('assistant', message);
  }

  addMessage(role, content, isTyping = false) {
    const messagesContainer = document.getElementById('conciergeMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `concierge-message ${role}`;
    
    if (isTyping) {
      messageDiv.classList.add('typing');
      messageDiv.innerHTML = `
        <div class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      `;
    } else {
      messageDiv.textContent = content;
    }
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    if (!isTyping) {
      this.messages.push({ role, content, timestamp: Date.now() });
      this.saveConversation();
    }
  }

  async sendMessage() {
    const input = document.getElementById('conciergeInput');
    const message = input.value.trim();
    
    if (!message || this.isTyping) return;
    
    // Add user message
    this.addMessage('user', message);
    input.value = '';
    input.style.height = 'auto';
    
    // Show typing indicator
    this.showTyping();
    
    try {
      // Get AI response
      const response = await this.getAIResponse(message);
      this.hideTyping();
      
      if (response.next_step) {
        this.showActions(response);
      } else {
        this.addMessage('assistant', response.message);
      }
      
      // Update qualification data
      this.updateQualificationData(message, response);
      
    } catch (error) {
      this.hideTyping();
      this.addMessage('assistant', "Sorry, I'm having trouble connecting. Let me help you directly. What specific service are you interested in?");
      console.error('Concierge AI error:', error);
    }
  }

  showTyping() {
    this.isTyping = true;
    this.addMessage('assistant', '', true);
  }

  hideTyping() {
    this.isTyping = false;
    const typingMessage = document.querySelector('.concierge-message.typing');
    if (typingMessage) {
      typingMessage.remove();
    }
  }

  async getAIResponse(userMessage) {
    try {
      const response = await fetch('/api/concierge/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          session_id: this.sessionId,
          conversation_history: this.messages,
          qualification_data: this.qualificationData
        })
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      return await response.json();
    } catch (error) {
      // Fallback to rule-based responses
      return this.getFallbackResponse(userMessage);
    }
  }

  getFallbackResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    // Simple keyword-based routing
    if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('how much')) {
      return {
        message: "Our packages start at $1,500/month for basic editing and go up to $5,000+/month for full-service content production. Would you like me to schedule a call to discuss your specific needs?",
        next_step: 'book_call'
      };
    }
    
    if (lowerMessage.includes('book') || lowerMessage.includes('call') || lowerMessage.includes('schedule')) {
      return {
        message: "Perfect! Let's get you scheduled for a strategy call. I'll also capture your details so we can prepare personalized recommendations.",
        next_step: 'book_call'
      };
    }
    
    if (lowerMessage.includes('quote') || lowerMessage.includes('estimate') || lowerMessage.includes('proposal')) {
      return {
        message: "I can prepare a custom quote for you. Let me capture your requirements and I'll send you a detailed proposal within 24 hours.",
        next_step: 'request_quote'
      };
    }
    
    // Default qualification response
    return {
      message: "To give you the best recommendation, I need to understand your business better. What do you sell and who are your target customers?",
      next_step: null
    };
  }

  showActions(response) {
    const actionsContainer = document.getElementById('conciergeActions');
    const inputArea = document.getElementById('conciergeInputArea');
    
    actionsContainer.style.display = 'flex';
    inputArea.style.display = 'none';
    
    let actionsHTML = '';
    
    if (response.next_step === 'book_call') {
      actionsHTML = `
        <a href="https://calendly.com/shortformfactory/strategy-call" class="concierge-action-btn primary" target="_blank">
          📅 Book Your Strategy Call
        </a>
        <button class="concierge-action-btn" onclick="concierge.collectLeadInfo()">
          📧 Send Me Booking Info Instead
        </button>
      `;
    } else if (response.next_step === 'request_quote') {
      actionsHTML = `
        <button class="concierge-action-btn primary" onclick="concierge.collectQuoteInfo()">
          💰 Get Custom Quote
        </button>
        <button class="concierge-action-btn" onclick="concierge.resetConversation()">
          🔄 Start Over
        </button>
      `;
    } else if (response.next_step === 'lead_magnet') {
      actionsHTML = `
        <button class="concierge-action-btn primary" onclick="concierge.collectLeadMagnetInfo()">
          📄 Get Content Plan Template
        </button>
        <button class="concierge-action-btn" onclick="concierge.resetConversation()">
          🔄 Start Over
        </button>
      `;
    }
    
    actionsContainer.innerHTML = actionsHTML;
  }

  async collectLeadInfo() {
    const email = prompt("What's your email address? I'll send the booking link there.");
    if (email) {
      await this.saveLead({
        email,
        next_step: 'book_call',
        qualification_data: this.qualificationData
      });
      
      this.addMessage('assistant', `Great! I've sent the booking link to ${email}. Check your email and let me know if you don't see it within 5 minutes.`);
      this.trackEvent('booking_clicked');
    }
  }

  async collectQuoteInfo() {
    const email = prompt("What's your email address? I'll send your custom quote there.");
    if (email) {
      await this.saveLead({
        email,
        next_step: 'request_quote',
        qualification_data: this.qualificationData
      });
      
      this.addMessage('assistant', `Perfect! I'll prepare your custom quote and send it to ${email} within 24 hours. Is there anything specific you want included in the proposal?`);
      this.trackEvent('quote_requested');
    }
  }

  async collectLeadMagnetInfo() {
    const email = prompt("What's your email address? I'll send the content plan template there.");
    if (email) {
      await this.saveLead({
        email,
        next_step: 'lead_magnet',
        qualification_data: this.qualificationData
      });
      
      this.addMessage('assistant', `Excellent! The short-form content plan template is on its way to ${email}. It includes our proven framework for planning viral content. Let me know if you have any questions!`);
      this.trackEvent('lead_magnet_requested');
    }
  }

  resetConversation() {
    const actionsContainer = document.getElementById('conciergeActions');
    const inputArea = document.getElementById('conciergeInputArea');
    
    actionsContainer.style.display = 'none';
    inputArea.style.display = 'flex';
    
    this.addMessage('assistant', "No problem! Let's start fresh. What's your main goal with short-form video content right now?");
  }

  updateQualificationData(message, response) {
    // Extract and store qualification information
    if (response.qualification_update) {
      Object.assign(this.qualificationData, response.qualification_update);
    }
    
    // Basic keyword extraction for fallback
    const lowerMessage = message.toLowerCase();
    
    if (!this.qualificationData.offering && (lowerMessage.includes('service') || lowerMessage.includes('product') || lowerMessage.includes('sell'))) {
      this.qualificationData.offering = message;
    }
    
    if (!this.qualificationData.budget && (lowerMessage.includes('budget') || lowerMessage.includes('price') || lowerMessage.includes('afford'))) {
      this.qualificationData.budget_mentioned = true;
    }
  }

  async saveLead(data) {
    try {
      await fetch('/api/leads/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          session_id: this.sessionId,
          source_url: window.location.href,
          utm_params: this.getUTMParams(),
          conversation_history: this.messages
        })
      });
    } catch (error) {
      console.error('Failed to save lead:', error);
    }
  }

  getUTMParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      utm_content: params.get('utm_content'),
      utm_term: params.get('utm_term')
    };
  }

  trackEvent(eventName) {
    // Simple tracking - could be enhanced with analytics
    console.log('Concierge Event:', eventName, {
      session_id: this.sessionId,
      timestamp: Date.now()
    });
    
    // Track in database
    fetch('/api/concierge/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: eventName,
        session_id: this.sessionId,
        url: window.location.href
      })
    }).catch(console.error);
  }

  saveConversation() {
    localStorage.setItem(`concierge_${this.sessionId}`, JSON.stringify({
      messages: this.messages,
      qualification_data: this.qualificationData
    }));
  }

  loadConversation() {
    const saved = localStorage.getItem(`concierge_${this.sessionId}`);
    if (saved) {
      const data = JSON.parse(saved);
      this.messages = data.messages || [];
      this.qualificationData = data.qualification_data || {};
      
      // Restore messages in UI
      this.messages.forEach(msg => {
        this.addMessage(msg.role, msg.content);
      });
    }
  }
}

// Initialize widget
let concierge;
document.addEventListener('DOMContentLoaded', () => {
  concierge = new ConciergeWidget();
  window.concierge = concierge; // Make accessible globally
});
