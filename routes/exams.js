import express from "express";
import prisma from "../lib/prisma.js";
import { protect, allow } from "../middleware/auth.js";

const router = express.Router();

const fmtExam = (e) => ({ ...e, _id: e.id });
const fmtQ    = (q) => ({ ...q, _id: q.id });

/* ═══════════════════════════════════════
   SUPERADMIN — Exam CRUD
═══════════════════════════════════════ */
router.get("/", protect, allow("superadmin"), async (req, res) => {
  const { level } = req.query;
  const where = level ? { roboticsLevel: Number(level) } : {};
  const exams = await prisma.exam.findMany({
    where,
    include: { _count: { select: { questions: true, attempts: true } } },
    orderBy: { roboticsLevel: "asc" },
  });
  res.json(exams.map((e) => ({ ...fmtExam(e), questionCount: e._count.questions, attemptCount: e._count.attempts })));
});

router.post("/", protect, allow("superadmin"), async (req, res) => {
  const { title, roboticsLevel, totalMarks, passingMarks, durationMins } = req.body;
  if (!title || !roboticsLevel || !totalMarks || !passingMarks || !durationMins)
    return res.status(400).json({ message: "All fields are required." });
  const exam = await prisma.exam.create({
    data: { title, roboticsLevel: Number(roboticsLevel), totalMarks: Number(totalMarks), passingMarks: Number(passingMarks), durationMins: Number(durationMins) },
  });
  res.status(201).json(fmtExam(exam));
});

router.put("/:id", protect, allow("superadmin"), async (req, res) => {
  const { title, roboticsLevel, totalMarks, passingMarks, durationMins, isActive } = req.body;
  try {
    const exam = await prisma.exam.update({
      where: { id: req.params.id },
      data: { title, roboticsLevel: Number(roboticsLevel), totalMarks: Number(totalMarks), passingMarks: Number(passingMarks), durationMins: Number(durationMins), isActive },
    });
    res.json(fmtExam(exam));
  } catch { res.status(404).json({ message: "Exam not found." }); }
});

router.delete("/:id", protect, allow("superadmin"), async (req, res) => {
  await prisma.exam.delete({ where: { id: req.params.id } });
  res.json({ message: "Deleted." });
});

/* ─── Questions ─── */
router.get("/:id/questions", protect, allow("superadmin", "teacher"), async (req, res) => {
  const questions = await prisma.examQuestion.findMany({
    where: { examId: req.params.id },
    orderBy: { createdAt: "asc" },
  });
  res.json(questions.map(fmtQ));
});

router.post("/:id/questions", protect, allow("superadmin"), async (req, res) => {
  const { question, options, correctAnswer, marks } = req.body;
  if (!question || !options || options.length < 2 || correctAnswer === undefined)
    return res.status(400).json({ message: "question, options (min 2) and correctAnswer required." });
  const q = await prisma.examQuestion.create({
    data: { examId: req.params.id, question, options, correctAnswer: Number(correctAnswer), marks: Number(marks) || 1 },
  });
  res.status(201).json(fmtQ(q));
});

router.put("/:id/questions/:qid", protect, allow("superadmin"), async (req, res) => {
  const { question, options, correctAnswer, marks } = req.body;
  try {
    const q = await prisma.examQuestion.update({
      where: { id: req.params.qid },
      data: { question, options, correctAnswer: Number(correctAnswer), marks: Number(marks) },
    });
    res.json(fmtQ(q));
  } catch { res.status(404).json({ message: "Question not found." }); }
});

router.delete("/:id/questions/:qid", protect, allow("superadmin"), async (req, res) => {
  await prisma.examQuestion.delete({ where: { id: req.params.qid } });
  res.json({ message: "Deleted." });
});

/* ═══════════════════════════════════════
   TEACHER — view exams for their levels, unlock for class, see results
═══════════════════════════════════════ */
router.get("/teacher/list", protect, allow("teacher"), async (req, res) => {
  const teacherId = req.user.id;

  const classTeachers = await prisma.classTeacher.findMany({
    where: { userId: teacherId },
    include: {
      class: {
        include: {
          examUnlocks: { include: { exam: true } },
        },
      },
    },
  });

  const levels   = [...new Set(classTeachers.map((ct) => ct.class.roboticsLevel))];
  const exams    = await prisma.exam.findMany({
    where: { roboticsLevel: { in: levels }, isActive: true },
    include: { _count: { select: { questions: true } } },
    orderBy: { roboticsLevel: "asc" },
  });

  const classes  = classTeachers.map((ct) => ({
    _id:          ct.class.id,
    id:           ct.class.id,
    name:         ct.class.name,
    roboticsLevel: ct.class.roboticsLevel,
    unlockedExamIds: ct.class.examUnlocks.map((u) => u.examId),
  }));

  res.json({
    exams: exams.map((e) => ({ ...fmtExam(e), questionCount: e._count.questions })),
    classes,
  });
});

