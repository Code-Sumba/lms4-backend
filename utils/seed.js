import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import Institute from "../models/Institute.js";

dotenv.config();

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB for seeding...");

  await User.deleteMany({});
  await Institute.deleteMany({});

  // Demo institute
  const institute = await Institute.create({
    name: "Cambridge International School",
    code: "CIS",
    allowedLevels: [1, 2, 3, 4, 5, 6],
  });

  // SuperAdmin (no institute)
  await User.create({
    fullName: "Super Administrator",
    email: "superadmin@motionrobotics.in",
    password: "super123",
    role: "superadmin",
  });

  // Admin
  await User.create({
    fullName: "CIS Administrator",
    email: "admin@motionrobotics.in",
    password: "admin123",
    role: "admin",
    instituteId: institute._id,
    avatarColor: "#8b5cf6",
  });

  // Teacher
  await User.create({
    fullName: "Ms. Sanika Sharma",
    email: "teacher@motionrobotics.in",
    password: "teacher123",
    role: "teacher",
    instituteId: institute._id,
    avatarColor: "#06b6d4",
  });

  // Student
  await User.create({
    fullName: "John Kumar",
    email: "student@motionrobotics.in",
    password: "student123",
    role: "student",
    instituteId: institute._id,
    rollNumber: "STU001",
    avatarColor: "#10b981",
  });

  console.log("Seed complete.");
  console.log("superadmin@motionrobotics.in / super123");
  console.log("admin@motionrobotics.in / admin123");
  console.log("teacher@motionrobotics.in / teacher123");
  console.log("student@motionrobotics.in / student123");
  await mongoose.disconnect();
}

seed().catch((e) => { console.error(e); process.exit(1); });
