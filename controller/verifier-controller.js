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
// 🔹 Send OTP to Verifier Email
// ─────────────────────────────────────────────
const sendVerifierOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    const otp = generateOtp();
    const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry
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

    res.status(200).json({
      message: "OTP sent successfully",
      email: verifier.email,
      ip: verifier.ip,
      otpExpiry: expiry,
    });
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
        ip: ipAddress,
        lastLogin: new Date(),
      });
      return res.status(201).json({
        message: "Verifier record created. Please request OTP again.",
        email: verifier.email,
      });
    }

    if (verifier.otp !== otp)
      return res.status(400).json({ message: "Invalid OTP" });

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
// 🔹 Scan Student by UID
//    Logs every scan with verifier + student + time + ip
// ─────────────────────────────────────────────
const scanStudentByUid = async (req, res) => {
  try {
    const { uid, email } = req.body;
    if (!uid) return res.status(400).json({ message: "UID required" });
    if (!email) return res.status(400).json({ message: "Verifier email required" });

    const student = await Student.findOne({ uid });
    if (!student)
      return res.status(404).json({ message: "Student not registered" });

    const { ipAddress } = extractClientInfo(req);

    // ✅ Log the scan (do not overwrite verifier entry)
    await Verifier.create({
      email,
      ip: ipAddress,
      lastScan: new Date(),
      lastScannedStudent: uid,
      createdAt: new Date(),
    });

    const responseData = {
      name: student.Name,
      program: student.program,
      batch: student.batch || "N/A",
      degreeStatus: student.degreeStatus || "Pending",
      degreeGeneratedDate: student.degreeGeneratedDate || null,
      scannedAt: new Date(),
    };

    res.status(200).json({
      message: "Student scanned successfully",
      scannedBy: email,
      ip: ipAddress,
      student: responseData,
    });
  } catch (err) {
    console.error("Scan error:", err);
    res.status(500).json({ message: "Error scanning student" });
  }
};

// ─────────────────────────────────────────────
// 🔹 Get All Verifier Logs (Admin Panel)
// ─────────────────────────────────────────────
const getAllVerifierLogs = async (req, res) => {
  try {
    const verifiers = await Verifier.find()
      .select("email ip lastLogin lastScan lastScannedStudent createdAt -_id")
      .sort({ createdAt: -1 });

    const formatted = verifiers.map(v => ({
      email: v.email,
      ip: v.ip || "N/A",
      lastLogin: v.lastLogin || "N/A",
      lastScan: v.lastScan || "N/A",
      scannedStudentUID: v.lastScannedStudent || "N/A",
      scanTime: v.createdAt,
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
