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

// 🔹 Extract only IP
function extractClientInfo(req) {
  const ipAddress =
    req.headers['x-forwarded-for'] ||
    req.socket.remoteAddress ||
    null;
  return { ipAddress };
}

// ─────────────────────────────────────────────
// 🔹 Send OTP to Verifier Email
// ─────────────────────────────────────────────
const sendVerifierOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    const otp = generateOtp();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);
    const { ipAddress } = extractClientInfo(req);

    const verifier = await Verifier.findOneAndUpdate(
      { email },
      {
        email,
        otp,
        otpExpiry: expiry,
        lastLogin: new Date(),
        ip: ipAddress,
      },
      { upsert: true, new: true }
    );

    // send OTP via email
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = { email: "verifiazapp@gmail.com", name: "Verifier System" };
    sendSmtpEmail.to = [{ email }];
    sendSmtpEmail.subject = "Your Verifier OTP";
    sendSmtpEmail.htmlContent = `<p>Your OTP is <strong>${otp}</strong>. It expires in 5 minutes.</p>`;

    await apiInstance.sendTransacEmail(sendSmtpEmail);

    res.status(200).json({ message: "OTP sent to verifier email", email: verifier.email });
  } catch (err) {
    console.error("Verifier OTP Error:", err.response?.body || err.message || err);
    res.status(500).json({ message: "Error sending OTP" });
  }
};

// ─────────────────────────────────────────────
// 🔹 Verify OTP (Login Verifier)
// ─────────────────────────────────────────────
const verifyVerifierOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP required" });

    let verifier = await Verifier.findOne({ email });

    if (!verifier) {
      const { ipAddress } = extractClientInfo(req);
      verifier = await Verifier.create({
        email,
        lastLogin: new Date(),
        ip: ipAddress,
      });

      return res.status(201).json({
        message: "Verifier record created. Please request OTP again.",
        email: verifier.email,
      });
    }

    if (!verifier.otp || verifier.otp !== otp)
      return res.status(400).json({ message: "Invalid or missing OTP" });

    if (verifier.otpExpiry && verifier.otpExpiry < new Date())
      return res.status(400).json({ message: "OTP expired" });

    const { ipAddress } = extractClientInfo(req);
    verifier.otp = null;
    verifier.otpExpiry = null;
    verifier.lastLogin = new Date();
    verifier.ip = ipAddress;
    await verifier.save();

    res.status(200).json({
      message: "Verifier logged in successfully",
      data: {
        email: verifier.email,
        ip: verifier.ip,
        lastLogin: verifier.lastLogin,
      },
    });
  } catch (err) {
    console.error("Verifier verify error:", err);
    res.status(500).json({ message: "Error verifying OTP" });
  }
};

// ─────────────────────────────────────────────
// 🔹 Scan Student by UID (record who scanned)
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// 🔹 Scan Student by UID (record all scans)
// ─────────────────────────────────────────────
const scanStudentByUid = async (req, res) => {
  try {
    const { uid, email } = req.body;
    if (!uid) return res.status(400).json({ message: "UID required" });

    const student = await Student.findOne({ uid });
    if (!student) {
      return res.status(404).json({ message: "Student not registered" });
    }

    const { ipAddress } = extractClientInfo(req);

    // ✅ Each scan creates a new log entry (no overwrite)
    const newLog = await Verifier.create({
      email: email || "Unknown",
      lastScan: new Date(),
      lastScannedStudent: uid,
      ip: ipAddress,
      createdAt: new Date(),
    });

    const responseData = {
      Name: student.Name,
      program: student.program,
      batch: student.batch || "N/A",
      degreeStatus: student.degreeStatus || "Pending",
      degreeGeneratedDate: student.degreeGeneratedDate || null,
    };

    res.status(200).json({
      message: "Student scanned successfully",
      scannedBy: newLog.email,
      student: responseData,
    });
  } catch (err) {
    console.error("Scan error:", err);
    res.status(500).json({ message: "Error scanning student" });
  }
};


// ─────────────────────────────────────────────
// 🔹 Get All Verifier Logs (Admin View)
// ─────────────────────────────────────────────
const getAllVerifierLogs = async (req, res) => {
  try {
    const verifiers = await Verifier.find()
      .select("email ip lastLogin lastScan lastScannedStudent createdAt -_id")
      .sort({ lastLogin: -1 });

    const formatted = verifiers.map(v => ({
      email: v.email,
      lastLogin: v.lastLogin || "N/A",
      lastScan: v.lastScan || "N/A",
      scannedStudentUID: v.lastScannedStudent || "N/A",
      ip: v.ip || "N/A",
      createdAt: v.createdAt,
    }));

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
