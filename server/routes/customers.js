// server/routes/customers.js
const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');

/**
 * POST /api/customers/register
 * Crea el cliente si no existe (idempotente) y lo devuelve.
 * Body: { name, email }
 */
router.post('/register', async (req, res) => {
  try {
    const { name = '', email = '' } = req.body || {};
    if (!email) return res.status(400).json({ ok: false, msg: 'Email required' });

    const customer = await Customer.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      { $setOnInsert: { email: email.toLowerCase().trim(), name: name || '' } },
      { new: true, upsert: true }
    );

    return res.json({ ok: true, customer });
  } catch (err) {
    if (err.code === 11000) {
      const customer = await Customer.findOne({ email: (req.body.email || '').toLowerCase().trim() });
      return res.json({ ok: true, customer });
    }
    console.error('customers/register error:', err);
    return res.status(500).json({ ok: false, msg: 'server error' });
  }
});

/**
 * POST /api/customers/signin
 * Busca cliente existente por email en BD y lo devuelve.
 * Body: { email }
 */
router.post('/signin', async (req, res) => {
  try {
    const { email = '' } = req.body || {};
    if (!email) return res.status(400).json({ ok: false, msg: 'Email required' });

    const customer = await Customer.findOne({ email: email.toLowerCase().trim() });
    if (!customer) return res.status(404).json({ ok: false, msg: 'No local account found. Please sign up.' });

    return res.json({ ok: true, customer });
  } catch (err) {
    console.error('customers/signin error:', err);
    return res.status(500).json({ ok: false, msg: 'server error' });
  }
});

module.exports = router;