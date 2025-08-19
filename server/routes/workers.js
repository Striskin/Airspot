const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Worker = require('../models/Worker');
const Product = require('../models/Product');

// Worker clock-in/out
// POST /api/workers/clock { action: 'in'|'out' }
router.post('/clock', auth, async (req,res)=>{
  const {action} = req.body;
  const user = req.user;
  if(action==='in'){
    // start a new shift with start = now
    user.shifts.push({ start: new Date() });
    await user.save();
    return res.json({msg:'clocked-in', shifts:user.shifts});
  } else if(action==='out'){
    // find last shift without end
    const last = [...user.shifts].reverse().find(s=>!s.end);
    if(!last){
      return res.status(400).json({msg:'no open shift'});
    }
    // set end on last open shift
    for(let i = user.shifts.length-1; i>=0; i--){
      if(!user.shifts[i].end){ user.shifts[i].end = new Date(); break; }
    }
    await user.save();
    return res.json({msg:'clocked-out', shifts:user.shifts});
  } else return res.status(400).json({msg:'bad action'});
});

// Inventory check (workers & managers)
router.get('/inventory', auth, async (req,res)=>{
  const products = await Product.find({}, 'name quantity price description image');
  res.json(products);
});

module.exports = router;
