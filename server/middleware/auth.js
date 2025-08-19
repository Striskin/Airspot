const jwt = require('jsonwebtoken');
const Worker = require('../models/Worker');

module.exports = async function(req,res,next){
  const token = req.headers.authorization?.split(' ')[1];
  if(!token) return res.status(401).json({msg:'No token'});
  try{
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await Worker.findById(payload.id).select('-passwordHash');
    if(!user) return res.status(401).json({msg:'Invalid token'});
    req.user = user;
    next();
  }catch(e){return res.status(401).json({msg:'Token error'})}
}
