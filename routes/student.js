import express from "express";
import { protect, allow } from "../middleware/auth.js";

const router = express.Router();
router.use(protect, allow("student"));

router.get("/stats", async (req, res) => {
  res.json({ done: 0, books: 0, exams: 0, progress: 0 });
});

export default router;
