  const mongoose = require("mongoose");
  const { v4: uuidv4 } = require("uuid");

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
      uid: { type: String, default: uuidv4, unique: true },
      nfcUID: { type: String, default: null }, // Actual chip UID
     verifyURL: { type: String, default: null }, // For mobile verification
    },
    { timestamps: true }
  );

  module.exports = mongoose.model("Student", studentSchema);
