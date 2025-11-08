const mongoose = require('mongoose');

const verifierSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  otp: String,
  otpExpiry: Date,
  lastLogin: Date,
  lastScan: Date,
  lastScannedStudent: {
    uid: { type: String },
    roll: { type: String },
  },
  ip: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Verifier', verifierSchema);
