const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const Worker = require('../models/Worker');
const Product = require('../models/Product');

/**
 * POST /api/workers/clock
 * Body: { action: 'in'|'out' }
 * Protegido: requiere Bearer token
 */
router.post('/clock', auth, async (req, res) => {
  try {
    const { action } = req.body || {};
    const user = req.user; // asignado por tu middleware auth

    if (action === 'in') {
      // inicia un turno nuevo con start=now
      user.shifts.push({ start: new Date() });
      await user.save();
      return res.json({ msg: 'clocked-in', shifts: user.shifts });
    }

    if (action === 'out') {
      // busca el último shift sin fin
      const lastOpen = [...user.shifts].reverse().find(s => !s.end);
      if (!lastOpen) return res.status(400).json({ msg: 'no open shift' });

      for (let i = user.shifts.length - 1; i >= 0; i--) {
        if (!user.shifts[i].end) { user.shifts[i].end = new Date(); break; }
      }
      await user.save();
      return res.json({ msg: 'clocked-out', shifts: user.shifts });
    }

    return res.status(400).json({ msg: 'bad action' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'clock error' });
  }
});

/**
 * GET /api/workers/inventory
 * Inventario para workers/managers logueados
 */
router.get('/inventory', auth, async (req, res) => {
  try {
    const products = await Product.find({}, 'name quantity price description image').lean();
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'cannot load inventory' });
  }
});

/**
 * GET /api/workers
 * Lista TODOS los trabajadores (protegido). NO expone passwordHash.
 */
router.get('/', auth, async (req, res) => {
  try {
    const docs = await Worker.find({}, { name: 1, email: 1, role: 1, shifts: 1 }).lean();
    const data = docs.map(w => ({
      _id: w._id,
      name: w.name,
      email: w.email,
      role: w.role,
      shiftsCount: Array.isArray(w.shifts) ? w.shifts.length : 0
    }));
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'cannot list workers' });
  }
});

/**
 * GET /api/workers/me
 * Perfil del worker autenticado (para el panel y el temporizador).
 */
router.get('/me', auth, async (req, res) => {
  try {
    const u = await Worker.findById(req.user._id, { name: 1, email: 1, role: 1, shifts: 1 }).lean();
    if (!u) return res.status(404).json({ error: 'not found' });
    res.json({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      shifts: u.shifts || []
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'cannot load profile' });
  }
});

module.exports = router;