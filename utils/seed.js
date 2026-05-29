import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";

dotenv.config();

async function seed() {
  console.log("Seeding database...");

  // Clear existing data
  await prisma.studentEnrollment.deleteMany();
  await prisma.classTeacher.deleteMany();
  await prisma.class.deleteMany();
  await prisma.user.deleteMany();
  await prisma.institute.deleteMany();

  // Demo institute
  const institute = await prisma.institute.create({
    data: {
      name: "Cambridge International School",
      code: "CIS",
      allowedLevels: [1, 2, 3, 4, 5, 6],
    },
  });

  const hash = (p) => bcrypt.hash(p, 12);

  // SuperAdmin
  await prisma.user.create({
    data: {
      fullName:    "Super Administrator",
      email:       "superadmin@motionrobotics.in",
      password:    await hash("super123"),
      role:        "superadmin",
      avatarColor: "#6366f1",
    },
  });

  // Admin
  await prisma.user.create({
    data: {
      fullName:    "CIS Administrator",
      email:       "admin@motionrobotics.in",
      password:    await hash("admin123"),
      role:        "admin",
      instituteId: institute.id,
      avatarColor: "#8b5cf6",
    },
  });

  // Teacher
  await prisma.user.create({
    data: {
      fullName:    "Ms. Sanika Sharma",
      email:       "teacher@motionrobotics.in",
      password:    await hash("teacher123"),
      role:        "teacher",
      instituteId: institute.id,
      avatarColor: "#06b6d4",
    },
  });

  // Student
  await prisma.user.create({
    data: {
      fullName:    "John Kumar",
      email:       "student@motionrobotics.in",
      password:    await hash("student123"),
      role:        "student",
      instituteId: institute.id,
      rollNumber:  "STU001",
      avatarColor: "#10b981",
    },
  });

  console.log("\n✓ Seed complete!\n");
  console.log("  superadmin@motionrobotics.in  /  super123");
  console.log("  admin@motionrobotics.in       /  admin123");
  console.log("  teacher@motionrobotics.in     /  teacher123");
  console.log("  student@motionrobotics.in     /  student123");

  await prisma.$disconnect();
}

seed().catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
