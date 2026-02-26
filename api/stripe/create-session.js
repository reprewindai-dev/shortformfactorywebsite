import Stripe from 'stripe';

const SERVICE_PRICING = {
  aiReel: { basic: 25, standard: 60, premium: 140 },
  socialEdit: { basic: 30, standard: 70, premium: 160 },
  viralCaptions: { basic: 20, standard: 50, premium: 110 },
  podcastRepurpose: { basic: 40, standard: 95, premium: 220 },
  autoCaptions: { basic: 15, standard: 35, premium: 75 },
  smartCut: { basic: 20, standard: 50, premium: 120 },
  backgroundRemoval: { basic: 25, standard: 60, premium: 150 },
  audioSync: { basic: 15, standard: 40, premium: 95 }
};

const ADDON_PRICING = {
  rush: { label: 'Rush Delivery (12-24h)', amount: 25 },
  extraClip: { label: 'Extra Clip (+1)', amount: 15 },
  extraMinute: { label: 'Extra Minute Raw Footage', amount: 10 },
  premiumCaptions: { label: 'Premium Captions Upgrade', amount: 15 },
  colorGrade: { label: 'Color Grade Enhance', amount: 20 },
  advancedEffects: { label: 'Advanced Effects Pack', amount: 25 },
  thumbnails: { label: 'Thumbnail Pack (3 designs)', amount: 20 },
  musicLicense: { label: 'Music Licensing Support', amount: 10 },
  sourceFiles: { label: 'Source File Delivery', amount: 15 }
};

const SERVICE_LABELS = {
  aiReel: 'AI Reel Edit',
  socialEdit: 'Social Media Edit',
  viralCaptions: 'Viral Captions',
  podcastRepurpose: 'Podcast / YouTube Repurpose',
  autoCaptions: 'Auto Captions',
  smartCut: 'Video Trim / Smart Cut',
  backgroundRemoval: 'Background Removal',
  audioSync: 'Add Music / Audio Sync'
};

const PACKAGE_LABELS = {
  basic: 'Basic',
  standard: 'Standard',
  premium: 'Premium'
};

function calculateLineItems(service, packageType, addons = []) {
  const servicePricing = SERVICE_PRICING[service];
  if (!servicePricing) {
    throw new Error('Invalid service selected');
  }

  const basePrice = servicePricing[packageType];
  if (typeof basePrice === 'undefined') {
    throw new Error('Invalid package tier');
  }

  const lineItems = [{
    quantity: 1,
    price_data: {
      currency: 'usd',
      product_data: {
        name: `${SERVICE_LABELS[service] || service} — ${PACKAGE_LABELS[packageType] || packageType}`
      },
      unit_amount: Math.round(basePrice * 100)
    }
  }];

  for (const addon of addons) {
    const addonConfig = ADDON_PRICING[addon];
    if (addonConfig) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: 'usd',
          product_data: { name: `Add-on: ${addonConfig.label}` },
          unit_amount: Math.round(addonConfig.amount * 100)
        }
      });
    }
  }

  return lineItems;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('Stripe secret key not configured. Set STRIPE_SECRET_KEY in environment variables.');
    }

    const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' });

    const { service, package: packageType, addons = [] } = req.body || {};

    if (!service || !packageType) {
      return res.status(400).json({ error: 'Service and package are required.' });
    }

    const lineItems = calculateLineItems(service, packageType, addons);

    const origin = req.headers.origin || process.env.SITE_URL || 'https://shortformfactory.com';
    const successUrl = process.env.STRIPE_SUCCESS_URL || `${origin}/thank-you?provider=stripe`;
    const cancelUrl = process.env.STRIPE_CANCEL_URL || `${origin}/order?status=cancelled`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      payment_method_types: ['card'],
      allow_promotion_codes: true,
      metadata: {
        service,
        package: packageType,
        addons: addons.join(',')
      },
      success_url: successUrl,
      cancel_url: cancelUrl
    });

    return res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error('[Stripe] create-session error:', error);
    return res.status(500).json({ error: error.message || 'Unable to create Stripe session.' });
  }
}
