const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

router.post('/', async (req, res) => {
  try {
    const data = [
      { name: "AirSpot Pillow - Firm", description: "Firm support pillow with breathable fill.", price: 29.99, quantity: 25 },
      { name: "AirSpot Pillow - Sturdy", description: "Balanced support for everyday sleep.", price: 34.99, quantity: 20 },
      { name: "AirSpot Pillow - Hard", description: "Max support for firm sleepers.", price: 39.99, quantity: 15 }
    ];
    await Product.deleteMany({ name: /^AirSpot Pillow/ });
    const inserted = await Product.insertMany(data);
    res.json({ ok: true, inserted });
  } catch (e) {
    console.error(e);
    res.status(500).json({ e });
  }
});

module.exports = router;
