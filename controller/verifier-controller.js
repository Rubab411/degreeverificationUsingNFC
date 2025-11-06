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

// ── Send OTP to verifier email ──
const sendVerifierOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    const otp = generateOtp();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);

    const verifier = await Verifier.findOneAndUpdate(
      { email },
      { email, otp, otpExpiry: expiry, lastLogin: new Date() },
      { upsert: true, new: true }
    );

    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = { email: "verifiazapp@gmail.com", name: "Verifier System" };
    sendSmtpEmail.to = [{ email }];
    sendSmtpEmail.subject = "Your Verifier OTP";
    sendSmtpEmail.htmlContent = `<p>Your OTP is <strong>${otp}</strong>. It expires in 5 minutes.</p>`;

    await apiInstance.sendTransacEmail(sendSmtpEmail);

    res.status(200).json({ message: "OTP sent to verifier email" });
  } catch (err) {
    console.error("Verifier OTP Error:", err.response?.body || err.message);
    res.status(500).json({ message: "Error sending OTP" });
  }
};

// ── Verify OTP ──
const verifyVerifierOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP required" });

    const verifier = await Verifier.findOne({ email });
    if (!verifier) return res.status(404).json({ message: "Verifier not found" });
    if (verifier.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });
    if (verifier.otpExpiry < new Date())
      return res.status(400).json({ message: "OTP expired" });

    verifier.otp = null;
    verifier.otpExpiry = null;
    verifier.lastLogin = new Date();
    await verifier.save();

    res.status(200).json({ message: "Verifier logged in", email: verifier.email });
  } catch (err) {
    console.error("Verifier verify error:", err);
    res.status(500).json({ message: "Error verifying OTP" });
  }
};

// ── Scan student by UID ──
const scanStudentByUid = async (req, res) => {
  try {
    const { uid, email } = req.body;
    if (!uid) return res.status(400).json({ message: "UID required" });

    const student = await Student.findOne({ uid });
    if (!student) {
      return res.status(404).json({ message: "Student not registered" });
    }

    // get verifier and update IP + scan time
    if (email) {
      const ipAddress =
        req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      await Verifier.findOneAndUpdate(
        { email },
        {
          $set: { ip: ipAddress, lastScan: new Date() },
        },
        { new: true }
      );
    }

    // check degree status
    if (
      student.degreeIssued &&
      (student.degreeStatus === "Generated" ||
        student.degreeStatus === "Verified")
    ) {
      return res.status(200).json({
        message: "Degree found and verified",
        student: {
          name: student.Name,
          roll: student.roll,
          program: student.program,
          degreeTitle: student.degreeTitle,
          degreeStatus: student.degreeStatus,
          verifyURL: student.verifyURL || null,
        },
      });
    }

    return res.status(200).json({
      message: "Degree is not generated yet",
      student: { name: student.Name, roll: student.roll },
    });
  } catch (err) {
    console.error("Scan error:", err);
    res.status(500).json({ message: "Error scanning student" });
  }
};

module.exports = { sendVerifierOtp, verifyVerifierOtp, scanStudentByUid };
