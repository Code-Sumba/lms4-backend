import express from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import { protect, allow } from "../middleware/auth.js";

const router = express.Router();
router.use(protect, allow("superadmin"));

const fmtUser = ({ password, ...u }) => ({ ...u, _id: u.id });
const fmtInst = (i) => ({ ...i, _id: i.id });

/* ─── Stats ─── */
router.get("/stats", async (req, res) => {
  const [institutes, users] = await Promise.all([
    prisma.institute.count(),
    prisma.user.count(),
  ]);
  res.json({ institutes, users, experiments: 0, certificates: 0 });
});

/* ─── Institutes ─── */
router.get("/institutes", async (req, res) => {
  const list = await prisma.institute.findMany({ orderBy: { createdAt: "desc" } });
  res.json(list.map(fmtInst));
});

router.post("/institutes", async (req, res) => {
  const { name, code, address, phone, email, allowedLevels, accessUntil } = req.body;
  if (!name || !code) return res.status(400).json({ message: "Name and code are required." });

  const exists = await prisma.institute.findUnique({ where: { code: code.toUpperCase() } });
  if (exists) return res.status(409).json({ message: `Code "${code.toUpperCase()}" is already taken.` });

  const inst = await prisma.institute.create({
    data: {
      name,
      code: code.toUpperCase(),
      address: address || "",
      phone: phone || "",
      email: email || "",
      allowedLevels: allowedLevels || [1, 2, 3, 4, 5, 6],
      accessUntil: accessUntil ? new Date(accessUntil) : null,
    },
  });
  res.status(201).json(fmtInst(inst));
});

router.put("/institutes/:id", async (req, res) => {
  const { name, address, phone, email, allowedLevels, accessUntil } = req.body;
  try {
    const inst = await prisma.institute.update({
      where: { id: req.params.id },
      data: { name, address, phone, email, allowedLevels, accessUntil: accessUntil ? new Date(accessUntil) : null },
    });
    res.json(fmtInst(inst));
  } catch {
    res.status(404).json({ message: "Institute not found." });
  }
});

router.patch("/institutes/:id/toggle", async (req, res) => {
  const inst = await prisma.institute.findUnique({ where: { id: req.params.id } });
  if (!inst) return res.status(404).json({ message: "Institute not found." });
  const updated = await prisma.institute.update({
    where: { id: req.params.id },
    data: { isActive: !inst.isActive },
  });
  res.json(fmtInst(updated));
});

router.delete("/institutes/:id", async (req, res) => {
  await prisma.institute.delete({ where: { id: req.params.id } });
  res.json({ message: "Deleted." });
});

/* ─── Users ─── */
router.get("/users", async (req, res) => {
  const { role, institute } = req.query;
  const where = {};
  if (role) where.role = role;
  if (institute) where.instituteId = institute;
  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true, fullName: true, email: true, role: true,
      instituteId: true, phone: true, rollNumber: true,
      avatarColor: true, isActive: true, createdAt: true, updatedAt: true,
    },
  });
  res.json(users.map((u) => ({ ...u, _id: u.id })));
});

router.post("/users", async (req, res) => {
  const { fullName, email, password, role, instituteId, phone, rollNumber, avatarColor } = req.body;
  if (!fullName || !email || !password || !role)
    return res.status(400).json({ message: "fullName, email, password and role are required." });

  const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (exists) return res.status(409).json({ message: "Email is already registered." });

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      fullName,
      email: email.toLowerCase(),
      password: hashed,
      role,
      instituteId: role === "superadmin" ? null : (instituteId || null),
      phone: phone || "",
      rollNumber: rollNumber || "",
      avatarColor: avatarColor || "#6366f1",
    },
  });
  res.status(201).json(fmtUser(user));
});

router.patch("/users/:id/toggle", async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ message: "User not found." });
  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: !user.isActive },
  });
  res.json({ _id: updated.id, id: updated.id, isActive: updated.isActive });
});

router.patch("/users/:id/reset-password", async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6)
    return res.status(400).json({ message: "Password must be at least 6 characters." });
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ message: "User not found." });
  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { id: req.params.id }, data: { password: hashed } });
  res.json({ message: "Password reset." });
});

router.delete("/users/:id", async (req, res) => {
  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ message: "Deleted." });
});

export default router;
