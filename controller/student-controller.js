// const Student = require("../models/student_models");

// // GET all students
// const getStudents = async (req, res, next) => {
//     try {
//         const students = await Student.find();
//         res.status(200).json({ students });
//     } catch (error) {
//         next(error);
//     }
// };

// // CREATE student + degree info
// const createStudent = async (req, res, next) => {
//     try {
//         const studentExist = await Student.findOne({ rollNo: req.body.rollNo });
//         if (studentExist) {
//             return res.status(400).json({ msg: "Student with this roll number already exists" });
//         }

//         const nfcExist = await Student.findOne({ nfcId: req.body.nfcId });
//         if (nfcExist) {
//             return res.status(400).json({ msg: "NFC ID already assigned" });
//         }

//         const student = await Student.create(req.body);
//         res.status(201).json({ msg: "Student & degree info added successfully", student });
//     } catch (error) {
//         next(error);
//     }
// };

// // GET single student by ID
// const getStudentById = async (req, res, next) => {
//     try {
//         const student = await Student.findById(req.params.id);
//         if (!student) return res.status(404).json({ msg: "Student not found" });
//         res.status(200).json({ student });
//     } catch (error) {
//         next(error);
//     }
// };

// // GET student by NFC ID (for verification)
// const getStudentByNfc = async (req, res, next) => {
//     try {
//         const student = await Student.findOne({ nfcId: req.params.nfcId });
//         if (!student) return res.status(404).json({ msg: "No student linked to this NFC" });
//         res.status(200).json({ student });
//     } catch (error) {
//         next(error);
//     }
// };

// module.exports = { getStudents, createStudent, getStudentById, getStudentByNfc };


// const Student = require("../models/student_models");

// const getStudents = async (req, res, next) => {
//   try {
//     const students = await Student.find();
//     res.status(200).json({ students });
//   } catch (error) {
//     next(error);
//   }
// };

// const createStudent = async (req, res, next) => {
//   try {
//     const studentExist = await Student.findOne({ roll: req.body.roll });
//     if (studentExist) {
//       return res.status(400).json({ msg: "Student with this roll number already exists" });
//     }

//     const student = await Student.create(req.body);
//     res.status(201).json({ msg: "Student added successfully", student });
//   } catch (error) {
//     next(error);
//   }
// };

// module.exports = { getStudents, createStudent };


const Student = require("../models/student_models");
const QRCode = require("qrcode");

// ✅ Get all students
const getStudents = async (req, res, next) => {
  try {
    const students = await Student.find();
    res.status(200).json({ students });
  } catch (error) {
    next(error);
  }
};

// ✅ Create new student
const createStudent = async (req, res, next) => {
  try {
    const studentExist = await Student.findOne({ roll: req.body.roll });
    if (studentExist) {
      return res.status(400).json({ msg: "Student with this roll number already exists" });
    }

    const student = await Student.create(req.body);

    // ✅ Create unique verify link
    const verifyURL = `nfcverify://verify/${student.uid}`;

    // ✅ Save verify URL
    student.verifyURL = verifyURL;
    await student.save();

    // ✅ Generate QR code
    const qrImage = await QRCode.toDataURL(verifyURL);

    res.status(201).json({
      msg: "Student added successfully",
      student,
      verifyURL,
      qrImage,
    });
  } catch (error) {
    next(error);
  }
};

// ✅ Bind NFC Chip
const bindNfcChip = async (req, res, next) => {
  try {
    const { roll, nfcUID } = req.body;
    if (!roll || !nfcUID) {
      return res.status(400).json({ msg: "Roll number and NFC UID are required" });
    }

    const student = await Student.findOne({ roll });
    if (!student) {
      return res.status(404).json({ msg: "Student not found" });
    }

    const verifyURL = `nfcverify://verify/${student.uid}`;
    student.nfcUID = nfcUID;
    student.verifyURL = verifyURL;

    await student.save();

    res.status(200).json({
      msg: "✅ NFC chip bound and verifyURL stored successfully",
      student,
    });
  } catch (error) {
    console.error("❌ bindNfcChip error:", error);
    next(error);
  }
};

// ✅ Update student
const updateStudent = async (req, res, next) => {
  try {
    const { id } = req.params;

    const updatedStudent = await Student.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedStudent) {
      return res.status(404).json({ msg: "Student not found" });
    }

    res.status(200).json({ msg: "Student updated successfully", updatedStudent });
  } catch (error) {
    next(error);
  }
};

// ✅ Delete student
const deleteStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedStudent = await Student.findByIdAndDelete(id);

    if (!deletedStudent) {
      return res.status(404).json({ msg: "Student not found" });
    }

    res.status(200).json({ msg: "Student deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = { 
  getStudents, 
  createStudent, 
  bindNfcChip, 
  updateStudent, 
  deleteStudent 
};
