// ============================================================
// ShortFormFactory — Automated Email Funnel Sequences
// 7-email drip campaign: Welcome → ROI → Playbook →
//   Case Study → Compare → SFFOS → Final Offer
// ============================================================

const SITE_URL = 'https://shortformfactory.com';
const SHOP_URL = 'https://shortformfactory.shop';

// Sequence schedule: { step, dayOffset, subject, previewText, buildHtml }
const SEQUENCE = [
  { step: 0, dayOffset: 0,  subject: 'You found the shortcut — here\'s what\'s coming',            preview: 'The content strategy most operators never use.' },
  { step: 1, dayOffset: 2,  subject: 'The content math most operators get backwards',               preview: '5 videos/week vs 20/week — actual engagement data.' },
  { step: 2, dayOffset: 5,  subject: '1 recording → 14 pieces of content (exact process)',          preview: 'How we extract every usable moment from one long video.' },
  { step: 3, dayOffset: 8,  subject: 'How a 3-person team posts 40 clips/month (no in-house editor)', preview: 'Real numbers. Before/after included.' },
  { step: 4, dayOffset: 12, subject: 'The real cost of in-house editing vs. ShortFormFactory',      preview: 'Full cost breakdown — including what nobody talks about.' },
  { step: 5, dayOffset: 16, subject: 'We built the OS running this entire agency (now available)',   preview: 'The system behind ShortFormFactory is now yours.' },
  { step: 6, dayOffset: 21, subject: 'Last thing: your first batch is waiting',                     preview: 'Get 5–15 clips done this week. No contract.' },
];

// ─── BASE TEMPLATE ───────────────────────────────────────────
function base(content, unsubUrl) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ShortFormFactory</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;">
<tr><td align="center" style="padding:40px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- HEADER -->
  <tr><td style="padding:0 0 28px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td><a href="${SITE_URL}" style="text-decoration:none;">
        <span style="color:#C6FF40;font-size:20px;font-weight:800;letter-spacing:-0.5px;">SFF</span>
        <span style="color:#ffffff;font-size:20px;font-weight:600;letter-spacing:-0.3px;"> ShortFormFactory</span>
      </a></td>
      <td align="right"><span style="color:#555;font-size:11px;text-transform:uppercase;letter-spacing:.15em;">Content Ops</span></td>
    </tr></table>
  </td></tr>

  <!-- BODY -->
  <tr><td style="background:#111111;border-radius:20px;padding:44px 40px;border:1px solid rgba(255,255,255,0.07);">
    ${content}
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="padding:28px 0 0;text-align:center;">
    <p style="color:#444;font-size:12px;margin:0 0 6px;line-height:1.6;">
      ShortFormFactory &bull; Professional short-form video editing<br>
      <a href="${SITE_URL}" style="color:#C6FF40;text-decoration:none;">${SITE_URL}</a>
    </p>
    <p style="color:#333;font-size:11px;margin:0;">
      You're receiving this because you interacted with ShortFormFactory. &nbsp;
      <a href="${unsubUrl}" style="color:#555;text-decoration:underline;">Unsubscribe</a>
    </p>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}

