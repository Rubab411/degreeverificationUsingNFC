const Student = require("../models/student_models");
const QRCode = require("qrcode");
const SibApiV3Sdk = require("sib-api-v3-sdk");

// 🔹 Initialize Brevo SDK
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

// ✅ Get all students
const getStudents = async (req, res, next) => {
  try {
    const students = await Student.find();
    res.status(200).json({ students });
  } catch (error) {
    next(error);
  }
};

// ✅ Create new student (now only saves UID)
const createStudent = async (req, res, next) => {
  try {
    const studentExist = await Student.findOne({ roll: req.body.roll });
    if (studentExist) {
      return res.status(400).json({ msg: "Student with this roll number already exists" });
    }

    const student = await Student.create(req.body);

   
   const verifyURL = `nfcverify://verify/${student.uid}`;

    student.verifyURL = verifyURL;
    await student.save();

    // Optional QR (still works fine)
    const qrImage = await QRCode.toDataURL(verifyURL);

    res.status(201).json({
      msg: "Student added successfully",
      student,
      verifyURL,
      qrImage,
    });
  } catch (error) {
    next(error);
  }
};

// ✅ Bind NFC Chip (only saves UID — no popup link)
const bindNfcChip = async (req, res, next) => {
  try {
    const { roll, nfcUID } = req.body;
    if (!roll || !nfcUID) {
      return res.status(400).json({ msg: "Roll number and NFC UID are required" });
    }

    const student = await Student.findOne({ roll });
    if (!student) return res.status(404).json({ msg: "Student not found" });

    // 🔒 Only store UID (no "nfcverify://verify/")
    const verifyURL = `nfcverify://verify/${student.uid}`;

    student.nfcUID = nfcUID;
    student.verifyURL = verifyURL;

    await student.save();

    res.status(200).json({
      msg: "✅ NFC chip bound successfully",
      student,
    });
  } catch (error) {
    console.error("❌ bindNfcChip error:", error);
    next(error);
  }
};

// ✅ Update student
const updateStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedStudent = await Student.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedStudent) {
      return res.status(404).json({ msg: "Student not found" });
    }
    res.status(200).json({ msg: "Student updated successfully!", student: updatedStudent });
  } catch (error) {
    next(error);
  }
};

// ✅ Delete student
const deleteStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedStudent = await Student.findByIdAndDelete(id);
    if (!deletedStudent) {
      return res.status(404).json({ msg: "Student not found" });
    }
    res.status(200).json({ msg: "Student deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// ✅ Send OTP via Brevo API
const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const student = await Student.findOne({ email });
    if (!student) return res.status(404).json({ message: "Email not found in records" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    student.otp = otp;
    student.otpExpiry = otpExpiry;
    await student.save();

    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = { email: "verifiazapp@gmail.com", name: "Verifiaz" };
    sendSmtpEmail.to = [{ email }];
    sendSmtpEmail.subject = "Student Login OTP";
    sendSmtpEmail.htmlContent = `
      <p>Dear Student,</p>
      <p>Your OTP for login is: <strong>${otp}</strong></p>
      <p>This OTP will expire in 5 minutes.</p>
      <p>Regards,<br>NFC Verification System</p>
    `;

    await apiInstance.sendTransacEmail(sendSmtpEmail);

    res.status(200).json({ message: "OTP sent successfully via Brevo API" });
  } catch (err) {
    console.error("❌ OTP Error:", err.response?.body || err.message);
    res.status(500).json({ message: "Error sending OTP" });
  }
};

// ✅ Verify OTP
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const student = await Student.findOne({ email });

    if (!student) return res.status(404).json({ message: "Student not found" });
    if (student.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });
    if (student.otpExpiry < new Date()) return res.status(400).json({ message: "OTP expired" });

    student.otp = null;
    student.otpExpiry = null;
    await student.save();

    res.json({
      message: "Login successful",
      student: {
        name: student.fullName,
        roll: student.roll,
        program: student.program,
        degreeStatus: student.degreeStatus,
        degreeTitle: student.degreeTitle,
      },
    });
  } catch (err) {
    console.error("OTP Verify Error:", err);
    res.status(500).json({ message: "Error verifying OTP" });
  }
};

module.exports = {
  getStudents,
  createStudent,
  bindNfcChip,
  updateStudent,
  deleteStudent,
  sendOtp,
  verifyOtp,
};
