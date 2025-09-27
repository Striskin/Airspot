// server/server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');

const app = express();

// --- Middlewares base ---
app.use(cors());
app.use(express.json());

// --- Healthcheck simple ---
app.get('/health', (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || 'dev' });
});

// --- Cargador dinámico de rutas ---
const ROUTES_DIR = path.join(__dirname, 'routes');

/**
 * Monta una ruta solo si el archivo existe (dentro de server/routes).
 * @param {string} routePath - nombre del archivo sin .js (ej: 'orders')
 * @param {string} mountAt   - prefijo de montaje (ej: '/api/orders')
 */
function tryMountRoute(routePath, mountAt) {
  const filePath = path.join(ROUTES_DIR, routePath);
  const full = filePath + '.js';
  if (fs.existsSync(full)) {
    const r = require(filePath);
    app.use(mountAt, r);
    console.log(`Mounted route ${mountAt} -> ${routePath}.js`);
    return true;
  } else {
    console.log(`Route file not found: ${routePath}.js (skipping ${mountAt})`);
    return false;
  }
}

// --- IMPORTANTE: monta APIs ANTES del fallback estático ---
// Auth (workers)
tryMountRoute('auth', '/api/auth');

// Customers (registro/login de cliente si lo usas)
tryMountRoute('customers', '/api/customers');

// Products (permite product.js o products.js)
tryMountRoute('product', '/api/products');
tryMountRoute('products', '/api/products');

// Workers (clock, inventory, listado, /me, etc.)
tryMountRoute('workers', '/api/workers');

// Orders (incluye POST /api/orders/checkout si creaste server/routes/orders.js)
tryMountRoute('orders', '/api/orders');

// Datos de prueba / seed (opcional)
tryMountRoute('seed', '/api/seed');

// --- Archivos estáticos ---
app.use(express.static(path.join(__dirname, '../public')));

// --- SPA fallback (DEBE ir después de todas las APIs) ---
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// --- Manejador global de errores ---
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err?.stack || err);
  res.status(500).json({ msg: 'server error' });
});

// --- Arranque / conexión a Mongo ---
const PORT = process.env.PORT || 4000;
const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
  console.error('MONGO_URI not found in .env — server will run without DB (some features will fail).');
  app.listen(PORT, () => console.log(`Server running on ${PORT} (no Mongo)`));
} else {
  // Opcional: para avisos de Mongoose modernos
  mongoose.set('strictQuery', true);

  mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
      console.log('Mongo connected');
      app.listen(PORT, () => console.log(`Server running on ${PORT}`));
    })
    .catch((err) => {
      console.error('Mongo connect error', err);
      // Arranca igual para poder usar el front; comenta si prefieres abortar
      app.listen(PORT, () => console.log(`Server running on ${PORT} (mongo connection failed)`));
    });
}