import mongoose from "mongoose";

const enrollmentSchema = new mongoose.Schema(
  {
    studentId:   { type: mongoose.Schema.Types.ObjectId, ref: "User",      required: true },
    classId:     { type: mongoose.Schema.Types.ObjectId, ref: "Class",     required: true },
    instituteId: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
  },
  { timestamps: true }
);

enrollmentSchema.index({ studentId: 1, classId: 1 }, { unique: true });

export default mongoose.model("StudentEnrollment", enrollmentSchema);
