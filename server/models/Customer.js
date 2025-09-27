// server/models/Customer.js
const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  },
  { timestamps: true }
);

CustomerSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('Customer', CustomerSchema);