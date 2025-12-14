// models/mofa_request_model.js
const mongoose = require("mongoose");

const mofaRequestSchema = new mongoose.Schema({
  studentUID: { type: String, required: true }, // optional, link to Student
  degreeDocument: { type: String, required: true }, // uploaded degree file path/URL
  purpose: { type: String, required: true }, // Job / Study / Immigration
  status: { type: String, default: "Pending" }, // Pending / Approved / Rejected
  submittedAt: { type: Date, default: Date.now },
  verifiedBy: { type: String, default: null },
  verifiedAt: { type: Date, default: null },
});

module.exports = mongoose.model("MOFARequest", mofaRequestSchema);
