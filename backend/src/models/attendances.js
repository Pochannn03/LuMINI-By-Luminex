import mongoose from "mongoose";

const AttendanceSchema = new mongoose.Schema({
  student_id: {
    type: String,
    ref: 'Student',
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
  details: {
    type: String, 
    required: false 
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
}, {
    toJSON: { 
      virtuals: true 
    },
    toObject: { 
      virtuals: true 
    }
  }
);

AttendanceSchema.virtual('student_details', {
  ref: 'Student',
  localField: 'student_id', 
  foreignField: 'student_id',
  justOne: true          
});

export const Attendance = mongoose.model("Attendance", AttendanceSchema, "atn.attendance_student");

