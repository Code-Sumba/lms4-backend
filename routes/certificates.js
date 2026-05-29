import express from "express";
import prisma from "../lib/prisma.js";
import { protect, allow } from "../middleware/auth.js";

const router = express.Router();

const fmt = (c) => ({
  ...c,
  _id: c.id,
  student: c.student ? { ...c.student, _id: c.student.id } : undefined,
});

/* ─── SuperAdmin: all certificates ─── */
router.get("/", protect, allow("superadmin"), async (req, res) => {
  const certs = await prisma.certificate.findMany({
    include: {
      student: { select: { id: true, fullName: true, email: true, rollNumber: true, avatarColor: true, institute: { select: { id: true, name: true } } } },
    },
    orderBy: { issuedAt: "desc" },
  });
  res.json(certs.map(fmt));
});

/* ─── Student: my certificates ─── */
router.get("/mine", protect, allow("student"), async (req, res) => {
  const certs = await prisma.certificate.findMany({
    where: { studentId: req.user.id },
    orderBy: { issuedAt: "desc" },
  });
  res.json(certs.map((c) => ({ ...c, _id: c.id })));
});

export default router;
