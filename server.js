import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes       from "./routes/auth.js";
import superadminRoutes from "./routes/superadmin.js";
import adminRoutes      from "./routes/admin.js";
import teacherRoutes    from "./routes/teacher.js";
import studentRoutes    from "./routes/student.js";

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());

/* Routes */
app.use("/api/auth",       authRoutes);
app.use("/api/superadmin", superadminRoutes);
app.use("/api/admin",      adminRoutes);
app.use("/api/teacher",    teacherRoutes);
app.use("/api/student",    studentRoutes);

app.get("/api/health", (_, res) => res.json({ status: "ok", ts: new Date() }));

/* Global error handler */
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Internal server error" });
});

/* Start */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✓ MongoDB connected");
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`✓ Server on http://localhost:${PORT}`));
  })
  .catch((err) => { console.error("DB connection failed:", err.message); process.exit(1); });
