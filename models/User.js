import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    fullName:     { type: String, required: true, trim: true },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:     { type: String, required: true, select: false },
    role:         { type: String, enum: ["superadmin", "admin", "teacher", "student"], required: true },
    instituteId:  { type: mongoose.Schema.Types.ObjectId, ref: "Institute", default: null },
    phone:        { type: String, default: "" },
    rollNumber:   { type: String, default: "" },
    avatarColor:  { type: String, default: "#6366f1" },
    isActive:     { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

export default mongoose.model("User", userSchema);
