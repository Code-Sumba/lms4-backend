import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";

export const protect = async (req, res, next) => {
  const token = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.split(" ")[1]
    : null;

  if (!token) return res.status(401).json({ message: "Not authenticated" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true, fullName: true, email: true, role: true,
        instituteId: true, phone: true, rollNumber: true,
        avatarColor: true, isActive: true, createdAt: true, updatedAt: true,
      },
    });
    if (!user || !user.isActive)
      return res.status(401).json({ message: "User not found or inactive" });
    req.user = { ...user, _id: user.id };
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const allow = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ message: "Access denied" });
  next();
};
