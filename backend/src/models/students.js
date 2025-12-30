import mongoose from "mongoose";

const StudentSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.String,
    required: true,
    unique: true,
  },
  user_id: {
    type: mongoose.Schema.Types.String,
    required: true,
  },
  section_id: {
    type: mongoose.Schema.Types.String,
    required: true,
  },
  profile_picture: {
    type: mongoose.Schema.Types.String,
    required: true,
  },
  address: {
    type: mongoose.Schema.Types.String,
    required: true,
  },
  is_archive: {
    type: mongoose.Schema.Types.String,
    required: true,
  },
  created_at: {
    type: mongoose.Schema.Types.String,
    required: true,
  },
  updated_at: {
    type: mongoose.Schema.Types.String,
    required: true,
  },
  created_by: {
    type: mongoose.Schema.Types.String,
    required: true,
  },
  updated_by: {
    type: mongoose.Schema.Types.String,
    required: true,
  },
});

export const Student = mongoose.model("Student", UserSchema, "chd.kindergarten_student");



