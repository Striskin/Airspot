const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  passwordHash: String // optional, if you want signup/login later
}, { timestamps: true });

module.exports = mongoose.model('Customer', CustomerSchema);
