const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema({
  name: String,
  credit: Number,
  marks: Number,
  grade: String,
  gp: Number,
});

const semesterSchema = new mongoose.Schema({
  semester: Number,
  subjects: [subjectSchema],
  gpa: Number,
});

const documentsSchema = new mongoose.Schema({
  cnic: String,
  matric: String,
  inter: String,
  image: String,
});

const studentSchema = new mongoose.Schema(
  {
    Name: String,
    fatherName: String,
    dob: String,
    gender: String,

    email: String,
    phone: String,

    roll: String,
    department: String,
    program: String,
    batch: String,
    campus: String,
    startYear: Number,
    currentSemester: Number,
    cgpa: Number,

    academic: [semesterSchema],

    documents: documentsSchema,

    verifiedBy: { type: String, default: null },
    verifiedAt: { type: String, default: null },

    uid: String,
    nfcUID: String,
    verifyURL: String,

    otp: String,
    otpExpiry: Date,

    degreeStatus: String,
    degreeTitle: String,
    degreeGeneratedDate: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Student", studentSchema);
