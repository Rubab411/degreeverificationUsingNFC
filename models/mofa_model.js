const mongoose = require("mongoose");

const mofaSchema = new mongoose.Schema({
  studentUID: { type: String, required: true },
  degreeDocument: String,
  purpose: String,
  status: { type: String, default: "Pending" },
  submittedAt: { type: Date, default: Date.now },
  verifiedBy: String,
  verifiedAt: Date,
});

module.exports = mongoose.model("MOFARequest", mofaSchema);
