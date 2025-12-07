import Student from "../models/student_models.js";
import QRCode from "qrcode";
import SibApiV3Sdk from "sib-api-v3-sdk";

// 🔹 Initialize Brevo SDK
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

// ✅ Get all students
export const getStudents = async (req, res, next) => {
  try {
    const students = await Student.find();
    res.status(200).json({ students });
  } catch (error) {
    next(error);
  }
};

// ✅ Create student
export const createStudent = async (req, res) => {
  try {
    const allowed = { ...req.body };
    const student = await Student.create(allowed);
    res.status(201).json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Bind NFC Chip
export const bindNfcChip = async (req, res, next) => {
  try {
    const { roll, nfcUID } = req.body;

    if (!roll || !nfcUID)
      return res.status(400).json({ msg: "Roll and NFC UID required" });

    const student = await Student.findOne({ roll });
    if (!student) return res.status(404).json({ msg: "Student not found" });

    const verifyURL = `nfcverify://verify/${student.uid}`;

    student.nfcUID = nfcUID;
    student.verifyURL = verifyURL;

    await student.save();

    res.status(200).json({ msg: "NFC bound", student });
  } catch (error) {
    next(error);
  }
};

// ✅ Update
export const updateStudent = async (req, res) => {
  try {
    const updated = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Delete
export const deleteStudent = async (req, res, next) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.json({ msg: "Student deleted" });
  } catch (err) {
    next(err);
  }
};

// ✅ Send OTP
export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const student = await Student.findOne({ email });
    if (!student) return res.status(404).json({ message: "Email not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    student.otp = otp;
    student.otpExpiry = otpExpiry;
    await student.save();

    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = { email: "verifiazapp@gmail.com", name: "Verifiaz" };
    sendSmtpEmail.to = [{ email }];
    sendSmtpEmail.subject = "Student Login OTP";
    sendSmtpEmail.htmlContent = `<p>Your OTP: <strong>${otp}</strong></p>`;

    await apiInstance.sendTransacEmail(sendSmtpEmail);

    res.json({ message: "OTP sent" });
  } catch (err) {
    res.status(500).json({ message: "OTP error" });
  }
};

// ✅ Verify OTP
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const student = await Student.findOne({ email });

    if (!student) return res.status(404).json({ message: "Student not found" });
    if (student.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });
    if (student.otpExpiry < new Date())
      return res.status(400).json({ message: "OTP expired" });

    student.otp = null;
    student.otpExpiry = null;
    await student.save();

    res.json({
      message: "Login successful",
      student: {
        name: student.Name,
        roll: student.roll,
        program: student.program,
        degreeStatus: student.degreeStatus,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Error" });
  }
};
