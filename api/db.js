import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve(process.cwd(), 'db.json');
const GITHUB_REPO = process.env.GITHUB_REPO || 'abhi70083/gemtide-jewelry-site-with-admin';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET /api/db
  if (req.method === 'GET') {
    try {
      if (fs.existsSync(DB_PATH)) {
        const fileData = fs.readFileSync(DB_PATH, 'utf-8');
        return res.status(200).json(JSON.parse(fileData));
      }
    } catch (e) {
      console.warn('fs read failed, trying GitHub fallback', e);
    }

    try {
      const ghRes = await fetch(`https://raw.githubusercontent.com/${GITHUB_REPO}/main/db.json`);
      if (ghRes.ok) {
        const parsed = await ghRes.json();
        return res.status(200).json(parsed);
      }
    } catch (err) {
      console.error('GitHub fetch failed', err);
    }

    return res.status(500).json({ error: 'Failed to read database' });
  }

  // POST /api/db
  if (req.method === 'POST') {
    try {
      const parsedData = req.body;
      let fsWriteSuccess = false;

      try {
        if (fs.existsSync(DB_PATH)) {
          fs.writeFileSync(DB_PATH, JSON.stringify(parsedData, null, 2), 'utf-8');
          fsWriteSuccess = true;
        }
      } catch (e) {
        console.warn('fs write disabled on Vercel environment:', e.message);
      }

      if (GITHUB_TOKEN) {
        try {
          const getFileRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/db.json`, {
            headers: {
              'Authorization': `Bearer ${GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'Vercel-Serverless-Function'
            }
          });

          if (getFileRes.ok) {
            const fileJson = await getFileRes.json();
            const sha = fileJson.sha;
            const updatedContentBase64 = Buffer.from(JSON.stringify(parsedData, null, 2)).toString('base64');

            const putRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/db.json`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Vercel-Serverless-Function'
              },
              body: JSON.stringify({
                message: 'chore: update db.json database via Admin Portal on Vercel',
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
          console.error('Failed to commit to GitHub via API:', ghErr);
        }
      }

      return res.status(200).json({ success: true, localOnly: !fsWriteSuccess });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to write database: ' + err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
