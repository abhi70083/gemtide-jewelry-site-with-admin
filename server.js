import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const DB_PATH = path.resolve(__dirname, 'db.json');
const DIST_PATH = path.resolve(__dirname, 'dist');

// MIME types dictionary
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];

  // API Endpoints
  if (urlPath === '/api/admin/verify-key' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { key } = JSON.parse(body);
        const validKey = process.env.ADMIN_KEY || 'GEMTIDE2026';
        if (key === validKey) {
          // Generate 6-digit OTP
          const otp = Math.floor(100000 + Math.random() * 900000).toString();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, otp }));
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Invalid Security Key' }));
        }
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid payload' }));
      }
    });
    return;
  }

  if (urlPath === '/api/db' && req.method === 'GET') {
    try {
      const fileData = fs.readFileSync(DB_PATH, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(fileData);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to read database' }));
    }
    return;
  }

  if (urlPath === '/api/db' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        fs.writeFileSync(DB_PATH, JSON.stringify(parsed, null, 2), 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON or write error' }));
      }
    });
    return;
  }

  if (urlPath === '/api/products' && req.method === 'GET') {
    try {
      const fileData = fs.readFileSync(DB_PATH, 'utf-8');
      const parsed = JSON.parse(fileData);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(parsed.products || []));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to read database' }));
    }
    return;
  }

  if (urlPath === '/api/products' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const newProducts = JSON.parse(body);
        if (!Array.isArray(newProducts)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid data format' }));
          return;
        }
        const fileData = fs.readFileSync(DB_PATH, 'utf-8');
        const parsed = JSON.parse(fileData);
        parsed.products = newProducts;
        fs.writeFileSync(DB_PATH, JSON.stringify(parsed, null, 2), 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to write database' }));
      }
    });
    return;
  }

  if (urlPath === '/api/orders' && req.method === 'GET') {
    try {
      const fileData = fs.readFileSync(DB_PATH, 'utf-8');
      const parsed = JSON.parse(fileData);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(parsed.orders || []));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to read orders' }));
    }
    return;
  }

  if (urlPath === '/api/orders' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const newOrder = JSON.parse(body);
        const fileData = fs.readFileSync(DB_PATH, 'utf-8');
        const parsed = JSON.parse(fileData);
        
        if (!parsed.orders) parsed.orders = [];
        parsed.orders.unshift(newOrder);

        // Deduct stock
        if (Array.isArray(newOrder.items)) {
          newOrder.items.forEach(item => {
            const prod = parsed.products.find(p => p.name === item.name);
            if (prod) {
              prod.stock = Math.max(0, prod.stock - item.quantity);
            }
          });
        }

        fs.writeFileSync(DB_PATH, JSON.stringify(parsed, null, 2), 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to save order' }));
      }
    });
    return;
  }

  if (urlPath === '/api/products/like' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { productId, liked } = JSON.parse(body);
        const fileData = fs.readFileSync(DB_PATH, 'utf-8');
        const parsed = JSON.parse(fileData);
        const product = parsed.products.find(p => p.id === productId);
        if (product) {
          if (liked) {
            product.likes = (product.likes || 0) + 1;
          } else {
            product.likes = Math.max(0, (product.likes || 0) - 1);
          }
        }
        fs.writeFileSync(DB_PATH, JSON.stringify(parsed, null, 2), 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, likes: product ? product.likes : 0 }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to update likes' }));
      }
    });
    return;
  }

  // Serve static assets from the 'dist' directory
  let filePath = path.join(DIST_PATH, urlPath === '/' ? 'index.html' : urlPath);
  
  // Safe path check to prevent directory traversal vulnerability
  if (!filePath.startsWith(DIST_PATH)) {
    res.writeHead(403);
    res.end('Access Denied');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    // If static file is not found (or is a directory), serve index.html for SPA client-side routing
    if (err || stats.isDirectory()) {
      filePath = path.join(DIST_PATH, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500);
        res.end('Error loading page');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

server.listen(PORT, () => {
  console.log(`Production server running at http://localhost:${PORT}`);
});
