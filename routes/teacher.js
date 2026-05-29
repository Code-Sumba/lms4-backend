import express from "express";
import { protect, allow } from "../middleware/auth.js";

const router = express.Router();
router.use(protect, allow("teacher"));

router.get("/stats", async (req, res) => {
  res.json({ classes: 0, pending: 0, approved: 0 });
});

export default router;