router.post("/teacher/unlock", protect, allow("teacher"), async (req, res) => {
  const { examId, classId } = req.body;
  await prisma.classExamUnlock.upsert({
    where: { classId_examId: { classId, examId } },
    create: { classId, examId, unlockedById: req.user.id },
    update: {},
  });
  res.json({ message: "Exam unlocked for class." });
});

router.delete("/teacher/unlock/:examId/:classId", protect, allow("teacher"), async (req, res) => {
  await prisma.classExamUnlock.deleteMany({
    where: { examId: req.params.examId, classId: req.params.classId },
  });
  res.json({ message: "Exam locked." });
});

router.get("/teacher/results/:examId", protect, allow("teacher"), async (req, res) => {
  const attempts = await prisma.examAttempt.findMany({
    where: { examId: req.params.examId },
    include: {
      student: { select: { id: true, fullName: true, email: true, rollNumber: true, avatarColor: true } },
    },
    orderBy: { completedAt: "desc" },
  });
  res.json(attempts.map((a) => ({ ...a, _id: a.id, student: { ...a.student, _id: a.student.id } })));
});

/* ═══════════════════════════════════════
   STUDENT — list unlocked exams, attempt, history
═══════════════════════════════════════ */
router.get("/student/list", protect, allow("student"), async (req, res) => {
  const studentId = req.user.id;

  const enrollments = await prisma.studentEnrollment.findMany({
    where: { studentId },
    include: {
      class: {
        include: { examUnlocks: { include: { exam: { include: { _count: { select: { questions: true } } } } } } },
      },
    },
  });

  const seen   = new Set();
  const exams  = [];
  for (const en of enrollments) {
    for (const unlock of en.class.examUnlocks) {
      if (!seen.has(unlock.examId)) {
        seen.add(unlock.examId);
        exams.push({ ...unlock.exam, _id: unlock.exam.id, questionCount: unlock.exam._count.questions });
      }
    }
  }

  // Attach best attempt per exam
  const attempts = await prisma.examAttempt.findMany({
    where: { studentId, examId: { in: exams.map((e) => e.id) } },
    orderBy: { score: "desc" },
  });
  const bestMap  = {};
  for (const a of attempts) {
    if (!bestMap[a.examId]) bestMap[a.examId] = a;
  }

  res.json(exams.map((e) => ({ ...e, bestAttempt: bestMap[e.id] ? { ...bestMap[e.id], _id: bestMap[e.id].id } : null })));
});

router.get("/student/:examId/questions", protect, allow("student"), async (req, res) => {
  const { examId } = req.params;
  const studentId  = req.user.id;

  // Verify student has access (enrolled in a class that has this exam unlocked)
  const enrollment = await prisma.studentEnrollment.findFirst({
    where: {
      studentId,
      class: { examUnlocks: { some: { examId } } },
    },
  });
  if (!enrollment) return res.status(403).json({ message: "Exam not unlocked for your class." });

  const exam      = await prisma.exam.findUnique({ where: { id: examId } });
  const questions = await prisma.examQuestion.findMany({
    where: { examId },
    orderBy: { createdAt: "asc" },
    select: { id: true, question: true, options: true, marks: true }, // hide correctAnswer
  });
  res.json({ exam: fmtExam(exam), questions: questions.map((q) => ({ ...q, _id: q.id })) });
});

router.post("/student/:examId/attempt", protect, allow("student"), async (req, res) => {
  const { examId }   = req.params;
  const { answers }  = req.body; // { [questionId]: selectedOptionIndex }
  const studentId    = req.user.id;

  const enrollment = await prisma.studentEnrollment.findFirst({
    where: { studentId, class: { examUnlocks: { some: { examId } } } },
  });
  if (!enrollment) return res.status(403).json({ message: "Exam not unlocked for your class." });

  const exam      = await prisma.exam.findUnique({ where: { id: examId } });
  const questions = await prisma.examQuestion.findMany({ where: { examId } });

  let score = 0;
  for (const q of questions) {
    if (answers[q.id] !== undefined && Number(answers[q.id]) === q.correctAnswer) {
      score += q.marks;
    }
  }

  const passed  = score >= exam.passingMarks;
  const attempt = await prisma.examAttempt.create({
    data: { examId, studentId, score, totalMarks: exam.totalMarks, passed, answers },
  });

  res.json({ ...attempt, _id: attempt.id, score, totalMarks: exam.totalMarks, passed });
});

router.get("/student/:examId/attempts", protect, allow("student"), async (req, res) => {
  const attempts = await prisma.examAttempt.findMany({
    where: { examId: req.params.examId, studentId: req.user.id },
    orderBy: { completedAt: "desc" },
  });
  res.json(attempts.map((a) => ({ ...a, _id: a.id })));
});

export default router;
