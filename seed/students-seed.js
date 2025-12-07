// backend/seed/students-seed.js

const mongoose = require("mongoose");
const Student = require("../models/student_models"); // path adjust karo agar alag ho
const { v4: uuidv4 } = require("uuid");

// MongoDB connection (adjust URI)
mongoose.connect("mongodb://127.0.0.1:27017/nfc_verification", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("✅ MongoDB connected for seeding"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ----------------------------
// SUBJECTS & GPA helpers
// ----------------------------
const SUBJECT_NAMES = ["Programming Fundamentals", "OOP", "DSA", "DBMS", "OS", "AI", "ML", "Web Engineering"];

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const marksToGrade = (marks) => {
  if (marks >= 90) return { grade: "A", gp: 4.0 };
  if (marks >= 85) return { grade: "A-", gp: 3.7 };
  if (marks >= 80) return { grade: "B+", gp: 3.3 };
  if (marks >= 75) return { grade: "B", gp: 3.0 };
  if (marks >= 70) return { grade: "C+", gp: 2.7 };
  if (marks >= 60) return { grade: "C", gp: 2.3 };
  if (marks >= 50) return { grade: "D", gp: 1.0 };
  return { grade: "F", gp: 0.0 };
};

const computeSemesterGPA = (subjects) => {
  let totalCredits = 0;
  let totalPoints = 0;
  subjects.forEach((s) => {
    totalCredits += s.credit;
    totalPoints += s.credit * s.gp;
  });
  return +(totalPoints / totalCredits).toFixed(2);
};

const computeCGPA = (semesters) => {
  let totalCredits = 0;
  let totalPoints = 0;
  semesters.forEach((sem) => {
    sem.subjects.forEach((s) => {
      totalCredits += s.credit;
      totalPoints += s.credit * s.gp;
    });
  });
  return +(totalPoints / totalCredits).toFixed(2);
};

const buildAcademic = () => {
  const semesters = [];
  for (let sem = 1; sem <= 8; sem++) {
    const subjects = [];
    for (let j = 0; j < 4; j++) {
      const name = SUBJECT_NAMES[(sem + j) % SUBJECT_NAMES.length];
      const credit = 3;
      const marks = rand(60, 95);
      const { grade, gp } = marksToGrade(marks);
      subjects.push({ name, credit, marks, grade, gp });
    }
    const gpa = computeSemesterGPA(subjects);
    semesters.push({ semester: sem, subjects, gpa });
  }
  return semesters;
};

// ----------------------------
// Dummy Students Array
// ----------------------------
const departmentsList = ["Computer Science", "Information Technology"];
const campusList = ["Campus2"];
const batches = ["2021", "2022", "2023"];
const programs = ["BSCS", "BSIT", "BSAI"];

const createStudent = (i) => {
  const department = departmentsList[i % departmentsList.length];
  const campus = campusList[0];
  const batch = batches[i % batches.length];
  const program = programs[i % programs.length];
  const academic = buildAcademic();
  const cgpa = computeCGPA(academic);

  return {
    Name: `Student ${i + 1}`,
    fatherName: `Father ${i + 1}`,
    dob: `200${rand(0, 4)}-0${rand(1, 9)}-0${rand(1, 9)}`,
    gender: rand(0, 1) ? "Male" : "Female",
    roll: `${program}-${100 + i + 1}`,
    program,
    department,
    batch,
    campus,
    startYear: +batch,
    currentSemester: 8,
    cgpa,
    academic,
    uid: uuidv4(),
    nfcUID: null,
    verifyURL: null,
    email: `student${i + 1}@example.com`,
    otp: null,
    otpExpiry: null,
    degreeStatus: "Pending",
    degreeGeneratedDate: null,
    documents: {
      cnic: `/uploads/cnic${i + 1}.png`,
      matric: `/uploads/matric${i + 1}.pdf`,
      inter: `/uploads/inter${i + 1}.pdf`,
      image: `/uploads/profile${i + 1}.jpg`,
    },
    verifiedBy: null,
    verifiedAt: null,
  };
};

const dummyStudents = [];
for (let i = 0; i < 20; i++) dummyStudents.push(createStudent(i));

// ----------------------------
// Insert Dummy Students
// ----------------------------
const seedStudents = async () => {
  try {
    await Student.deleteMany(); // delete previous dummy data
    await Student.insertMany(dummyStudents);
    console.log("✅ 20 Dummy Students inserted successfully");
    mongoose.connection.close();
  } catch (err) {
    console.error("❌ Error inserting dummy students:", err);
    mongoose.connection.close();
  }
};

seedStudents();
