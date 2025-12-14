// models/ibcc_request_model.js
const mongoose = require("mongoose");

const ibccRequestSchema = new mongoose.Schema({
  studentUID: { type: String, required: true }, // optional, link to Student
  matricCertificate: { type: String, required: true },
  interCertificate: { type: String, required: true },
  cnicBForm: { type: String, required: true },
  status: { type: String, default: "Pending" }, // Pending / Approved / Rejected
  submittedAt: { type: Date, default: Date.now },
  verifiedBy: { type: String, default: null },
  verifiedAt: { type: Date, default: null },
});

module.exports = mongoose.model("IBCCRequest", ibccRequestSchema);
