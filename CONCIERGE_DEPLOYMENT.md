# ShortFormFactory Concierge Funnel - Deployment Guide

## Overview
This guide covers the complete deployment of the ShortFormFactory Concierge Funnel system, including AI-powered lead qualification, automated email notifications, and admin dashboard.

## 🚀 Quick Start (5-Minute Test)

### 1. Basic Setup (No API Keys Required)
The system works out-of-the-box with rule-based qualification:

```bash
# Deploy to Vercel
vercel --prod
```

The concierge will:
- ✅ Qualify leads using rule-based logic
- ✅ Store leads in console logs
- ✅ Show recommendations and routing
- ❌ Send emails (requires Resend API key)
- ❌ Use AI (requires Hugging Face token)

### 2. Test the Funnel (2 Minutes)
1. Visit your deployed site
2. Wait 8 seconds for proactive widget popup
3. Click "Talk to Concierge"
4. Answer 6-8 qualification questions
5. Receive recommendation and CTA

## 🔧 Full Production Setup

### Environment Variables Required

Copy `.env.example` to `.env.local` and configure:

```bash
# Required for Email Notifications
RESEND_API_KEY=re_xxxxxxxxxxxxxx
RESEND_FROM_EMAIL=concierge@shortformfactory.com

# Optional AI Enhancement
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxx

# Admin Dashboard
ADMIN_PASSWORD=YourSecurePassword123!

# Existing PayPal Config
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
PAYPAL_WEBHOOK_ID=your_webhook_id
```

### Email Service Setup (Resend)

1. Sign up at https://resend.com/
2. Get your API key from dashboard
3. Add `RESEND_API_KEY` to environment
4. Verify your sending domain
5. Set `RESEND_FROM_EMAIL`

**Email Templates:**
- Hot leads: Immediate notification to owner + booking link to lead
- Warm leads: Quote confirmation to lead
- Cold leads: Lead magnet delivery to lead

### AI Enhancement Setup (Hugging Face)

1. Sign up at https://huggingface.co/
2. Go to Settings → Access Tokens
3. Create new read token
4. Add `HUGGINGFACE_API_KEY` to environment
5. System will use AI when available, fallback to rules

**AI Model Used:** microsoft/DialoGPT-medium
**Fallback:** Rule-based qualification (always works)

### Admin Dashboard Setup

1. Visit `https://your-domain.com/admin`
2. Login with `ADMIN_PASSWORD`
3. View leads, filter by intent tier, export CSV

**Default Password:** `ShortFormAdmin2026!`

## 📊 System Architecture

### Frontend Components
- **Concierge Widget:** Always-on chat interface
- **Qualification Flow:** 8 structured questions
- **Lead Scoring:** 0-100 point system
- **Routing Logic:** Hot/Warm/Cold intent tiers

### Backend APIs
- `POST /api/concierge/message` - AI qualification
- `POST /api/leads/create` - Lead storage & notifications
- `GET /api/leads/list` - Admin dashboard data

### Database Schema (Production)
```sql
leads {
  id: string
  email: string
  name: string
  lead_score: number
  intent_tier: string
  recommended_package: string
  recommended_next_step: string
  answers_json: string
  source_url: string
  utm_params: string
  session_id: string
  created_at: timestamp
}

conversations {
  session_id: string
  lead_id: string
  answers: object
  final_recommendation: object
  created_at: timestamp
}

audit_logs {
  timestamp: timestamp
  session_id: string
  action: string
  details: object
}
```

## 🎯 Qualification Logic

### Lead Scoring Algorithm
```javascript
// Revenue (25 points max)
100k+ revenue = 25 points
25k-100k revenue = 20 points
5k-25k revenue = 15 points
<5k revenue = 5 points

// Marketing Budget (25 points max)
$5000+ = 25 points
$2000-5000 = 20 points
$500-2000 = 15 points
<$500 = 5 points

// Timeline (20 points max)
ASAP = 20 points
30 days = 15 points
Later = 5 points

// Decision Maker (15 points max)
Yes = 15 points
No = 5 points

// Content Needs (15 points max)
10+ clips/week = 15 points
5-10 clips/week = 10 points
<5 clips/week = 5 points
```

### Intent Tiers
- **Hot (70+ points):** Book call immediately
- **Warm (40-69 points):** Request quote
- **Cold (<40 points):** Lead magnet

### Package Recommendations
- **Scale:** $5000+ budget OR 20+ clips/week
- **Growth:** $2000-5000 budget OR 10+ clips/week
- **Starter:** <$2000 budget OR <10 clips/week

## 🔄 Conversation Flow

