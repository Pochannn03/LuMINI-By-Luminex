import mongoose from "mongoose";

const StudentSchema = new mongoose.Schema({
  student_id: {
    type: String,
    required: true,
    unique: true,
  },
  parent_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', // This tells Mongoose: "This ID belongs to the User collection"
    default: null // Null initially, because Parent hasn't registered yet
  },
  section_id: {
    type: String,
    required: true,
  },
  first_name: {
    type: String,
    required: true,
  },
  last_name: {
    type: String,
    required: true,
  },
  birthday: {
    type: String,
    required: true,
  },
  profile_picture: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  qr_code: {
    type: String,
    required: true,
  },
  invitation_code: {
    type: String,
    required: true,
  },
  is_archive: {
    type: String,
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
  created_by: {
    type: String,
    required: true,
  },
  updated_by: {
    type: String,
    required: true,
  },
});

export const Student = mongoose.model("Student", StudentSchema, "chd.kindergarten_student");