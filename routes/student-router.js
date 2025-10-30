const express = require("express");
const router = express.Router();
const QRCode = require("qrcode");
const {
  getStudents,
  createStudent,
  bindNfcChip,
  updateStudent,
  deleteStudent,
} = require("../controller/student-controller");
const Student = require("../models/student_models");

// --------------------------------------------------
// 🟩 Get All Students (Admin Dashboard / Normal View)
router.get("/", getStudents);

// --------------------------------------------------
// 🟩 Add New Student
router.post("/", createStudent);

// --------------------------------------------------
// 🟩 Bind NFC chip to a specific student (Admin action)
router.post("/bind-nfc", bindNfcChip);

// --------------------------------------------------
// 🟩 Update Student by ID (Edit Option)
router.put("/:id", updateStudent);

// --------------------------------------------------
// 🟩 Delete Student by ID
router.delete("/:id", deleteStudent);

// --------------------------------------------------
// 🟩 Generate Degree (if needed)
router.post("/generate-degree", async (req, res) => {
  try {
    const { uid, degreeTitle } = req.body;

    if (!uid) {
      return res.status(400).json({ message: "UID is missing in the request" });
    }

    const student = await Student.findOne({ uid });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // ✅ Generate verify URL and QR code
    const verifyURL = `nfcverify://verify/${student.uid}`;
    const qrImage = await QRCode.toDataURL(verifyURL);

    student.degreeTitle = degreeTitle;
    student.degreeIssued = true;
    await student.save();

    res.json({
      message: "Degree generated successfully",
      student,
      qrImage,
      verifyURL,
    });
  } catch (err) {
    console.error("Error generating degree:", err);
    res.status(500).json({ message: "Error generating degree" });
  }
});

// --------------------------------------------------
// 🟩 Verify Student by UID (For NFC Verification)
router.get("/verify", async (req, res) => {
  try {
    const uid = req.query.uid;
    const student = await Student.findOne({ uid });
    if (!student) return res.status(404).send("Student not found");
    res.send(student);
  } catch (err) {
    console.error("Verify error:", err);
    res.status(500).send("Server error");
  }
});

module.exports = router;
