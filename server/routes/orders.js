// server/routes/orders.js
const express = require('express');
const router = express.Router();

const Product = require('../models/Product');
// Nota: NO usamos ../middleware/auth_user porque no existe.
// Si en el futuro creas auth de cliente, lo importas y lo pones como 2º arg del POST.

// Utilidad: normaliza items del body
function normalizeItems(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((it) => ({
    id: String(it.id || it.productId || '').trim(),
    qty: Math.max(1, Number(it.qty || 0)),
  })).filter(x => x.id && x.qty > 0);
}

/**
 * POST /api/orders/checkout
 * Body: { items: [{ id | productId, qty }, ...] }
 * - Valida stock actual
 * - Descuenta stock con bulkWrite (atómico por documento)
 */
router.post('/checkout', async (req, res) => {
  try {
    const items = normalizeItems(req.body?.items);
    if (!items.length) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Cargar productos implicados
    const ids = items.map(i => i.id);
    const products = await Product.find({ _id: { $in: ids } }, { quantity: 1, name: 1 }).lean();
    const byId = new Map(products.map(p => [String(p._id), p]));

    // Validar existencia y stock suficiente
    for (const it of items) {
      const p = byId.get(it.id);
      if (!p) return res.status(400).json({ error: `Product not found: ${it.id}` });
      const q = Number(p.quantity ?? 0);
      if (q < it.qty) return res.status(400).json({ error: `Insufficient stock for ${p.name}` });
    }

    // Descontar stock (filtro con $gte para evitar condiciones de carrera)
    const ops = items.map(it => ({
      updateOne: {
        filter: { _id: it.id, quantity: { $gte: it.qty } },
        update: { $inc: { quantity: -it.qty } },
      }
    }));

    const result = await Product.bulkWrite(ops, { ordered: true });

    // Verificar que todos los updates se aplicaron
    if (result.modifiedCount !== items.length) {
      return res.status(409).json({ error: 'Concurrent update. Please retry.' });
    }

    // Aquí podrías crear la orden si tienes modelo Order
    // await Order.create({ userId: req.user?._id, items, total, ... })

    return res.json({ ok: true, updated: result.modifiedCount });
  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: 'Checkout failed' });
  }
});

// Opcional: ping
router.get('/ping', (req, res) => res.json({ ok: true }));

module.exports = router;