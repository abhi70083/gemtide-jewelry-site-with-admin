export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const { key } = req.body || {};
      const validKey = process.env.ADMIN_KEY || 'GEMTIDE2026';
      if (key === validKey) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        return res.status(200).json({ success: true, otp });
      } else {
        return res.status(401).json({ success: false, error: 'Invalid Security Key' });
      }
    } catch (err) {
      return res.status(400).json({ error: 'Invalid payload' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
