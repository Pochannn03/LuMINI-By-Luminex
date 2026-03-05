import mongoose from "mongoose";
import { Counter } from "./counter.js";

const StudentSchema = new mongoose.Schema({
  // 1. IDs
  student_id: {
    type: String,
    unique: true,
  },
  user_id: [{ 
    type: Number, 
    ref: 'User' 
  }],  
  section_id: {
    type: Number,
    ref: 'Section',
    default: null
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
    type: Date, 
    required: true,
  },
  gender: {
    type: String, 
    enum: ['Male', 'Female'],
    required: true, 
  },
  age: {
    type: Number,
    required: false, 
  },
  
  // --- MEDICAL FIELDS ---
  allergies: {
    type: String,
    default: "N/A"
  },
  medical_history: {
        type: String,
        default: "N/A"
    },
  profile_picture: {
    type: String,
    required: false, 
  },

  // 3. OPTIONAL FIELDS
  address: {
    type: String,
    required: false, 
    default: ""
  },
  qr_code: {
    type: String,
    required: false, 
  },
  status: {
    type: String,
    enum: ['On the way', 'Learning', 'Dismissed'],
    default: 'On the way'
  },

  // 4. SYSTEM FIELDS
  invitation_code: {
    type: String,
    required: true,
    unique: true
  },
  invitation_status: {
    type: String,
    enum: ['pending', 'used', 'expired'],
    default: 'pending'
  },
  invitation_used_at: {
    type: Date,
    default: null
  },

  // --- 5. NEW: PASSIVE PARENT TAG (From Pre-Enrollment) ---
  passive_parent: {
    name: { type: String, default: null },
    phone: { type: String, default: null },
    email: { type: String, default: null },
    is_verified: { type: Boolean, default: false } // Turns true when they use the invitation code
  },

  is_archive: {
    type: Boolean,
    default: false,
  },
  last_reset_date: {
    type: String,
    default: null
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
    toJSON: { virtuals: true }, 
    toObject: { virtuals: true }
  }
);

StudentSchema.pre('save', async function() {
  const doc = this;

  if (doc.isNew) {
    try {
      const currentYear = new Date().getFullYear();
      
      const counterName = `student_id_${currentYear}`;

      const counter = await Counter.findByIdAndUpdate(
        counterName,                
        { $inc: { seq: 1 } }, 
        { new: true, upsert: true } 
      );

      const sequenceStr = String(counter.seq).padStart(4, '0');
      doc.student_id = `${currentYear}-${sequenceStr}`; 

      console.log(`✅ Generated student_id: ${doc.student_id}`);
      
    } catch (error) {
      console.error("❌ Student ID Generation Failed:", error);
    }
  }
});

StudentSchema.virtual('user_details', {
  ref: 'User',          
  localField: 'user_id',
  foreignField: 'user_id',
  justOne: false
});

StudentSchema.virtual('section_details', {
  ref: 'Section',          
  localField: 'section_id', 
  foreignField: 'section_id', 
  justOne: true          
});

export const Student = mongoose.model("Student", StudentSchema, "chd.kindergarten_student");