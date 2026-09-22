import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve(process.cwd(), 'db.json');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      if (fs.existsSync(DB_PATH)) {
        const fileData = fs.readFileSync(DB_PATH, 'utf-8');
        const parsed = JSON.parse(fileData);
        return res.status(200).json(parsed.orders || []);
      }
    } catch (e) {}
    return res.status(200).json([]);
  }

  if (req.method === 'POST') {
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
