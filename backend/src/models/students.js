import mongoose from "mongoose";

const StudentSchema = new mongoose.Schema({
  // 1. IDs
  student_id: {
    type: String,
    unique: true,
  },
  user_id: { 
    type: Number, 
    ref: 'User', 
    default: null 
  },
  invitation_code: {
    type: String,
    required: true,
    unique: true
  },

  // 2. PERSONAL DETAILS
  first_name: {
    type: String,
    required: true,
  },
  last_name: {
    type: String,
    required: true,
  },
  birthday: {
    type: Date, // Or Date
    required: true,
  },
  age: {
    type: Number, // FIX: Changed 'int' to 'Number'
    required: false, // Calculated automatically, so optional in schema
  },
  profile_picture: {
    type: String,
    required: false, // Make optional in case they don't upload one
  },

  // 3. OPTIONAL FIELDS (Fill these later)
  section_id: {
    type: String,
    required: false, // Changed to false
    default: "Unassigned"
  },
  address: {
    type: String,
    required: false, // Changed to false
    default: ""
  },
  qr_code: {
    type: String,
    required: false, // Changed to false
  },

  // 4. SYSTEM FIELDS
  is_archive: {
    type: Boolean, // Better to use Boolean than String
    default: false,
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
    default: "System"
  },
  updated_by: {
    type: String, 
    default: "System" 
  }
}, {
    toJSON: { 
      virtuals: true 
    }, // Important: Ensure virtuals show up when you query
    toObject: { 
      virtuals: true 
    }
  }
);

export const Student = mongoose.model("Student", StudentSchema, "chd.kindergarten_student");