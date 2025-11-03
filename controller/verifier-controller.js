const Verifier = require('../models/verifier_model');
const Student = require('../models/student_models');
const SibApiV3Sdk = require('sib-api-v3-sdk');

// init brevo client (ensure BREVO_API_KEY in env)
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
    const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 min

    // upsert verifier record
    const verifier = await Verifier.findOneAndUpdate(
      { email },
      { email, otp, otpExpiry: expiry, lastLogin: new Date() },
      { upsert: true, new: true }
    );

    // send email via Brevo (same pattern as student)
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
sendSmtpEmail.sender = { email: "verifiazapp@gmail.com", name: "Verifier" }; // ✅ fixed sender
sendSmtpEmail.to = [{ email }];
sendSmtpEmail.subject = "Your Verifier OTP";
sendSmtpEmail.htmlContent = `
  <p>Your verifier OTP is: <strong>${otp}</strong>. Expires in 5 min.</p>
`;

await apiInstance.sendTransacEmail(sendSmtpEmail);

    return res.status(200).json({ message: 'OTP sent to verifier email' });
  } catch (err) {
    console.error('Verifier OTP Error:', err.response?.body || err.message);
    return res.status(500).json({ message: 'Error sending OTP' });
  }
};

// ── Verify verifier OTP ──
const verifyVerifierOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP required' });

    const verifier = await Verifier.findOne({ email });
    if (!verifier) return res.status(404).json({ message: 'Verifier not found' });
    if (verifier.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });
    if (verifier.otpExpiry < new Date()) return res.status(400).json({ message: 'OTP expired' });

    // clear OTP and set lastLogin
    verifier.otp = null;
    verifier.otpExpiry = null;
    verifier.lastLogin = new Date();
    await verifier.save();

    // return success (you can return a short-lived token if desired)
    return res.status(200).json({ message: 'Verifier logged in', email: verifier.email });
  } catch (err) {
    console.error('Verifier verify error:', err);
    return res.status(500).json({ message: 'Error verifying OTP' });
  }
};

// ── Scan student by UID (verifier action) ──
const scanStudentByUid = async (req, res) => {
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ message: 'UID required' });

    const student = await Student.findOne({ uid });
    if (!student) {
      return res.status(404).json({ message: 'Student not registered' });
    }

    // check degree status
    if (student.degreeIssued && (student.degreeStatus === 'Generated' || student.degreeStatus === 'Verified')) {
      return res.status(200).json({
        message: 'Degree found',
        student: {
          name: student.fullName,
          roll: student.roll,
          program: student.program,
          degreeTitle: student.degreeTitle,
          degreeStatus: student.degreeStatus,
          verifyURL: student.verifyURL || null
        }
      });
    }

    // degree not generated
    return res.status(200).json({ message: 'Degree is not generated yet', student: { name: student.fullName, roll: student.roll }});
  } catch (err) {
    console.error('Scan error:', err);
    return res.status(500).json({ message: 'Error scanning student' });
  }
};

module.exports = { sendVerifierOtp, verifyVerifierOtp, scanStudentByUid };
