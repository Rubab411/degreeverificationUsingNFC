const mongoose = require('mongoose');

const verifierSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  otp: String,                 // temporarily store OTP
  otpExpiry: Date,
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now },
  ip: String,                  // optional: save IP if you want
});

module.exports = mongoose.model('Verifier', verifierSchema);
