const Verifier = require('../models/verifier_model');
const Student = require('../models/student_models');
const SibApiV3Sdk = require('sib-api-v3-sdk');

// ─────────────────────────────────────────────
// 🔹 Brevo Init
// ─────────────────────────────────────────────
const defaultClient = SibApiV3Sdk.ApiClient.instance;
defaultClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

// ─────────────────────────────────────────────
const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const extractClientInfo = (req) => ({
  ipAddress:
    req.headers['x-forwarded-for'] ||
    req.socket.remoteAddress ||
    null,
});

// ─────────────────────────────────────────────
// 🔹 SEND OTP  (ALWAYS CREATE NEW RECORD)
// ─────────────────────────────────────────────
const sendVerifierOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
    const { ipAddress } = extractClientInfo(req);

    // ✉️ Send email
    await apiInstance.sendTransacEmail({
      sender: { email: "verifiazapp@gmail.com", name: "Verifier System" },
      to: [{ email }],
      subject: "Your OTP",
      htmlContent: `<h3>Your OTP: ${otp}</h3><p>Valid for 5 minutes</p>`,
    });

    // ✅ ALWAYS create new verifier record
    await Verifier.create({
      email,
      otp,
      otpExpiry,
      ip: ipAddress,
      lastLogin: new Date(),
    });

    res.status(200).json({ message: "OTP sent successfully" });

  } catch (err) {
    console.error("Send OTP Error:", err);
    res.status(500).json({ message: "OTP send failed" });
  }
};

// ─────────────────────────────────────────────
// 🔹 VERIFY OTP (GET LATEST RECORD)
// ─────────────────────────────────────────────
const verifyVerifierOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ message: "Email & OTP required" });

    // ✅ GET LATEST OTP RECORD
    const verifier = await Verifier.findOne({ email })
      .sort({ createdAt: -1 });

    if (!verifier)
      return res.status(400).json({ message: "OTP not requested" });

    if (verifier.otp !== otp)
      return res.status(400).json({ message: "Invalid OTP" });

    if (verifier.otpExpiry < new Date())
      return res.status(400).json({ message: "OTP expired" });

    const { ipAddress } = extractClientInfo(req);

    // ✅ Clear OTP but keep record (SESSION)
    verifier.otp = null;
    verifier.otpExpiry = null;
    verifier.lastLogin = new Date();
    verifier.ip = ipAddress;
    await verifier.save();

    res.status(200).json({
      message: "Login successful",
      data: {
        sessionId: verifier._id,
        email: verifier.email,
      },
    });

  } catch (err) {
    console.error("Verify OTP Error:", err);
    res.status(500).json({ message: "OTP verification failed" });
  }
};

// ─────────────────────────────────────────────
// 🔹 SCAN STUDENT
// ─────────────────────────────────────────────
const scanStudentByUid = async (req, res) => {
  try {
    const { uid, sessionId } = req.body;
    if (!uid || !sessionId)
      return res.status(400).json({ message: "UID & Session required" });

    const verifier = await Verifier.findById(sessionId);
    if (!verifier)
      return res.status(401).json({ message: "Session expired" });

    if (verifier.lastScannedStudent?.uid)
      return res.status(400).json({ message: "Scan limit reached" });

    const student = await Student.findOne({ uid });
    if (!student)
      return res.status(404).json({ message: "Student not found" });

    const { ipAddress } = extractClientInfo(req);

    verifier.lastScan = new Date();
    verifier.lastScannedStudent = {
      uid: student.uid,
      roll: student.roll || "N/A",
    };
    verifier.ip = ipAddress;
    await verifier.save();

    res.status(200).json({
      message: "Student verified",
      student,
    });

  } catch (err) {
    console.error("Scan Error:", err);
    res.status(500).json({ message: "Scan failed" });
  }
};

// ─────────────────────────────────────────────
// 🔹 GET ALL LOGS
// ─────────────────────────────────────────────
const getAllVerifierLogs = async (req, res) => {
  try {
    const verifiers = await Verifier.find()
      .select("email ip lastLogin lastScan lastScannedStudent createdAt -_id")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: verifiers.length,
      verifiers,
    });
  } catch (err) {
    console.error("Logs Error:", err);
    res.status(500).json({ message: "Error fetching logs" });
  }
};

module.exports = {
  sendVerifierOtp,
  verifyVerifierOtp,
  scanStudentByUid,
  getAllVerifierLogs,
};
