import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve(process.cwd(), 'db.json');
const GITHUB_REPO = process.env.GITHUB_REPO || 'abhi70083/gemtide-jewelry-site-with-admin';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

const getAuthHeader = (token) => {
  if (token.startsWith('Bearer ') || token.startsWith('token ')) return token;
  return `Bearer ${token}`;
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET /api/orders
  if (req.method === 'GET') {
    try {
      if (fs.existsSync(DB_PATH)) {
        const fileData = fs.readFileSync(DB_PATH, 'utf-8');
        const parsed = JSON.parse(fileData);
        return res.status(200).json(parsed.orders || []);
      }
    } catch (e) {
      console.warn('fs read failed, trying GitHub fallback', e);
    }

    try {
      const ghRes = await fetch(`https://raw.githubusercontent.com/${GITHUB_REPO}/main/db.json`);
      if (ghRes.ok) {
        const parsed = await ghRes.json();
        return res.status(200).json(parsed.orders || []);
      }
    } catch (err) {
      console.error('GitHub fetch failed', err);
    }

    return res.status(200).json([]);
  }

  // POST /api/orders
  if (req.method === 'POST') {
    try {
      const newOrder = req.body;
      if (!newOrder || typeof newOrder !== 'object') {
        return res.status(400).json({ error: 'Invalid order payload' });
      }

      let fsWriteSuccess = false;

      // 1. Local filesystem update
      try {
        if (fs.existsSync(DB_PATH)) {
          const fileData = fs.readFileSync(DB_PATH, 'utf-8');
          const parsed = JSON.parse(fileData);

          if (!parsed.orders) parsed.orders = [];
          parsed.orders.unshift(newOrder);

          if (Array.isArray(newOrder.items)) {
            newOrder.items.forEach(item => {
              const prod = (parsed.products || []).find(p => p.name === item.name);
              if (prod) {
                prod.stock = Math.max(0, prod.stock - item.quantity);
              }
            });
          }

          fs.writeFileSync(DB_PATH, JSON.stringify(parsed, null, 2), 'utf-8');
          fsWriteSuccess = true;
        }
      } catch (e) {
        console.warn('fs write warning on serverless environment:', e.message);
      }

      // 2. GitHub commit update if token configured
      if (GITHUB_TOKEN) {
        try {
          const authHeader = getAuthHeader(GITHUB_TOKEN);
          const getFileRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/db.json`, {
            headers: {
              'Authorization': authHeader,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'Vercel-Serverless-Function'
            }
          });

          if (getFileRes.ok) {
            const fileJson = await getFileRes.json();
            const sha = fileJson.sha;
            const contentDecoded = Buffer.from(fileJson.content, 'base64').toString('utf-8');
            const parsed = JSON.parse(contentDecoded);

            if (!parsed.orders) parsed.orders = [];
            parsed.orders.unshift(newOrder);

            if (Array.isArray(newOrder.items)) {
              newOrder.items.forEach(item => {
                const prod = (parsed.products || []).find(p => p.name === item.name);
                if (prod) {
                  prod.stock = Math.max(0, prod.stock - item.quantity);
                }
              });
            }

            const updatedContentBase64 = Buffer.from(JSON.stringify(parsed, null, 2)).toString('base64');

            const putRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/db.json`, {
              method: 'PUT',
              headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
                'User-Agent': 'Vercel-Serverless-Function'
              },
              body: JSON.stringify({
                message: `chore: add order ${newOrder.id || ''} & update stock via Vercel`,
                content: updatedContentBase64,
                sha: sha,
                branch: 'main'
              })
            });

            if (putRes.ok) {
              return res.status(200).json({ success: true, syncedToGitHub: true });
            }
          }
        } catch (ghErr) {
          console.error('Failed to commit order to GitHub via API:', ghErr);
        }
      }

      return res.status(200).json({ success: true, localOnly: !fsWriteSuccess });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to save order: ' + err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
