import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

const safeUser = (u) => ({
  _id:         u.id,
  id:          u.id,
  fullName:    u.fullName,
  email:       u.email,
  role:        u.role,
  instituteId: u.instituteId,
  avatarColor: u.avatarColor,
  phone:       u.phone,
  rollNumber:  u.rollNumber,
  isActive:    u.isActive,
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email and password required" });

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ message: "Invalid credentials" });

  if (!user.isActive)
    return res.status(403).json({ message: "Account is deactivated" });

  res.json({ token: signToken(user.id), user: safeUser(user) });
});

// GET /api/auth/me
router.get("/me", protect, (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/change-password
router.post("/change-password", protect, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!(await bcrypt.compare(currentPassword, user.password)))
    return res.status(400).json({ message: "Current password is incorrect" });

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });
  res.json({ message: "Password updated successfully" });
});

export default router;
