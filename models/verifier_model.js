const mongoose = require('mongoose');

const verifierSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true }, // ✅ Verifier's email
  otp: String,                                          // ✅ OTP sent to email
  otpExpiry: Date,                                      // ✅ OTP expiration time
  lastLogin: Date,                                      // ✅ Last successful login
  lastScan: Date,                                       // ✅ Last scan performed
  ip: String,                                           // ✅ IP address of verifier
  deviceInfo: String,                                   // ✅ Device or browser info (from User-Agent)
  createdAt: { type: Date, default: Date.now },         // ✅ Record creation time
});

module.exports = mongoose.model('Verifier', verifierSchema);
