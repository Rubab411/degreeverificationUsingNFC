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

const getStudents = async (req, res, next) => {
  try {
    const students = await Student.find();
    res.status(200).json({ students });
  } catch (error) {
    next(error);
  }
};

const createStudent = async (req, res, next) => {
  try {
    const studentExist = await Student.findOne({ roll: req.body.roll });
    if (studentExist) {
      return res.status(400).json({ msg: "Student with this roll number already exists" });
    }

    // ✅ Create new student
    const student = await Student.create(req.body);

    // ✅ Create unique verify link
    const verifyURL = `nfcverify://verify/${student.uid}`;

    // ✅ Save verify URL in database
    student.verifyURL = verifyURL;
    await student.save();

    // ✅ Generate QR code (base64 image)
    const qrImage = await QRCode.toDataURL(verifyURL);

    // ✅ Return response
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

const bindNfcChip = async (req, res, next) => {
  try {
    const { roll, nfcUID } = req.body;

    if (!roll || !nfcUID) {
      return res.status(400).json({ msg: "Roll number and NFC UID are required" });
    }

    // Find student by roll number
    const student = await Student.findOne({ roll });
    if (!student) {
      return res.status(404).json({ msg: "Student not found" });
    }

    // Generate NFC verification link
    const verifyURL = `nfcverify://verify/${student.uid}`;

    // Update student record
    student.nfcUID = nfcUID;
    student.verifyURL = verifyURL;
    await student.save();

    res.status(200).json({
      msg: "NFC chip successfully bound to student",
      student,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getStudents, createStudent,bindNfcChip };
