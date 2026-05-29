import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Institute from "../models/Institute.js";
import { protect } from "../middleware/auth.js";
import { allow } from "../middleware/auth.js";

const router = express.Router();
router.use(protect, allow("superadmin"));

/* ─── Stats ─── */
router.get("/stats", async (req, res) => {
  const [institutes, users] = await Promise.all([
    Institute.countDocuments(),
    User.countDocuments(),
  ]);
  res.json({ institutes, users, experiments: 0, certificates: 0 });
});

/* ─── Institutes ─── */
router.get("/institutes", async (req, res) => {
  const list = await Institute.find().sort({ createdAt: -1 });
  res.json(list);
});

router.post("/institutes", async (req, res) => {
  const { name, code, address, phone, email, allowedLevels, accessUntil } = req.body;
  if (!name || !code) return res.status(400).json({ message: "Name and code are required." });

  const exists = await Institute.findOne({ code: code.toUpperCase() });
  if (exists) return res.status(409).json({ message: `Code "${code.toUpperCase()}" is already taken.` });

  const inst = await Institute.create({
    name, code: code.toUpperCase(), address, phone, email,
    allowedLevels: allowedLevels || [1,2,3,4,5,6],
    accessUntil: accessUntil || null,
  });
  res.status(201).json(inst);
});

router.put("/institutes/:id", async (req, res) => {
  const { name, address, phone, email, allowedLevels, accessUntil } = req.body;
  const inst = await Institute.findByIdAndUpdate(
    req.params.id,
    { $set: { name, address, phone, email, allowedLevels, accessUntil: accessUntil || null } },
    { new: true }
  );
  if (!inst) return res.status(404).json({ message: "Institute not found." });
  res.json(inst);
});

router.patch("/institutes/:id/toggle", async (req, res) => {
  const inst = await Institute.findById(req.params.id);
  if (!inst) return res.status(404).json({ message: "Institute not found." });
  inst.isActive = !inst.isActive;
  await inst.save();
  res.json(inst);
});

router.delete("/institutes/:id", async (req, res) => {
  await Institute.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted." });
});

/* ─── Users ─── */
router.get("/users", async (req, res) => {
  const { role, institute } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (institute) filter.instituteId = institute;
  const users = await User.find(filter).sort({ createdAt: -1 }).select("-password");
  res.json(users);
});

router.post("/users", async (req, res) => {
  const { fullName, email, password, role, instituteId, phone, rollNumber, avatarColor } = req.body;
  if (!fullName || !email || !password || !role)
    return res.status(400).json({ message: "fullName, email, password and role are required." });

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(409).json({ message: "Email is already registered." });

  const user = await User.create({
    fullName, email, password, role,
    instituteId: role === "superadmin" ? null : (instituteId || null),
    phone, rollNumber, avatarColor,
  });
  res.status(201).json({ ...user.toObject(), password: undefined });
});

router.patch("/users/:id/toggle", async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found." });
  user.isActive = !user.isActive;
  await user.save();
  res.json({ _id: user._id, isActive: user.isActive });
});

router.patch("/users/:id/reset-password", async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6)
    return res.status(400).json({ message: "Password must be at least 6 characters." });
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found." });
  user.password = password;
  await user.save();
  res.json({ message: "Password reset." });
});

router.delete("/users/:id", async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted." });
});

export default router;
