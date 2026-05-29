import express from "express";
import User from "../models/User.js";
import Class from "../models/Class.js";
import StudentEnrollment from "../models/StudentEnrollment.js";
import { protect, allow } from "../middleware/auth.js";

const router = express.Router();
router.use(protect, allow("admin"));

const instituteId = (req) => req.user.instituteId;

/* ─── Stats ─── */
router.get("/stats", async (req, res) => {
  const iid = instituteId(req);
  const [classes, teachers, students, exams] = await Promise.all([
    Class.countDocuments({ instituteId: iid }),
    User.countDocuments({ instituteId: iid, role: "teacher" }),
    User.countDocuments({ instituteId: iid, role: "student" }),
    Promise.resolve(0),
  ]);
  res.json({ classes, teachers, students, exams });
});

/* ─── Classes ─── */
router.get("/classes", async (req, res) => {
  const classes = await Class.find({ instituteId: instituteId(req) })
    .populate("teacherIds", "fullName email avatarColor")
    .sort({ createdAt: -1 });
  res.json(classes);
});

router.post("/classes", async (req, res) => {
  const { name, roboticsLevel } = req.body;
  if (!name || !roboticsLevel)
    return res.status(400).json({ message: "Name and roboticsLevel required." });
  const cls = await Class.create({ name, roboticsLevel, instituteId: instituteId(req) });
  res.status(201).json(cls);
});

router.put("/classes/:id", async (req, res) => {
  const { name, roboticsLevel } = req.body;
  const cls = await Class.findOneAndUpdate(
    { _id: req.params.id, instituteId: instituteId(req) },
    { $set: { name, roboticsLevel } },
    { new: true }
  );
  if (!cls) return res.status(404).json({ message: "Class not found." });
  res.json(cls);
});

router.delete("/classes/:id", async (req, res) => {
  await Class.findOneAndDelete({ _id: req.params.id, instituteId: instituteId(req) });
  res.json({ message: "Deleted." });
});

/* Assign / remove teacher from class */
router.patch("/classes/:id/teachers", async (req, res) => {
  const { teacherId, action } = req.body; // action: "add" | "remove"
  const cls = await Class.findOne({ _id: req.params.id, instituteId: instituteId(req) });
  if (!cls) return res.status(404).json({ message: "Class not found." });
  if (action === "add") {
    if (!cls.teacherIds.includes(teacherId)) cls.teacherIds.push(teacherId);
  } else {
    cls.teacherIds = cls.teacherIds.filter((id) => id.toString() !== teacherId);
  }
  await cls.save();
  res.json(cls);
});

/* ─── Teachers ─── */
router.get("/teachers", async (req, res) => {
  const teachers = await User.find({ instituteId: instituteId(req), role: "teacher" })
    .select("-password").sort({ createdAt: -1 });
  res.json(teachers);
});

router.post("/teachers", async (req, res) => {
  const { fullName, email, password, phone, avatarColor } = req.body;
  if (!fullName || !email || !password)
    return res.status(400).json({ message: "fullName, email and password required." });
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(409).json({ message: "Email already registered." });
  const user = await User.create({
    fullName, email, password, phone,
    role: "teacher",
    instituteId: instituteId(req),
    avatarColor: avatarColor || "#3b82f6",
  });
  res.status(201).json({ ...user.toObject(), password: undefined });
});

router.patch("/teachers/:id/toggle", async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, instituteId: instituteId(req), role: "teacher" });
  if (!user) return res.status(404).json({ message: "Teacher not found." });
  user.isActive = !user.isActive;
  await user.save();
  res.json({ _id: user._id, isActive: user.isActive });
});

router.patch("/teachers/:id/reset-password", async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6)
    return res.status(400).json({ message: "Password must be at least 6 characters." });
  const user = await User.findOne({ _id: req.params.id, instituteId: instituteId(req), role: "teacher" });
  if (!user) return res.status(404).json({ message: "Teacher not found." });
  user.password = password;
  await user.save();
  res.json({ message: "Password reset." });
});

router.delete("/teachers/:id", async (req, res) => {
  await User.findOneAndDelete({ _id: req.params.id, instituteId: instituteId(req), role: "teacher" });
  res.json({ message: "Deleted." });
});

/* ─── Students ─── */
router.get("/students", async (req, res) => {
  const students = await User.find({ instituteId: instituteId(req), role: "student" })
    .select("-password").sort({ createdAt: -1 });
  res.json(students);
});

router.post("/students", async (req, res) => {
  const { fullName, email, password, phone, rollNumber, avatarColor } = req.body;
  if (!fullName || !email || !password)
    return res.status(400).json({ message: "fullName, email and password required." });
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(409).json({ message: "Email already registered." });
  const user = await User.create({
    fullName, email, password, phone, rollNumber,
    role: "student",
    instituteId: instituteId(req),
    avatarColor: avatarColor || "#16a34a",
  });
  res.status(201).json({ ...user.toObject(), password: undefined });
});

router.patch("/students/:id/toggle", async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, instituteId: instituteId(req), role: "student" });
  if (!user) return res.status(404).json({ message: "Student not found." });
  user.isActive = !user.isActive;
  await user.save();
  res.json({ _id: user._id, isActive: user.isActive });
});

router.patch("/students/:id/reset-password", async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6)
    return res.status(400).json({ message: "Password must be at least 6 characters." });
  const user = await User.findOne({ _id: req.params.id, instituteId: instituteId(req), role: "student" });
  if (!user) return res.status(404).json({ message: "Student not found." });
  user.password = password;
  await user.save();
  res.json({ message: "Password reset." });
});

router.delete("/students/:id", async (req, res) => {
  await User.findOneAndDelete({ _id: req.params.id, instituteId: instituteId(req), role: "student" });
  res.json({ message: "Deleted." });
});

/* Enroll student in a class */
router.post("/students/:id/enroll", async (req, res) => {
  const { classId } = req.body;
  const iid = instituteId(req);
  const cls = await Class.findOne({ _id: classId, instituteId: iid });
  if (!cls) return res.status(404).json({ message: "Class not found." });
  await StudentEnrollment.findOneAndUpdate(
    { studentId: req.params.id, classId },
    { studentId: req.params.id, classId, instituteId: iid },
    { upsert: true, new: true }
  );
  res.json({ message: "Enrolled." });
});

router.delete("/students/:id/enroll/:classId", async (req, res) => {
  await StudentEnrollment.findOneAndDelete({ studentId: req.params.id, classId: req.params.classId });
  res.json({ message: "Removed." });
});

export default router;
