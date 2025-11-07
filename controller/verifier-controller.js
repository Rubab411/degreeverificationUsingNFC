const Verifier = require('../models/verifier_model');
const Student = require('../models/student_models');
const SibApiV3Sdk = require('sib-api-v3-sdk');

// init brevo client
const defaultClient = SibApiV3Sdk.ApiClient.instance;
defaultClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

// helper: generate otp
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// helper: extract IP and device from request
function extractClientInfo(req) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
  const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
  return { ipAddress, deviceInfo };
}

// ── Send OTP to verifier email ──
const sendVerifierOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    const otp = generateOtp();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);
    const { ipAddress, deviceInfo } = extractClientInfo(req);

    // upsert verifier record (create if doesn't exist) and save client info
    const verifier = await Verifier.findOneAndUpdate(
      { email },
      {
        email,
        otp,
        otpExpiry: expiry,
        lastLogin: new Date(),
        ip: ipAddress,
        deviceInfo,
      },
      { upsert: true, new: true }
    );

    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = { email: "verifiazapp@gmail.com", name: "Verifier System" };
    sendSmtpEmail.to = [{ email }];
    sendSmtpEmail.subject = "Your Verifier OTP";
    sendSmtpEmail.htmlContent = `<p>Your OTP is <strong>${otp}</strong>. It expires in 5 minutes.</p>`;

    await apiInstance.sendTransacEmail(sendSmtpEmail);

    return res.status(200).json({ message: "OTP sent to verifier email", email: verifier.email });
  } catch (err) {
    console.error("Verifier OTP Error:", err.response?.body || err.message || err);
    return res.status(500).json({ message: "Error sending OTP" });
  }
};

// ── Verify OTP ──
// Behavior:
// - If verifier record does not exist -> create minimal record and tell caller to request OTP first (201).
// - If record exists -> validate OTP and, on success, clear otp, update lastLogin/ip/device and return success.
// Note: we do NOT block unknown emails from being stored — they are upserted at send-otp or created here.
const verifyVerifierOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP required" });

    let verifier = await Verifier.findOne({ email });

    // If verifier doesn't exist, create placeholder and ask caller to request OTP
    if (!verifier) {
      const { ipAddress, deviceInfo } = extractClientInfo(req);
      verifier = await Verifier.create({
        email,
        lastLogin: new Date(),
        ip: ipAddress,
        deviceInfo,
      });

      return res.status(201).json({
        message: "Verifier record created. Please request OTP (use /send-otp) to login.",
        email: verifier.email,
      });
    }

    // If OTP mismatch or expired
    if (!verifier.otp || verifier.otp !== otp) {
      return res.status(400).json({ message: "Invalid or missing OTP" });
    }
    if (verifier.otpExpiry && verifier.otpExpiry < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    // OTP valid -> clear otp, update meta (ip/device/lastLogin)
    const { ipAddress, deviceInfo } = extractClientInfo(req);
    verifier.otp = null;
    verifier.otpExpiry = null;
    verifier.lastLogin = new Date();
    verifier.ip = ipAddress;
    verifier.deviceInfo = deviceInfo;
    await verifier.save();

    return res.status(200).json({
      message: "Verifier logged in successfully",
      email: verifier.email,
      ip: verifier.ip,
      device: verifier.deviceInfo,
      lastLogin: verifier.lastLogin,
    });
  } catch (err) {
    console.error("Verifier verify error:", err);
    return res.status(500).json({ message: "Error verifying OTP" });
  }
};

// ── Scan student by UID ──
// Expects { uid, email } in body. If email provided, we update that verifier's lastScan/ip.
const scanStudentByUid = async (req, res) => {
  try {
    const { uid, email } = req.body;
    if (!uid) return res.status(400).json({ message: "UID required" });

    const student = await Student.findOne({ uid });
    if (!student) {
      return res.status(404).json({ message: "Student not registered" });
    }

    // get verifier and update IP + scan time (create verifier record if email provided but not exist)
    if (email) {
      const { ipAddress, deviceInfo } = extractClientInfo(req);
      await Verifier.findOneAndUpdate(
        { email },
        {
          $set: { ip: ipAddress, lastScan: new Date(), deviceInfo },
          $setOnInsert: { email }, // ensure email exists if creating
        },
        { upsert: true, new: true }
      );
    }

    // prepare student response data (only required fields)
    const responseData = {
      Name: student.Name,
      program: student.program,
      batch: student.batch || "N/A",
      degreeStatus: student.degreeStatus || "Pending",
      degreeGeneratedDate: student.degreeGeneratedDate || null,
    };

    // degree check (based on degreeStatus)
    if (student.degreeStatus === "Generated" || student.degreeStatus === "Verified") {
      return res.status(200).json({
        message: "Degree found and verified",
        student: responseData,
      });
    }

    return res.status(200).json({
      message: "Degree is not generated yet",
      student: responseData,
    });
  } catch (err) {
    console.error("Scan error:", err);
    return res.status(500).json({ message: "Error scanning student" });
  }
};
// ── Get all verifier logs (for admin) ──
const getAllVerifierLogs = async (req, res) => {
  try {
    const verifiers = await Verifier.find()
      .select("email ip deviceInfo lastLogin lastScan createdAt -_id")
      .sort({ lastLogin: -1 }); // latest first

    res.status(200).json({
      count: verifiers.length,
      verifiers,
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
  getAllVerifierLogs, // ✅ added here
};


