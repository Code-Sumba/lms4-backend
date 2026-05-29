import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email and password required" });

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.matchPassword(password)))
    return res.status(401).json({ message: "Invalid credentials" });

  if (!user.isActive)
    return res.status(403).json({ message: "Account is deactivated" });

  const token = signToken(user._id);
  res.json({
    token,
    user: {
      _id:         user._id,
      fullName:    user.fullName,
      email:       user.email,
      role:        user.role,
      instituteId: user.instituteId,
      avatarColor: user.avatarColor,
    },
  });
});

// GET /api/auth/me
router.get("/me", protect, (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/change-password
router.post("/change-password", protect, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select("+password");
  if (!(await user.matchPassword(currentPassword)))
    return res.status(400).json({ message: "Current password is incorrect" });
  user.password = newPassword;
  await user.save();
  res.json({ message: "Password updated successfully" });
});

export default router;
