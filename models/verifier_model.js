

 const mongoose = require('mongoose');

const verifierSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },

  otp: { type: String, default: null },

  // ⏱️ TTL index → document auto delete OTP after expiry
  otpExpiry: {
    type: Date,
    default: null,
    index: { expires: 0 } // 🔥 MongoDB TTL
  },

  lastLogin: Date,
  lastScan: Date,

  lastScannedStudent: {
    uid: { type: String, default: null },
    roll: { type: String, default: null },
  },

  ip: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Verifier', verifierSchema);
