// server/routes/customers.js
const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const Order = require('../models/Orders');

/** optional: create customer (guest checkout can skip this) */
router.post('/register', async (req, res) => {
  const { name, email } = req.body;
  if (!email) return res.status(400).json({ msg: 'email required' });
  try {
    let c = await Customer.findOne({ email });
    if (c) return res.status(400).json({ msg: 'exists' });
    c = await Customer.create({ name, email });
    res.json({ ok: true, customer: c });
  } catch (e) { 
    console.error('customers.register error', e);
    res.status(500).json({ e: String(e) });
  }
});

/** get orders for a customer by email */
router.get('/:email/orders', async (req, res) => {
  const email = req.params.email;
  const orders = await Order.find({ 'customer.email': email }).sort({ createdAt: -1 });
  res.json(orders);
});

module.exports = router;