### Opening Variants
1. "Hey — I'm the ShortFormFactory concierge. Want more clients from short-form? I can recommend the fastest plan. What are you trying to accomplish right now?"
2. "Hi there! I help businesses like yours get predictable results from short-form content. What's your biggest goal right now?"
3. "Welcome! I'm here to help you create a high-performing content plan. What would make the biggest impact for your business this month?"

### Qualification Questions
1. What do you sell? (text)
2. Who do you sell to? (text)
3. Monthly revenue range? (buttons)
4. Marketing budget? (buttons)
5. Content needs + platforms? (text)
6. Biggest bottleneck? (buttons)
7. Timeline? (buttons)
8. Decision maker? (buttons)

### Objection Handling
- **Price:** "I understand pricing is important. We have packages starting at $1,500/mo. Most clients see 3-5x ROI within 90 days."
- **Not Sure:** "Totally understand - this is important. How about I send you our content plan template to review?"
- **Already Have Editor:** "Great! Many of our clients have editors too. We provide strategy + systems to make them more effective."

## 📱 Mobile Optimization

### Responsive Design
- Widget adapts to mobile screens
- Touch-friendly buttons
- Optimized typing experience
- Full functionality on all devices

### Performance
- <2s first response time
- Optimistic UI updates
- Fallback for slow AI responses
- Minimal bundle size

## 🔍 Testing Checklist

### Basic Functionality (2 minutes)
- [ ] Widget appears after 8 seconds
- [ ] Proactive greeting displays
- [ ] Can type and send messages
- [ ] Questions progress correctly
- [ ] Final recommendation appears
- [ ] CTA buttons work

### Lead Qualification (3 minutes)
- [ ] All 8 questions asked
- [ ] Score calculation works
- [ ] Intent tier assigned correctly
- [ ] Package recommendation accurate
- [ ] Next step routing correct

### Email Notifications (5 minutes)
- [ ] Hot lead sends owner notification
- [ ] Lead receives confirmation email
- [ ] Email content matches intent tier
- [ ] Links work correctly

### Admin Dashboard (2 minutes)
- [ ] Login works with password
- [ ] Leads display correctly
- [ ] Filters work (All/Hot/Warm/Cold)
- [ ] CSV export works
- [ ] Lead details view works

### AI Enhancement (Optional)
- [ ] AI responses when token provided
- [ ] Fallback to rules when AI fails
- [ ] Response validation works
- [ ] Schema enforcement active

## 🚨 Troubleshooting

### Common Issues

**Widget not appearing:**
- Check console for JavaScript errors
- Verify CSS/JS files loading
- Check for conflicting scripts

**No email notifications:**
- Verify Resend API key
- Check email sending logs
- Verify domain verification

**AI not working:**
- Check Hugging Face API key
- Verify model availability
- Check rate limits

**Admin dashboard not loading:**
- Verify password
- Check API endpoints
- Check network requests

### Debug Mode
Add to environment:
```bash
DEBUG=true
CONCIERGE_LOG_LEVEL=verbose
```

## 📈 Analytics Tracking

### Events Tracked
- `widget_loaded`
- `proactive_open`
- `widget_opened`
- `widget_closed`
- `message_sent`
- `lead_captured`
- `booking_clicked`
- `quote_requested`
- `lead_magnet_requested`

### UTM Parameters Captured
- utm_source
- utm_medium
- utm_campaign
- utm_term
- utm_content

### Conversion Metrics
- Lead capture rate
- Qualification completion rate
- Hot lead percentage
- Booking click rate
- Email open rate

## 🔐 Security Considerations

### Data Protection
- No sensitive data in URLs
- Secure API endpoints
- Rate limiting on APIs
- Input validation everywhere

### Authentication
- Admin dashboard password protected
- API keys stored securely
- No client-side secrets
- HTTPS required in production

## 🚀 Production Deployment

### Vercel Setup
1. Connect repository to Vercel
2. Add environment variables
3. Deploy with `vercel --prod`
4. Test all functionality
5. Monitor error logs

### Monitoring
- Check Vercel analytics
- Monitor API response times
- Track conversion rates
- Set up error alerts

### Scaling
- System handles unlimited concurrent users
- AI calls have rate limits
- Email sending has daily limits
- Database scaling considerations

## 📞 Support

### Issues
- Check console logs first
- Review this documentation
- Test with incognito browser
- Clear cache and retry

### Feature Requests
- Submit via GitHub issues
- Include use case details
- Provide examples

### Emergency
- System has fallbacks for all failures
- Rule-based qualification always works
- Manual lead capture available
- Email notifications have redundancy