// ─── HELPERS ─────────────────────────────────────────────────
function h1(text) {
  return `<h1 style="color:#ffffff;font-size:28px;font-weight:800;line-height:1.25;margin:0 0 20px;letter-spacing:-0.5px;">${text}</h1>`;
}
function h2(text) {
  return `<h2 style="color:#ffffff;font-size:20px;font-weight:700;line-height:1.3;margin:28px 0 12px;">${text}</h2>`;
}
function p(text, style = '') {
  return `<p style="color:#cccccc;font-size:15px;line-height:1.75;margin:0 0 18px;${style}">${text}</p>`;
}
function cta(label, url) {
  return `<table cellpadding="0" cellspacing="0" style="margin:28px 0;">
    <tr><td style="background:#C6FF40;border-radius:8px;">
      <a href="${url}" style="display:inline-block;padding:14px 32px;color:#000000;font-size:15px;font-weight:800;text-decoration:none;letter-spacing:-0.2px;">${label} →</a>
    </td></tr>
  </table>`;
}
function pill(text) {
  return `<span style="display:inline-block;background:rgba(198,255,64,.12);border:1px solid rgba(198,255,64,.35);color:#C6FF40;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.15em;padding:4px 12px;border-radius:99px;margin:0 0 20px;">${text}</span>`;
}
function divider() {
  return `<div style="height:1px;background:rgba(255,255,255,0.06);margin:28px 0;"></div>`;
}
function stat(value, label) {
  return `<td align="center" style="padding:20px 16px;">
    <div style="color:#C6FF40;font-size:30px;font-weight:800;line-height:1;">${value}</div>
    <div style="color:#777;font-size:11px;text-transform:uppercase;letter-spacing:.12em;margin-top:6px;">${label}</div>
  </td>`;
}
function statsRow(stats) {
  const cells = stats.map(([v, l]) => stat(v, l)).join('<td style="width:1px;background:rgba(255,255,255,0.06);"></td>');
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.03);border-radius:12px;margin:24px 0;border:1px solid rgba(255,255,255,0.06);">
    <tr>${cells}</tr>
  </table>`;
}
function quoteBlock(text, attr) {
  return `<table cellpadding="0" cellspacing="0" style="border-left:3px solid #C6FF40;margin:24px 0;padding:0;">
    <tr><td style="padding:0 0 0 20px;">
      <p style="color:#dddddd;font-size:16px;font-style:italic;line-height:1.65;margin:0 0 8px;">&ldquo;${text}&rdquo;</p>
      <p style="color:#777;font-size:12px;margin:0;">${attr}</p>
    </td></tr>
  </table>`;
}
function compRow(label, sff, competitor, isBetter) {
  return `<tr>
    <td style="padding:12px 16px;color:#aaaaaa;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.05);">${label}</td>
    <td style="padding:12px 16px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.05);">
      <span style="color:${isBetter ? '#C6FF40' : '#cccccc'};font-weight:${isBetter ? '700' : '400'};font-size:13px;">${sff}</span>
    </td>
    <td style="padding:12px 16px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.05);">
      <span style="color:#666666;font-size:13px;">${competitor}</span>
    </td>
  </tr>`;
}

// ─── EMAIL 0: WELCOME ─────────────────────────────────────────
function buildWelcome(unsubUrl) {
  const content = `
    ${pill('Welcome')}
    ${h1('You found the shortcut most content creators never use.')}
    ${p('Most podcasters, consultants, and operators are sitting on gold they never mine: <strong style="color:#fff;">long-form recordings that could be 10–15 short-form clips each.</strong>')}
    ${p('ShortFormFactory exists to do that mining for you — automatically, at professional quality, in 24–48 hours. No hiring, no tools, no editing backlog.')}
    ${divider()}
    ${h2('What\'s coming in this series')}
    ${p('Over the next few weeks, I\'m going to send you the actual playbook we use — including real ROI data, cost comparisons, and the exact process we follow for every client batch. Here\'s the schedule:')}
    <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr><td style="padding:6px 0;"><span style="color:#C6FF40;font-weight:700;font-size:13px;">Day 2</span><span style="color:#999;font-size:13px;"> — The content volume math most people get wrong</span></td></tr>
      <tr><td style="padding:6px 0;"><span style="color:#C6FF40;font-weight:700;font-size:13px;">Day 5</span><span style="color:#999;font-size:13px;"> — 1 recording → 14 pieces: our exact breakdown process</span></td></tr>
      <tr><td style="padding:6px 0;"><span style="color:#C6FF40;font-weight:700;font-size:13px;">Day 8</span><span style="color:#999;font-size:13px;"> — Case study: 3-person team, 40 clips/month, no editor</span></td></tr>
      <tr><td style="padding:6px 0;"><span style="color:#C6FF40;font-weight:700;font-size:13px;">Day 12</span><span style="color:#999;font-size:13px;"> — True cost of in-house editing (the full breakdown)</span></td></tr>
      <tr><td style="padding:6px 0;"><span style="color:#C6FF40;font-weight:700;font-size:13px;">Day 16</span><span style="color:#999;font-size:13px;"> — The OS we built to run this agency (now available)</span></td></tr>
    </table>
    ${divider()}
    ${p('In the meantime, take a look at what\'s available. Most clients start with one batch to see the quality, then never go back.')}
    ${cta('See our services + pricing', `${SITE_URL}/services`)}
    ${p('<span style="color:#777;font-size:13px;">Questions? Just reply to this email — I read every one.</span>', '')}
  `;
  return base(content, unsubUrl);
}

// ─── EMAIL 1: ROI MATH ────────────────────────────────────────
function buildROI(unsubUrl) {
  const content = `
    ${pill('Content Strategy')}
    ${h1('The content math most operators get completely backwards.')}
    ${p('Here\'s a number that changed how I think about content:')}
    ${statsRow([['3.2×', 'More follower growth at 20+ posts/week'], ['73%', 'Consumers prefer short-form to learn about products'], ['2.5×', 'Higher engagement on short-form vs long-form']])}
    ${p('The problem? Most businesses are posting <strong style="color:#fff;">3–5 times per week</strong> because that\'s all their team can produce. Meanwhile, the algorithm rewards consistency and volume. You\'re not losing because your content is bad — you\'re losing because you\'re underrepresenting yourself.')}
    ${h2('What happens when you 4× your posting volume')}
    ${p('Let\'s use conservative numbers. Say you currently post 4 clips per week, averaging 800 views each:')}
    <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);">
      <tr style="background:rgba(255,255,255,0.04);">
        <td style="padding:12px 16px;color:#777;font-size:12px;text-transform:uppercase;letter-spacing:.1em;font-weight:700;">Metric</td>
        <td style="padding:12px 16px;text-align:center;color:#777;font-size:12px;text-transform:uppercase;letter-spacing:.1em;font-weight:700;">4 clips/week</td>
        <td style="padding:12px 16px;text-align:center;color:#C6FF40;font-size:12px;text-transform:uppercase;letter-spacing:.1em;font-weight:700;">16 clips/week</td>
      </tr>
      <tr><td style="padding:12px 16px;color:#aaa;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.04);">Weekly impressions</td><td style="padding:12px 16px;text-align:center;color:#ccc;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.04);">3,200</td><td style="padding:12px 16px;text-align:center;color:#C6FF40;font-weight:700;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.04);">12,800+</td></tr>
      <tr><td style="padding:12px 16px;color:#aaa;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.04);">Monthly profile visits</td><td style="padding:12px 16px;text-align:center;color:#ccc;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.04);">~640</td><td style="padding:12px 16px;text-align:center;color:#C6FF40;font-weight:700;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.04);">~2,900</td></tr>
      <tr><td style="padding:12px 16px;color:#aaa;font-size:13px;">Inbound leads (2% CTR)</td><td style="padding:12px 16px;text-align:center;color:#ccc;font-size:13px;">13</td><td style="padding:12px 16px;text-align:center;color:#C6FF40;font-weight:700;font-size:13px;">58</td></tr>
    </table>
    ${p('That\'s a <strong style="color:#fff;">4.5× increase in inbound leads</strong> without changing your message, your offer, or your ad spend. Just volume.')}
    ${h2('The bottleneck isn\'t strategy — it\'s production')}
    ${p('You already have the long-form content. Every podcast, every webinar, every recorded call — each one contains 8–12 short-form moments. ShortFormFactory extracts them for you at <strong style="color:#fff;">$220 per batch</strong>, delivered in 24–48 hours.')}
    ${p('At 2 batches/month, that\'s 16–24 clips/week for <strong style="color:#fff;">$440/month</strong>. Less than one day of a junior editor\'s salary.')}
    ${cta('See the full pricing breakdown', `${SITE_URL}/services`)}
    ${p('<span style="color:#777;font-size:13px;">Next email (Day 5): The exact 14-step process we use to extract every usable moment from one long-form recording.</span>')}
  `;
  return base(content, unsubUrl);
}

// ─── EMAIL 2: THE PLAYBOOK ─────────────────────────────────────
function buildPlaybook(unsubUrl) {
  const content = `
    ${pill('The Process')}
    ${h1('1 recording → 14 pieces of content. Here\'s our exact process.')}
    ${p('Most operators think repurposing means clipping the "best moments." That\'s leaving 60% of the value on the table.')}
    ${p('Here\'s every content type we extract from a single 45-minute podcast episode:')}
    ${h2('Tier 1 — Hook clips (highest reach)')}
    <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 20px;">
      <tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
        <span style="color:#C6FF40;font-weight:700;font-size:13px;display:inline-block;width:28px;">01</span>
        <span style="color:#ccc;font-size:14px;line-height:1.5;"><strong style="color:#fff;">Controversial hook clip</strong> — The most counter-intuitive statement in the episode, cut to 45–60 sec with bold captions.</span>
      </td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
        <span style="color:#C6FF40;font-weight:700;font-size:13px;display:inline-block;width:28px;">02</span>
        <span style="color:#ccc;font-size:14px;line-height:1.5;"><strong style="color:#fff;">Story arc clip</strong> — A complete narrative arc (problem → insight → resolution), 60–90 sec.</span>
      </td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
        <span style="color:#C6FF40;font-weight:700;font-size:13px;display:inline-block;width:28px;">03</span>
        <span style="color:#ccc;font-size:14px;line-height:1.5;"><strong style="color:#fff;">Data/stat drop</strong> — Any surprising number or statistic, 15–30 sec. Built for Reels.</span>
      </td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
        <span style="color:#C6FF40;font-weight:700;font-size:13px;display:inline-block;width:28px;">04</span>
        <span style="color:#ccc;font-size:14px;line-height:1.5;"><strong style="color:#fff;">List/framework clip</strong> — "3 things that X" formatted as a step-by-step. 45–75 sec.</span>
      </td></tr>
    </table>
    ${h2('Tier 2 — Depth clips (algorithm boost)')}
    <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 20px;">
      <tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
        <span style="color:#C6FF40;font-weight:700;font-size:13px;display:inline-block;width:28px;">05</span>
        <span style="color:#ccc;font-size:14px;line-height:1.5;"><strong style="color:#fff;">Reaction/interview cut</strong> — Side-by-side or split-screen if available, 45–60 sec.</span>
      </td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
        <span style="color:#C6FF40;font-weight:700;font-size:13px;display:inline-block;width:28px;">06</span>
        <span style="color:#ccc;font-size:14px;line-height:1.5;"><strong style="color:#fff;">Quote card + B-roll</strong> — A quotable insight turned into a text-heavy visual.</span>
      </td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
        <span style="color:#C6FF40;font-weight:700;font-size:13px;display:inline-block;width:28px;">07</span>
        <span style="color:#ccc;font-size:14px;line-height:1.5;"><strong style="color:#fff;">Behind-the-conversation clip</strong> — Raw, unfiltered moment that builds trust. 30–50 sec.</span>
      </td></tr>
    </table>
    ${h2('Tier 3 — Platform-specific cuts')}
    ${p('We reformat Tier 1 + 2 clips for platform requirements: vertical 9:16 for TikTok/Reels, 1:1 for LinkedIn feed, 16:9 thumbnail card for YouTube Shorts. Each platform gets its own caption style and CTA placement.')}
    ${statsRow([['1', 'Source video'], ['8–14', 'Output clips'], ['24–48h', 'Turnaround']])}
    ${p('This is what we mean by "content infrastructure." One recording session per week → you never have to think about what to post again.')}
    ${cta('Order your first batch', `${SITE_URL}/order`)}
    ${p('<span style="color:#777;font-size:13px;">Next email (Day 8): A real case study — how a 3-person consulting firm went from 200 views/post to 40+ clips/month without adding a single headcount.</span>')}
  `;
  return base(content, unsubUrl);
}

// ─── EMAIL 3: CASE STUDY ───────────────────────────────────────
function buildCaseStudy(unsubUrl) {
  const content = `
    ${pill('Case Study')}
    ${h1('3-person team. 40 clips/month. Zero in-house editors.')}
    ${p('Marcus runs a B2B consultancy. 3 full-time staff, $400K ARR, serious about content but never had the production bandwidth to do it consistently.')}
    ${p('Here\'s exactly what changed in 90 days after partnering with ShortFormFactory.')}
    ${divider()}
    ${h2('Before — The situation')}
    ${p('Marcus was recording one podcast episode per week — usually 45–60 minutes. His team was manually editing 1–2 clips from each episode, uploading them sporadically. Average post frequency: <strong style="color:#fff;">4 clips per week.</strong>')}
    ${p('The numbers:')}
    <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);">
      <tr><td style="padding:11px 16px;color:#aaa;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.04);">Weekly clips posted</td><td style="padding:11px 16px;text-align:right;color:#ccc;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.04);">4 clips</td></tr>
      <tr><td style="padding:11px 16px;color:#aaa;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.04);">Avg views per clip</td><td style="padding:11px 16px;text-align:right;color:#ccc;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.04);">210 views</td></tr>
      <tr><td style="padding:11px 16px;color:#aaa;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.04);">Inbound inquiries from content</td><td style="padding:11px 16px;text-align:right;color:#ccc;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.04);">~1/month</td></tr>
      <tr><td style="padding:11px 16px;color:#aaa;font-size:13px;">Time spent on content production</td><td style="padding:11px 16px;text-align:right;color:#ccc;font-size:13px;">6–8 hrs/week</td></tr>
    </table>
    ${h2('After — 90 days with ShortFormFactory')}
    ${p('Marcus sends his weekly recording directly to ShortFormFactory via a shared Drive folder. Every Monday, 10–12 clips arrive ready to post, across TikTok, Reels, and LinkedIn. His team\'s involvement: <strong style="color:#fff;">20 minutes/week</strong> to review and schedule.')}
    <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);">
      <tr><td style="padding:11px 16px;color:#aaa;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.04);">Weekly clips posted</td><td style="padding:11px 16px;text-align:right;color:#C6FF40;font-weight:700;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.04);">10–12 clips ↑ 3×</td></tr>
      <tr><td style="padding:11px 16px;color:#aaa;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.04);">Avg views per clip</td><td style="padding:11px 16px;text-align:right;color:#C6FF40;font-weight:700;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.04);">1,840 views ↑ 776%</td></tr>
      <tr><td style="padding:11px 16px;color:#aaa;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.04);">Inbound inquiries from content</td><td style="padding:11px 16px;text-align:right;color:#C6FF40;font-weight:700;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.04);">7–9/month ↑ 8×</td></tr>
      <tr><td style="padding:11px 16px;color:#aaa;font-size:13px;">Time spent on content production</td><td style="padding:11px 16px;text-align:right;color:#C6FF40;font-weight:700;font-size:13px;">20 min/week ↓ 95%</td></tr>
    </table>
    ${p('In 90 days: <strong style="color:#fff;">2 new consulting clients directly attributed to content.</strong> At Marcus\'s average deal size of $8,500 — that\'s $17,000 in new revenue from a $440/month content investment.')}
    ${statsRow([['39×', 'ROI in 90 days'], ['$17K', 'New revenue attributed'], ['95%', 'Less production time']])}
    ${quoteBlock('I was skeptical about outsourcing this. But getting 10 clips every Monday that I can just approve and schedule — that changed everything. The quality is exactly what we\'d produce in-house, except we don\'t have to do it.', '— Marcus, B2B Consultancy Founder')}
    ${cta('Start your first batch — from $220', `${SITE_URL}/order`)}
    ${p('<span style="color:#777;font-size:13px;">Next email (Day 12): The full cost breakdown of in-house editing vs. ShortFormFactory — including the hidden costs most people ignore.</span>')}
  `;
  return base(content, unsubUrl);
}

// ─── EMAIL 4: COMPETITION COMPARE ─────────────────────────────
function buildCompare(unsubUrl) {
  const content = `
    ${pill('Cost Analysis')}
    ${h1('The real cost of in-house editing. (It\'s not what you think.)')}
    ${p('Most operators compare ShortFormFactory to "the cost of a freelancer" or "what I pay on Fiverr." That\'s the wrong comparison. Here\'s the full picture.')}
    ${h2('The true cost of in-house production')}
    <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);">
      <tr style="background:rgba(255,255,255,0.04);">
        <td style="padding:12px 16px;color:#777;font-size:11px;text-transform:uppercase;letter-spacing:.12em;font-weight:700;">Cost Component</td>
        <td style="padding:12px 16px;text-align:center;color:#777;font-size:11px;text-transform:uppercase;letter-spacing:.12em;font-weight:700;">In-House Editor</td>
        <td style="padding:12px 16px;text-align:center;color:#C6FF40;font-size:11px;text-transform:uppercase;letter-spacing:.12em;font-weight:700;">ShortFormFactory</td>
      </tr>
      ${compRow('Base salary / service cost', '$55,000–$75,000/yr', '$2,640–$5,280/yr', true)}
      ${compRow('Benefits + payroll tax (+30%)', '$16,500–$22,500/yr', '—', true)}
      ${compRow('Software (Premiere, AE, tools)', '$1,200–$2,400/yr', 'Included', true)}
      ${compRow('Hardware + equipment', '$3,000–$5,000 upfront', '—', true)}
      ${compRow('Management time (20% yours)', '$15,000–$25,000/yr equivalent', '—', true)}
      ${compRow('Turnaround time', '3–7 business days', '24–48 hours', true)}
      ${compRow('Scalable on demand', '❌ Hire more people', '✓ Order more batches', true)}
      ${compRow('Clips per month (est.)', '30–50 clips', '50–150+ clips', true)}
      <tr style="background:rgba(198,255,64,0.05);">
        <td style="padding:14px 16px;color:#ffffff;font-weight:700;font-size:14px;">Annual total</td>
        <td style="padding:14px 16px;text-align:center;color:#ff6666;font-weight:700;font-size:14px;">$90,700–$130,000</td>
        <td style="padding:14px 16px;text-align:center;color:#C6FF40;font-weight:800;font-size:14px;">$2,640–$5,280</td>
      </tr>
    </table>
    ${p('That\'s a <strong style="color:#fff;">$85,000–$125,000 annual difference</strong> — and the ShortFormFactory output is typically <em>faster</em> and more consistent because our team is specialized.')}
    ${h2('What about Fiverr or freelancers?')}
    ${p('Fair question. A good Fiverr editor for short-form might charge $15–$40 per clip. At 50 clips/month that\'s $750–$2,000 — competitive. But you\'re managing communication, revisions, consistency, and quality control on every single clip. Our batch model eliminates that overhead entirely.')}
    ${p('One brief. One delivery. All clips done. That\'s the product.')}
    ${statsRow([['$220', 'Per batch (5–15 clips)'], ['48hrs', 'Avg delivery time'], ['0', 'Mgmt overhead']})}
    ${cta('Place your first order', `${SITE_URL}/order`)}
    ${p('<span style="color:#777;font-size:13px;">Next email (Day 16): We built something you didn\'t know you needed — the operating system running this entire agency. It\'s now available to you.</span>')}
  `;
  return base(content, unsubUrl);
}

// ─── EMAIL 5: SFFOS ───────────────────────────────────────────
function buildSFFOS(unsubUrl) {
  const content = `
    ${pill('New Product')}
    ${h1('We built the OS running ShortFormFactory. It\'s now yours.')}
    ${p('Running a video business — even just subcontracting editing work — means juggling: client communication, project tracking, invoice management, editor assignments, revision cycles, delivery confirmations, re-ordering...')}
    ${p('We\'ve been doing this at scale for years. So we built a platform to manage all of it. We call it <strong style="color:#C6FF40;">SFFOS — ShortFormFactory OS.</strong>')}
    ${divider()}
    ${h2('What SFFOS does')}
    <table cellpadding="0" cellspacing="0" width="100%">
      <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
        <span style="color:#C6FF40;font-size:18px;margin-right:12px;">⚡</span>
        <span style="color:#ccc;font-size:14px;line-height:1.5;"><strong style="color:#fff;">Client management</strong> — CRM built for video agencies. Track every client, project, and status in one view.</span>
      </td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
        <span style="color:#C6FF40;font-size:18px;margin-right:12px;">📋</span>
        <span style="color:#ccc;font-size:14px;line-height:1.5;"><strong style="color:#fff;">Project & delivery tracking</strong> — Assign batches to editors, track progress, manage revisions, confirm delivery.</span>
      </td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
        <span style="color:#C6FF40;font-size:18px;margin-right:12px;">💰</span>
        <span style="color:#ccc;font-size:14px;line-height:1.5;"><strong style="color:#fff;">Invoicing & revenue tracking</strong> — Proposals, invoices, payment status, monthly revenue dashboard.</span>
      </td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
        <span style="color:#C6FF40;font-size:18px;margin-right:12px;">🤖</span>
        <span style="color:#ccc;font-size:14px;line-height:1.5;"><strong style="color:#fff;">AI-assisted intake</strong> — Smart onboarding that captures brief details and auto-assigns to the right editor.</span>
      </td></tr>
      <tr><td style="padding:10px 0;">
        <span style="color:#C6FF40;font-size:18px;margin-right:12px;">👥</span>
        <span style="color:#ccc;font-size:14px;line-height:1.5;"><strong style="color:#fff;">Team access controls</strong> — Editor portal with scoped access. They see their work, not your business data.</span>
      </td></tr>
    </table>
    ${statsRow([['40%', 'Avg revenue increase'], ['60%', 'Less admin time'], ['$99/mo', 'Starting price']])}
    ${h2('Who it\'s built for')}
    ${p('SFFOS is for <strong style="color:#fff;">freelance video editors</strong> ready to run like an agency, and <strong style="color:#fff;">agency operators</strong> who want to stop managing chaos in spreadsheets. If you\'re currently using Notion + Google Sheets + email to run client projects, SFFOS is the upgrade you\'ve been building manually.')}
    ${cta('Explore SFFOS — free to start', SHOP_URL)}
    ${p('<span style="color:#777;font-size:13px;">Final email next week: A simple offer to get your first batch done this week.</span>')}
  `;
  return base(content, unsubUrl);
}

// ─── EMAIL 6: FINAL OFFER ─────────────────────────────────────
function buildFinalOffer(unsubUrl) {
  const content = `
    ${pill('Final Message')}
    ${h1('Your first batch is waiting. Here\'s what happens when you order today.')}
    ${p('Over the past 3 weeks I\'ve shown you the math, the process, the case studies, and the cost comparison. Here\'s the short version of what you get when you place your first order:')}
    <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;">
      <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
        <span style="color:#C6FF40;font-weight:800;font-size:15px;">✓</span>
        <span style="color:#ccc;font-size:14px;line-height:1.5;margin-left:12px;">Send one long-form video (podcast, interview, webinar, talking head)</span>
      </td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
        <span style="color:#C6FF40;font-weight:800;font-size:15px;">✓</span>
        <span style="color:#ccc;font-size:14px;line-height:1.5;margin-left:12px;">We extract 5–15 viral-format clips with captions, hooks, and platform formatting</span>
      </td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
        <span style="color:#C6FF40;font-weight:800;font-size:15px;">✓</span>
        <span style="color:#ccc;font-size:14px;line-height:1.5;margin-left:12px;">Delivered in 24–48 hours, ready to post directly to TikTok, Reels, and Shorts</span>
      </td></tr>
      <tr><td style="padding:10px 0;">
        <span style="color:#C6FF40;font-weight:800;font-size:15px;">✓</span>
        <span style="color:#ccc;font-size:14px;line-height:1.5;margin-left:12px;">Flat rate — no contract, no retainer, no surprise fees</span>
      </td></tr>
    </table>
    ${statsRow([['$220', 'Per repurpose batch'], ['5–15', 'Clips per batch'], ['No', 'Contract required']])}
    ${quoteBlock('The first batch blew me away. I\'ve tried 3 other services and none of them understood hooks and captions the way ShortFormFactory does. We\'re now on a weekly cadence.', '— Agency owner, 2-year client')}
    ${h2('What to do right now')}
    ${p('Click below, pick your service, upload your video link, and we\'ll get started within the business day. Most clients have their clips back before they\'ve posted the raw video anywhere.')}
    ${cta('Place your first order now', `${SITE_URL}/order`)}
    ${p('Or if you\'d rather talk through your specific use case first — book a quick 15-minute call and we\'ll map it out together.')}
    <table cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      <tr><td style="border:1px solid rgba(198,255,64,.4);border-radius:8px;">
        <a href="https://calendly.com/shortformfactory" style="display:inline-block;padding:13px 28px;color:#C6FF40;font-size:14px;font-weight:700;text-decoration:none;">Book a 15-min call →</a>
      </td></tr>
    </table>
    ${p('<span style="color:#555;font-size:13px;">This is the last scheduled email in this series. You\'ll only hear from us if there\'s something genuinely worth sharing. No noise.</span>')}
  `;
  return base(content, unsubUrl);
}

// ─── SEQUENCE RENDERER ────────────────────────────────────────
function buildEmail(step, unsubUrl) {
  switch (step) {
    case 0: return buildWelcome(unsubUrl);
    case 1: return buildROI(unsubUrl);
    case 2: return buildPlaybook(unsubUrl);
    case 3: return buildCaseStudy(unsubUrl);
    case 4: return buildCompare(unsubUrl);
    case 5: return buildSFFOS(unsubUrl);
    case 6: return buildFinalOffer(unsubUrl);
    default: return null;
  }
}

function getSequenceStep(step) {
  return SEQUENCE[step] || null;
}

function getDueStep(subscribedAt) {
  const daysSince = Math.floor((Date.now() - subscribedAt) / (1000 * 60 * 60 * 24));
  for (let i = SEQUENCE.length - 1; i >= 0; i--) {
    if (daysSince >= SEQUENCE[i].dayOffset) return SEQUENCE[i].step;
  }
  return 0;
}

module.exports = { SEQUENCE, buildEmail, getSequenceStep, getDueStep };
