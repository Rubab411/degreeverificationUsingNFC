const mongoose = require("mongoose");

const ibccSchema = new mongoose.Schema({
  studentUID: { type: String, required: true },
  matricCertificate: String,
  interCertificate: String,
  cnicBForm: String,
  status: { type: String, default: "Pending" },
  submittedAt: { type: Date, default: Date.now },
  verifiedBy: String,
  verifiedAt: Date,
});

module.exports = mongoose.model("IBCCRequest", ibccSchema);
