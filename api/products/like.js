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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const { productId, liked } = req.body || {};
      let updatedLikes = 0;
      let fsWriteSuccess = false;

      // 1. Local filesystem update
      try {
        if (fs.existsSync(DB_PATH)) {
          const fileData = fs.readFileSync(DB_PATH, 'utf-8');
          const parsed = JSON.parse(fileData);
          const product = (parsed.products || []).find(p => p.id === productId);
          if (product) {
            if (liked) {
              product.likes = (product.likes || 0) + 1;
            } else {
              product.likes = Math.max(0, (product.likes || 0) - 1);
            }
            updatedLikes = product.likes;
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
            const product = (parsed.products || []).find(p => p.id === productId);
            if (product) {
              if (liked) {
                product.likes = (product.likes || 0) + 1;
              } else {
                product.likes = Math.max(0, (product.likes || 0) - 1);
              }
              updatedLikes = product.likes;
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
                message: `chore: update likes for product ${productId} via Vercel`,
                content: updatedContentBase64,
                sha: sha,
                branch: 'main'
              })
            });

            if (putRes.ok) {
              return res.status(200).json({ success: true, likes: updatedLikes, syncedToGitHub: true });
            }
          }
        } catch (ghErr) {
          console.error('Failed to commit product like to GitHub via API:', ghErr);
        }
      }

      return res.status(200).json({ success: true, likes: updatedLikes, localOnly: !fsWriteSuccess });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update likes: ' + err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
