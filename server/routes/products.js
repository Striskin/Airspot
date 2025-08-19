const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const auth = require('../middleware/auth');

// Public: list products
router.get('/', async (req,res)=>{
  const products = await Product.find().limit(50);
  res.json(products);
});

// Manager only: create product
router.post('/', auth, async (req,res)=>{
  if(req.user.role !== 'manager') return res.status(403).json({msg:'forbidden'});
  const p = await Product.create(req.body);
  res.json(p);
});

// Manager: update quantity
router.patch('/:id', auth, async (req,res)=>{
  if(req.user.role !== 'manager') return res.status(403).json({msg:'forbidden'});
  const p = await Product.findByIdAndUpdate(req.params.id, req.body, {new:true});
  res.json(p);
});

module.exports = router;
