// server/server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const ROUTES_DIR = path.join(__dirname, 'routes');

// Helper to load a route only if file exists
function tryMountRoute(routePath, mountAt) {
  const filePath = path.join(ROUTES_DIR, routePath);
  if (fs.existsSync(filePath + '.js')) {
    const r = require(filePath);
    app.use(mountAt, r);
    console.log(`Mounted route ${mountAt} -> ${routePath}.js`);
    return true;
  } else {
    console.log(`Route file not found: ${routePath}.js (skipping ${mountAt})`);
    return false;
  }
}

// Try to mount known routes (order matters — do API routes BEFORE static fallback)
tryMountRoute('auth', '/api/auth');
tryMountRoute('product', '/api/products');     // if your file is named product.js
tryMountRoute('products', '/api/products');    // also check products.js
tryMountRoute('workers', '/api/workers');
tryMountRoute('customers', '/api/customers');
tryMountRoute('orders', '/api/orders');
tryMountRoute('seed', '/api/seed');

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// SPA fallback (must be after API routes)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err && err.stack ? err.stack : err);
  res.status(500).json({ msg: 'server error' });
});

const PORT = process.env.PORT || 4000;

// Connect mongoose and start server
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error('MONGO_URI not found in .env — please add it. Server will still start without DB but some features will fail.');
  // Start server anyway (useful for frontend-only dev)
  app.listen(PORT, () => console.log(`Server running on ${PORT} (no Mongo)`));
} else {
  mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
      console.log('Mongo connected');
      app.listen(PORT, () => console.log(`Server running on ${PORT}`));
    })
    .catch((err) => {
      console.error('Mongo connect error', err);
      // still start server so frontend can load; comment out if you prefer to exit on DB failure
      app.listen(PORT, () => console.log(`Server running on ${PORT} (mongo connection failed)`));
    });
}
