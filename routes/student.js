import express from "express";
import prisma from "../lib/prisma.js";
import { protect, allow } from "../middleware/auth.js";

const router = express.Router();
router.use(protect, allow("student"));

/* ─── Stats ─── */
router.get("/stats", async (req, res) => {
  const studentId = req.user.id;

  const enrollments = await prisma.studentEnrollment.count({ where: { studentId } });

  res.json({ classes: enrollments, done: 0, books: 0, exams: 0, progress: 0 });
});

/* ─── My Classes ─── */
router.get("/classes", async (req, res) => {
  const studentId = req.user.id;

  const enrollments = await prisma.studentEnrollment.findMany({
    where: { studentId },
    include: {
      class: {
        include: {
          institute: { select: { id: true, name: true, code: true } },
          teachers: {
            include: {
              user: { select: { id: true, fullName: true, email: true, avatarColor: true } },
            },
          },
          enrollments: { select: { studentId: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const classes = enrollments.map(({ class: c }) => ({
    _id:           c.id,
    id:            c.id,
    name:          c.name,
    roboticsLevel: c.roboticsLevel,
    institute:     { ...c.institute, _id: c.institute.id },
    teacherIds:    c.teachers.map((t) => ({ ...t.user, _id: t.user.id })),
    studentCount:  c.enrollments.length,
  }));

  res.json(classes);
});

/* ─── My Content ─── */
router.get("/content", async (req, res) => {
  const studentId = req.user.id;

  // Get all levels from enrolled classes
  const enrollments = await prisma.studentEnrollment.findMany({
    where: { studentId },
    include: { class: { select: { roboticsLevel: true } } },
  });

  const levels = [...new Set(enrollments.map((e) => e.class.roboticsLevel))];
  if (levels.length === 0) return res.json([]);

  const content = await prisma.content.findMany({
    where: { roboticsLevel: { in: levels } },
    orderBy: [{ roboticsLevel: "asc" }, { type: "asc" }],
  });

  res.json(content.map((c) => ({ ...c, _id: c.id })));
});

export default router;
