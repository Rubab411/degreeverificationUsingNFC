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
// 🔹 SEND OTP  (CREATE or UPDATE verifier)
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

    // 🔐 Save OTP in DB
    let verifier = await Verifier.findOne({ email });

    if (!verifier) {
      verifier = await Verifier.create({
        email,
        otp,
        otpExpiry,
        ip: ipAddress,
        lastLogin: new Date(),
      });
    } else {
      verifier.otp = otp;
      verifier.otpExpiry = otpExpiry;
      verifier.ip = ipAddress;
      verifier.lastLogin = new Date();
      await verifier.save();
    }

    res.status(200).json({ message: "OTP sent successfully" });

  } catch (err) {
    console.error("Send OTP Error:", err);
    res.status(500).json({ message: "OTP send failed" });
  }
};

// ─────────────────────────────────────────────
// 🔹 VERIFY OTP
// ─────────────────────────────────────────────
const verifyVerifierOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ message: "Email & OTP required" });

    const verifier = await Verifier.findOne({ email });
    if (!verifier) return res.status(400).json({ message: "OTP not requested" });

    if (verifier.otp !== otp)
      return res.status(400).json({ message: "Invalid OTP" });

    if (verifier.otpExpiry < new Date())
      return res.status(400).json({ message: "OTP expired" });

    const { ipAddress } = extractClientInfo(req);

    // ✅ Clear OTP but keep record
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

    verifier.lastScan = new Date();
    verifier.lastScannedStudent = {
      uid: student.uid,
      roll: student.roll || "N/A",
    };
    verifier.ip = ipAddress;
    await verifier.save();

    const formattedTime = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Karachi",
      hour12: true,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

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
// 🔹 Get All Logs
// ─────────────────────────────────────────────
const getAllVerifierLogs = async (req, res) => {
  try {
    const verifiers = await Verifier.find()
      .select("email ip lastLogin lastScan lastScannedStudent createdAt -_id")
      .sort({ createdAt: -1 });

    const formatted = verifiers.map(v => {
      const formatDate = (d) =>
        d
          ? new Date(d).toLocaleString("en-US", {
              timeZone: "Asia/Karachi",
              hour12: true,
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "N/A";

      return {
        email: v.email,
        ip: v.ip || "N/A",
        lastLogin: formatDate(v.lastLogin),
        lastScan: formatDate(v.lastScan),
        studentRoll: v.lastScannedStudent?.roll || "N/A",
        createdAt: formatDate(v.createdAt),
      };
    });

    res.status(200).json({
      count: formatted.length,
      verifiers: formatted,
    });
  } catch (err) {
    console.error("Error fetching verifier logs:", err);
    res.status(500).json({ message: "Error fetching verifier logs" });
  }
};

module.exports = {
  sendVerifierOtp,
  verifyVerifierOtp,
  scanStudentByUid,
  getAllVerifierLogs,
};
