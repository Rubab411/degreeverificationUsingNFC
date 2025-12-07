import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import Student from "../models/student_models.js";
import { v4 as uuidv4 } from "uuid";

mongoose
 .connect(process.env.MONGODB_URI)
 .then(() => console.log("MongoDB connected for seeding"))
  .catch((err) => console.log(err));

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
  let tc = 0,
    tp = 0;
  subjects.forEach((s) => {
    tc += s.credit;
    tp += s.credit * s.gp;
  });
  return +(tp / tc).toFixed(2);
};

const buildAcademic = () => {
  const semesters = [];
  for (let sem = 1; sem <= 8; sem++) {
    const subjects = [];
    for (let i = 0; i < 4; i++) {
      const name = SUBJECT_NAMES[(sem + i) % SUBJECT_NAMES.length];
      const credit = 3;
      const marks = rand(60, 95);
      const { grade, gp } = marksToGrade(marks);
      subjects.push({ name, credit, marks, grade, gp });
    }
    semesters.push({ semester: sem, subjects, gpa: computeGPA(subjects) });
  }
  return semesters;
};

const createStudent = (i) => {
  const academic = buildAcademic();
  const cgpa = computeGPA(
    academic.flatMap((s) => s.subjects)
  );

  return {
    Name: `Student ${i + 1}`,
    fatherName: `Father ${i + 1}`,
    dob: "2002-02-01",
    gender: i % 2 ? "Male" : "Female",
    email: `student${i + 1}@example.com`,
    roll: `BSCS-${100 + i}`,
    program: "BSCS",
    department: "Computer Science",
    batch: "2021",
    campus: "Campus2",
    startYear: 2021,
    currentSemester: 8,
    cgpa,
    academic,
    uid: uuidv4(),
    otp: null,
    otpExpiry: null,
    documents: {
      cnic: `/uploads/cnic${i}.png`,
      matric: `/uploads/matric${i}.pdf`,
      inter: `/uploads/inter${i}.pdf`,
      image: `/uploads/profile${i}.jpg`,
    },
  };
};

const seed = async () => {
  await Student.deleteMany();
  await Student.insertMany(
    Array.from({ length: 20 }, (_, i) => createStudent(i))
  );
  console.log("20 Dummy Students Inserted");
  mongoose.connection.close();
};

seed();
