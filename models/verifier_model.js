const mongoose = require('mongoose');

const verifierSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  otp: String,
  otpExpiry: Date,
  lastLogin: Date,
  lastScan: Date,
  lastScannedStudent: String, // ✅ store UID of last scanned student
  ip: String,
  deviceInfo: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Verifier', verifierSchema);
