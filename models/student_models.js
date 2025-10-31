const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid"); // UUID v8 compatible

const studentSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    fatherName: { type: String },
    dob: { type: String },
    gender: { type: String },
    roll: { type: String, required: true, unique: true },
    program: { type: String },
    department: { type: String },
    batch: { type: String },
    campus: { type: String },
    startYear: { type: String },
    endYear: { type: String },
    currentSemester: { type: String },
    cgpa: { type: String },
    uid: { type: String, default: uuidv4, unique: true }, // Auto UUID
    nfcUID: { type: String, default: null }, // Actual chip UID
    verifyURL: { type: String, default: null }, // For mobile verification

    // 🟤 New fields for login system
    email: { type: String, unique: true, sparse: true },
    otp: { type: String, default: null },
    otpExpiry: { type: Date, default: null },

    // 🟢 New fields for degree tracking
    degreeStatus: {
      type: String,
      enum: ["Pending", "In Progress", "Generated"],
      default: "Pending",
    },
    degreeGeneratedDate: { type: Date, default: null }, // optional
  },
  { timestamps: true }
);

module.exports = mongoose.model("Student", studentSchema);
