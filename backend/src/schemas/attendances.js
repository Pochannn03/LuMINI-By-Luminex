import mongoose from "mongoose";

const AttendanceSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.String,
    required: true,
    unique: true,
  },
  user_id: {
    type: mongoose.Schema.Types.String,
    required: true,
  },
  status: {
    type: mongoose.Schema.Types.String,
    required: true,
  },
  user_note: {
    type: mongoose.Schema.Types.String,
    required: true,
  },
  accompanied_by: {
    type: mongoose.Schema.Types.String,
    required: true,
  },
  created_at: {
    type: mongoose.Schema.Types.String,
    required: true,
  },
});

export const Qr = mongoose.model("Attendance", UserSchema, "atn.attendance_student");



