const express = require('express');
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
const Worker = require('../models/Worker');

// register (manager use)
router.post('/register', async (req,res)=>{
  const {name,email,password,role} = req.body;
  if(!email||!password) return res.status(400).json({msg:'missing'});
  try{
    const existing = await Worker.findOne({email});
    if(existing) return res.status(400).json({msg:'exists'});
    const h = await bcrypt.hash(password, 10);
    const w = await Worker.create({name,email,passwordHash:h, role: role||'worker'});
    const token = jwt.sign({id:w._id}, process.env.JWT_SECRET, {expiresIn:'7d'});
    res.json({token, user:{id:w._id,name:w.name,email:w.email,role:w.role}});
  }catch(e){res.status(500).json({msg:'err', e})}
});

// login
router.post('/login', async (req,res)=>{
  const {email,password} = req.body;
  const w = await Worker.findOne({email});
  if(!w) return res.status(400).json({msg:'bad creds'});
  const ok = await bcrypt.compare(password, w.passwordHash);
  if(!ok) return res.status(400).json({msg:'bad creds'});
  const token = jwt.sign({id:w._id}, process.env.JWT_SECRET, {expiresIn:'7d'});
  res.json({token, user:{id:w._id,name:w.name,email:w.email,role:w.role}});
});

module.exports = router;