const mongoose = require('mongoose');

const verifierSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  otp: String,
  otpExpiry: Date,
  lastLogin: Date,
  lastScan: Date,        // ✅ new field to record scan time
  ip: String,            // ✅ verifier's IP
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Verifier', verifierSchema);
