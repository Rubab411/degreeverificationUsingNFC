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

    // send OTP via Brevo (email)
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = { email: "verifiazapp@gmail.com", name: "Verifier System" };
    sendSmtpEmail.to = [{ email }];
    sendSmtpEmail.subject = "Your Verifier OTP";
    sendSmtpEmail.htmlContent = `<p>Your OTP is <strong>${otp}</strong>. It expires in 5 minutes.</p>`;

    await apiInstance.sendTransacEmail(sendSmtpEmail);

    // store OTP temporarily
    await Verifier.create({
      email,
      otp,
      otpExpiry: expiry,
      ip: ipAddress,
      createdAt: new Date(),
    });

    res.status(200).json({
      message: "OTP sent successfully",
      email,
      ip: ipAddress,
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

    const existing = await Verifier.findOne({ email }).sort({ createdAt: -1 });

    if (!existing) return res.status(400).json({ message: "Please request OTP first" });
    if (existing.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });
    if (existing.otpExpiry < new Date()) return res.status(400).json({ message: "OTP expired" });

    const { ipAddress } = extractClientInfo(req);

    // ✅ create new login session (1 login = 1 session)
    const newSession = await Verifier.create({
      email,
      ip: ipAddress,
      lastLogin: new Date(),
      sessionActive: true,
      createdAt: new Date(),
    });

    res.status(200).json({
      message: "Verifier logged in successfully",
      data: {
        email,
        ip: ipAddress,
        lastLogin: newSession.lastLogin,
        sessionActive: true,
      },
    });
  } catch (err) {
    console.error("Verifier verify error:", err);
    res.status(500).json({ message: "Error verifying OTP" });
  }
};

// ─────────────────────────────────────────────
// 🔹 Scan Student by UID (Only Once per Session)
// ─────────────────────────────────────────────
const scanStudentByUid = async (req, res) => {
  try {
    const { uid, email } = req.body;
    if (!uid) return res.status(400).json({ message: "UID required" });
    if (!email) return res.status(400).json({ message: "Verifier email required" });

    const session = await Verifier.findOne({ email }).sort({ createdAt: -1 });
    if (!session)
      return res.status(403).json({ message: "Login session not found" });

    if (!session.sessionActive)
      return res.status(403).json({ message: "Session expired or already used" });

    if (session.lastScan)
      return res.status(403).json({ message: "You can scan only once per session" });

    const student = await Student.findOne({ uid });
    if (!student)
      return res.status(404).json({ message: "Student not registered" });

    const { ipAddress } = extractClientInfo(req);

    // ✅ Update same session record with scan info
    session.lastScan = new Date();
    session.lastScannedStudent = uid;
    session.ip = ipAddress;
    session.sessionActive = false; // Disable session after one scan
    await session.save();

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

    const responseData = {
      name: student.Name,
      program: student.program,
      batch: student.batch || "N/A",
      degreeStatus: student.degreeStatus || "Pending",
      degreeGeneratedDate: student.degreeGeneratedDate || null,
      scannedAt: formattedTime,
    };

    res.status(200).json({
      message: "Student scanned successfully",
      scannedBy: email,
      ip: ipAddress,
      student: responseData,
      scanTime: formattedTime,
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
      .select("email ip lastLogin lastScan lastScannedStudent sessionActive createdAt -_id")
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
        sessionActive: v.sessionActive ? "Active" : "Closed",
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

// ─────────────────────────────────────────────
// 🔹 Exports
// ─────────────────────────────────────────────
module.exports = {
  sendVerifierOtp,
  verifyVerifierOtp,
  scanStudentByUid,
  getAllVerifierLogs,
};
