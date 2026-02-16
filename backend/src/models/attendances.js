import mongoose from "mongoose";

const AttendanceSchema = new mongoose.Schema({
  student_id: {
    type: String,
    required: true,
  },
  student_name: {
    type: String,
    required: true,
  },
  section_id: { 
    type: Number, 
    required: true 
  },
  section_name: {
    type: String, 
    required: true 
  },
  status: {
    type: String,
    enum: ['Present', 'Late', 'Absent'],
    default: 'Present',
  },
  date: {
    type: String,
    required: true,
  },
  time_in: {
    type: String,
  },
  created_at: {
    type: Date,
    default: Date.now,
  }
});

// FIX: Changed "UserSchema" to "AttendanceSchema"
export const Attendance = mongoose.model("Attendance", AttendanceSchema, "atn.attendance_student");


  // accompanied_by: {
  //   type: mongoose.Schema.Types.String,
  //   required: true,
  // },


