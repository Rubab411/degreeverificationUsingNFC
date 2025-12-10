import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import Student from "../models/student_models.js";
import { v4 as uuidv4 } from "uuid";

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected for seeding"))
  .catch((err) => console.log(err));

// ----------------------------------------------------
// CONSTANTS
// ----------------------------------------------------

const SUBJECT_NAMES = [
  "Programming Fundamentals",
  "OOP",
  "DSA",
  "DBMS",
  "OS",
  "AI",
  "ML",
  "Web Engineering",
];

const PROGRAMS = ["BSCS", "BSIT", "BSAI"];

const DEPARTMENTS = {
  BSCS: "Computer Science",
  BSIT: "Information Technology",
  BSAI: "Artificial Intelligence",
};

const BATCHES = ["2021", "2022", "2023"];
const CAMPUSES = ["Campus2"];

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const rand = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

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

const computeGPA = (subjects) => {
  let totalCredits = 0;
  let totalPoints = 0;

  subjects.forEach((s) => {
    totalCredits += s.credit;
    totalPoints += s.credit * s.gp;
  });

  return +(totalPoints / totalCredits).toFixed(2);
};

// Generate 8 semesters
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

    const gpa = computeGPA(subjects);
    semesters.push({ semester: sem, subjects, gpa });
  }

  return semesters;
};

// ---------------------------------------------------------
// CREATE STUDENT (Perfect Rotation of Program + Department)
// ---------------------------------------------------------

const createStudent = (i) => {
  const program = PROGRAMS[i % PROGRAMS.length];
  const department = DEPARTMENTS[program];
  const batch = BATCHES[i % BATCHES.length];
  const campus = CAMPUSES[0];

  const academic = buildAcademic();
  let allSubs = academic.flatMap((s) => s.subjects);
  const cgpa = computeGPA(allSubs);

  return {
    _id: uuidv4(),
    roll: `${program}-${100 + i + 1}`,
    Name: `Student ${i + 1}`,
    fatherName: `Father ${i + 1}`,
    dob: `200${rand(0, 4)}-0${rand(1, 9)}-0${rand(1, 9)}`,
    gender: rand(0, 1) ? "Male" : "Female",
    email: `student${i + 1}@example.com`,
    phone: `0300${rand(1000000, 9999999)}`,

    program,
    department,
    batch,
    campus,
    startYear: batch,
    currentSemester: 8,

    cgpa,
    academic,

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

// ---------------------------------------------------------
// SEED FUNCTION
// ---------------------------------------------------------

const seedData = async () => {
  try {
    await Student.deleteMany({});

    const students = [];

    for (let i = 0; i < 45; i++) {
      students.push(createStudent(i));
    }

    await Student.insertMany(students);
    console.log("Students seeded successfully!");

    process.exit();
  } catch (err) {
    console.log(err);
    process.exit();
  }
};

seedData();
