const mongoose = require('mongoose');

const ShiftSchema = new mongoose.Schema({
  start: Date,
  end: Date
},{_id:false});

const WorkerSchema = new mongoose.Schema({
  name:{type:String, required:true},
  email:{type:String, required:true, unique:true},
  passwordHash:{type:String, required:true},
  role:{type:String, enum:['worker','manager'], default:'worker'},
  shifts:[ShiftSchema]
},{timestamps:true});

module.exports = mongoose.model('Worker', WorkerSchema);
