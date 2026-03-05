import mongoose from "mongoose";

const EnrollmentRequestSchema = new mongoose.Schema({
  // --- STUDENT DETAILS ---
  student_first_name: { type: String, required: true },
  student_last_name: { type: String, required: true },
  student_suffix: { type: String, default: "" },
  student_dob: { type: Date, required: true },
  student_gender: { type: String, enum: ['Male', 'Female'], required: true },
  student_photo: { type: String, default: null }, // Path to the uploaded image

  // --- PARENT TAGS (Not a User account yet) ---
  parent_name: { type: String, required: true },
  parent_phone: { type: String, required: true },
  parent_email: { type: String, required: true },

  // --- ROUTING & TRACKING ---
  section_id: { 
    type: Number, 
    ref: 'Section', 
    required: true 
  },
  teacher_id: { 
    type: Number, 
    ref: 'User', // The teacher assigned to the section
    required: true 
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved_By_Teacher', 'Rejected', 'Registered'],
    default: 'Pending'
  }
}, {
  // Mongoose will automatically manage created_at and updated_at for us!
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

export const EnrollmentRequest = mongoose.model("EnrollmentRequest", EnrollmentRequestSchema, "sec.enrollment_requests");