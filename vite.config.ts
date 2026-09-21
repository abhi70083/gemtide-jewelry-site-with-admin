import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve(__dirname, 'db.json');

const apiPlugin = () => ({
  name: 'api-plugin',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      // Clean query params if any
      const urlPath = req.url ? req.url.split('?')[0] : '';
      
      if (urlPath === '/api/admin/verify-key' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const { key } = JSON.parse(body);
            const validKey = process.env.ADMIN_KEY || 'GEMTIDE2026';
            if (key === validKey) {
              const otp = Math.floor(100000 + Math.random() * 900000).toString();
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, otp }));
            } else {
              res.statusCode = 401;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: 'Invalid Security Key' }));
            }
          } catch (err) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Invalid payload' }));
          }
        });
      } else if (urlPath === '/api/db' && req.method === 'GET') {
        try {
          const fileData = fs.readFileSync(DB_PATH, 'utf-8');
          res.setHeader('Content-Type', 'application/json');
          res.end(fileData);
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Failed to read database' }));
        }
      } else if (urlPath === '/api/db' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            fs.writeFileSync(DB_PATH, JSON.stringify(parsed, null, 2), 'utf-8');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
          } catch (err) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid JSON or write error' }));
          }
        });
      } else if (urlPath === '/api/products' && req.method === 'GET') {
        try {
          const fileData = fs.readFileSync(DB_PATH, 'utf-8');
          const parsed = JSON.parse(fileData);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(parsed.products || []));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Failed to read database' }));
        }
      } else if (urlPath === '/api/products' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            const newProducts = JSON.parse(body);
            if (!Array.isArray(newProducts)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid data format' }));
              return;
            }
            const fileData = fs.readFileSync(DB_PATH, 'utf-8');
            const parsed = JSON.parse(fileData);
            parsed.products = newProducts;
            fs.writeFileSync(DB_PATH, JSON.stringify(parsed, null, 2), 'utf-8');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Failed to write database' }));
          }
        });
      } else if (urlPath === '/api/orders' && req.method === 'GET') {
        try {
          const fileData = fs.readFileSync(DB_PATH, 'utf-8');
          const parsed = JSON.parse(fileData);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(parsed.orders || []));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Failed to read orders' }));
        }
      } else if (urlPath === '/api/orders' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            const newOrder = JSON.parse(body);
            const fileData = fs.readFileSync(DB_PATH, 'utf-8');
            const parsed = JSON.parse(fileData);
            
            if (!parsed.orders) parsed.orders = [];
            parsed.orders.unshift(newOrder); // Add to the top
            
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
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Failed to save order' }));
          }
        });
      } else if (urlPath === '/api/products/like' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
          body += chunk;
        });
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
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, likes: product ? product.likes : 0 }));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Failed to update likes' }));
          }
        });
      } else {
        next();
      }
    });
  }
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), apiPlugin()],
  server: {
    watch: {
      ignored: [
        '**/node_modules.broken3/**',
        '**/node_modules.broken4/**',
        '**/node_modules_old/**',
        '**/node_modules.corrupted_temp/**',
        '**/.git/**',
        '**/db.json'
      ]
    }
  }
});