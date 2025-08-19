const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name:{type:String, required:true},
  description:String,
  price:{type:Number, required:true, min:0},
  image:String, // url or path
  quantity:{type:Number, default:0}
},{timestamps:true});

module.exports = mongoose.model('Product', ProductSchema);
