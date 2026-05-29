import mongoose from "mongoose";

const instituteSchema = new mongoose.Schema(
  {
    name:          { type: String, required: true, trim: true },
    code:          { type: String, required: true, unique: true, uppercase: true, trim: true },
    address:       { type: String, default: "" },
    phone:         { type: String, default: "" },
    email:         { type: String, default: "" },
    allowedLevels: { type: [Number], default: [1, 2, 3, 4, 5, 6] },
    accessUntil:   { type: Date, default: null },
    isActive:      { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Institute", instituteSchema);
