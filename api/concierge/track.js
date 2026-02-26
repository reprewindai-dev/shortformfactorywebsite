// Concierge Event Tracking API
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { event, session_id, url } = req.body;

    if (!event || !session_id) {
      return res.status(400).json({ error: 'Event and session_id are required' });
    }

    // Log the event (in production, save to database)
    console.log('Event tracked:', { event, session_id, url, timestamp: Date.now() });

    res.status(200).json({ success: true });

  } catch (error) {
    console.error('Event tracking error:', error);
    res.status(500).json({ 
      error: 'Failed to track event',
      message: error.message 
    });
  }
}
