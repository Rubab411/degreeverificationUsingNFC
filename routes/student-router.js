const express = require("express");
const router = express.Router();
const Student = require("../models/student_models");
const QRCode = require("qrcode");
const {
  getStudents,
  createStudent,
  bindNfcChip,
  updateStudent,
  deleteStudent,
  sendOtp,
  verifyOtp,
  generateDegree,
  markTranscriptGenerated
} = require("../controller/studentController");

// 🟩 Get All Students - debug friendly
router.get("/", async (req, res, next) => {
  try {
    const students = await Student.find();
    console.log("Fetched students:", students); // Railway logs me check
    res.json(students); // JSON response
  } catch (err) {
    console.error("Error fetching students:", err);
    next(err);
  }
});

// 🟩 Add New Student
router.post("/", createStudent);

// 🟩 Bind NFC chip
router.post("/bind-nfc", bindNfcChip);

// 🟩 Update Student by ID
router.put("/:id", updateStudent);

// 🟩 Delete Student by ID
router.delete("/:id", deleteStudent);

// 🟩 Generate Degree
router.post("/generate-degree", generateDegree);

// 🟩 Verify Student by UID
router.get("/verify/:uid", async (req, res) => {
  try {
    const uid = req.params.uid || req.query.uid;
    const student = await Student.findOne({ uid });
    if (!student) return res.status(404).send("Student not found");
    res.send(student);
  } catch (err) {
    console.error("Verify error:", err);
    res.status(500).send("Server error");
  }
});

// 🟩 Student Login via OTP
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);

// 🟩 Mark Transcript as Generated
router.put("/transcript/:id", markTranscriptGenerated);

module.exports = router;
