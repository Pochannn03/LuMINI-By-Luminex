import mongoose from "mongoose";
import { Counter } from "./counter.js"

const AccessPassSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  user_id: {
    type: Number,
    ref: 'User',
    required: true
  },
  user_name: {
    type: String,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  purpose: {
    type: String,
    enum: ['Drop off', 'Pick up'], 
    required: true
  },
  student_id: {
    type: String,
    ref: 'Student',
    required: true
  },
  student_name: {
    type: String,
    ref: 'Student',
    required: true
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600 
  }
});

AccessPassSchema.virtual('student_details', {
  ref: 'Student',
  localField: 'student_id', // The string "2026-0001" stored in Pass
  foreignField: 'student_id', // The string "2026-0001" stored in Student
  justOne: true
});

AccessPassSchema.virtual('user_details', {
  ref: 'User',
  localField: 'user_id', // The string "2026-0001" stored in Pass
  foreignField: 'user_id', // The string "2026-0001" stored in Student
  justOne: true
});

export const AccessPass = mongoose.model("Access", AccessPassSchema, "qrc.qr_code");

