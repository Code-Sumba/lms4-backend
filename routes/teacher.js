import express from "express";
import prisma from "../lib/prisma.js";
import { protect, allow } from "../middleware/auth.js";

const router = express.Router();
router.use(protect, allow("teacher"));

/* ─── Stats ─── */
router.get("/stats", async (req, res) => {
  const teacherId = req.user.id;

  const classTeachers = await prisma.classTeacher.findMany({
    where: { userId: teacherId },
    include: { class: { include: { enrollments: true } } },
  });

  const classes  = classTeachers.length;
  const students = new Set(
    classTeachers.flatMap((ct) => ct.class.enrollments.map((e) => e.studentId))
  ).size;

  res.json({ classes, students, pending: 0, approved: 0 });
});

/* ─── My Classes ─── */
router.get("/classes", async (req, res) => {
  const teacherId = req.user.id;

  const classTeachers = await prisma.classTeacher.findMany({
    where: { userId: teacherId },
    include: {
      class: {
        include: {
          institute: { select: { id: true, name: true, code: true } },
          enrollments: {
            include: {
              student: {
                select: { id: true, fullName: true, email: true, rollNumber: true, avatarColor: true },
              },
            },
          },
          teachers: {
            include: {
              user: { select: { id: true, fullName: true, email: true, avatarColor: true } },
            },
          },
        },
      },
    },
    orderBy: { class: { createdAt: "desc" } },
  });

  const classes = classTeachers.map(({ class: c }) => ({
    _id:          c.id,
    id:           c.id,
    name:         c.name,
    roboticsLevel: c.roboticsLevel,
    institute:    { ...c.institute, _id: c.institute.id },
    students:     c.enrollments.map((e) => ({ ...e.student, _id: e.student.id })),
    teacherIds:   c.teachers.map((t) => ({ ...t.user, _id: t.user.id })),
  }));

  res.json(classes);
});

/* ─── My Content ─── */
router.get("/content", async (req, res) => {
  const teacherId = req.user.id;

  const classTeachers = await prisma.classTeacher.findMany({
    where: { userId: teacherId },
    include: { class: { select: { roboticsLevel: true } } },
  });

  const levels = [...new Set(classTeachers.map((ct) => ct.class.roboticsLevel))];
  if (levels.length === 0) return res.json([]);

  const content = await prisma.content.findMany({
    where: { roboticsLevel: { in: levels } },
    orderBy: [{ roboticsLevel: "asc" }, { type: "asc" }],
  });

  res.json(content.map((c) => ({ ...c, _id: c.id })));
});

export default router;
