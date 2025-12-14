// models/hec_request_model.js
const mongoose = require("mongoose");

const hecRequestSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  fatherName: { type: String, required: true },
  cnic: { type: String, required: true },
  rollNumber: { type: String, required: true },
  degreeTitle: { type: String, required: true },
  passingYear: { type: Number, required: true },
  instituteName: { type: String, required: true },
  documentURL: { type: String, required: true }, // uploaded document path / URL
  status: { type: String, default: "Pending" },
  submittedAt: { type: Date, default: Date.now },
  verifiedBy: { type: String, default: null },
  verifiedAt: { type: Date, default: null },
  studentUID: { type: String }, // optional, link to Student model if needed
});

module.exports = mongoose.model("HECRequest", hecRequestSchema);
