import mongoose from "mongoose";

const classSchema = new mongoose.Schema(
  {
    name:          { type: String, required: true, trim: true },
    instituteId:   { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    roboticsLevel: { type: Number, min: 1, max: 6, required: true },
    teacherIds:    [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

export default mongoose.model("Class", classSchema);
