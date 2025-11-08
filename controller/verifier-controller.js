const Verifier = require('../models/verifier_model');
const Student = require('../models/student_models');
const SibApiV3Sdk = require('sib-api-v3-sdk');

// ─────────────────────────────────────────────
// 🔹 Initialize Brevo client
// ─────────────────────────────────────────────
const defaultClient = SibApiV3Sdk.ApiClient.instance;
defaultClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

// 🔹 Generate random 6-digit OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 🔹 Extract IP address
function extractClientInfo(req) {
  const ipAddress =
    req.headers['x-forwarded-for'] ||
    req.socket.remoteAddress ||
    req.connection?.remoteAddress ||
    null;
  return { ipAddress };
}

// ─────────────────────────────────────────────
// 🔹 Send OTP
// ─────────────────────────────────────────────
const sendVerifierOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    const otp = generateOtp();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);
    const { ipAddress } = extractClientInfo(req);

    // Send OTP via Brevo
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = { email: "verifiazapp@gmail.com", name: "Verifier System" };
    sendSmtpEmail.to = [{ email }];
    sendSmtpEmail.subject = "Your Verifier OTP";
    sendSmtpEmail.htmlContent = `<p>Your OTP is <strong>${otp}</strong>. It expires in 5 minutes.</p>`;

    await apiInstance.sendTransacEmail(sendSmtpEmail);

    await Verifier.create({
      email,
      otp,
      otpExpiry: expiry,
      ip: ipAddress,
      lastLogin: new Date(),
    });

    res.status(200).json({
      message: "OTP sent successfully",
      email,
      otpExpiry: expiry,
    });
  } catch (err) {
    console.error("Verifier OTP Error:", err.response?.body || err.message || err);
    res.status(500).json({ message: "Error sending OTP" });
  }
};

// ─────────────────────────────────────────────
// 🔹 Verify OTP (Login)
// ─────────────────────────────────────────────
const verifyVerifierOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP required" });

    const existing = await Verifier.findOne({ email }).sort({ createdAt: -1 });

    if (!existing) return res.status(400).json({ message: "Please request OTP first" });
    if (existing.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });
    if (existing.otpExpiry < new Date()) return res.status(400).json({ message: "OTP expired" });

    const { ipAddress } = extractClientInfo(req);

    // ✅ New login record
    const newLogin = await Verifier.create({
      email,
      ip: ipAddress,
      lastLogin: new Date(),
    });

    res.status(200).json({
      message: "Verifier logged in successfully",
      data: {
        sessionId: newLogin._id, // unique ID for current login session
        email,
        ip: ipAddress,
        lastLogin: newLogin.lastLogin,
      },
    });
  } catch (err) {
    console.error("Verifier verify error:", err);
    res.status(500).json({ message: "Error verifying OTP" });
  }
};

// ─────────────────────────────────────────────
// 🔹 Scan Student (Only Once Per Login)
// ─────────────────────────────────────────────
const scanStudentByUid = async (req, res) => {
  try {
    const { uid, email } = req.body;
    if (!uid) return res.status(400).json({ message: "UID required" });
    if (!email) return res.status(400).json({ message: "Verifier email required" });

    const verifier = await Verifier.findOne({ email }).sort({ createdAt: -1 });
    if (!verifier) return res.status(404).json({ message: "Please login first." });

    // ✅ Prevent multiple scans in same session
    if (verifier.lastScannedStudent) {
      return res.status(400).json({
        message: "You have already scanned in this session. Please login again to scan another student.",
      });
    }

    const student = await Student.findOne({ uid });
    if (!student) return res.status(404).json({ message: "Student not registered" });

    const { ipAddress } = extractClientInfo(req);

    // ✅ Update existing login record with scan info
    verifier.lastScan = new Date();
    verifier.lastScannedStudent = uid;
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
      message: "Student scanned successfully",
      scannedBy: email,
      ip: ipAddress,
      student: {
        name: student.Name,
        program: student.program,
        batch: student.batch || "N/A",
        degreeStatus: student.degreeStatus || "Pending",
        degreeGeneratedDate: student.degreeGeneratedDate || null,
      },
      scanTime: formattedTime,
    });
  } catch (err) {
    console.error("Scan error:", err);
    res.status(500).json({ message: "Error scanning student" });
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
        scannedStudentUID: v.lastScannedStudent || "N/A",
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
