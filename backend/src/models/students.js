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
    required: false, // Changed to false
    ref: 'Section',
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

StudentSchema.pre('save', async function() {
  const doc = this;

  if (doc.isNew) {
    try {
      const currentYear = new Date().getFullYear();
      
      // DYNAMIC COUNTER NAME: "student_id_2025", "student_id_2026"
      // This automatically resets the count to 1 when a new year starts!
      const counterName = `student_id_${currentYear}`;

      const counter = await Counter.findByIdAndUpdate(
        counterName,                
        { $inc: { seq: 1 } }, 
        { new: true, upsert: true } // Creates the counter for the new year automatically
      );

      // Format: YYYY-0001
      // String(counter.seq).padStart(4, '0') turns 1 into "0001"
      const sequenceStr = String(counter.seq).padStart(4, '0');
      doc.student_id = `${currentYear}-${sequenceStr}`; 

      console.log(`✅ Generated student_id: ${doc.student_id}`);
      
    } catch (error) {
      console.error("❌ Student ID Generation Failed:", error);
    }
  }
});

StudentSchema.virtual('user_details', {
  ref: 'User',           // The Model to use
  localField: 'user_id', // The field in StudentSchema
  foreignField: 'user_id', // The field in UserSchema (The Primary Key)
  justOne: false          // Since one student has only one user account
});

export const Student = mongoose.model("Student", StudentSchema, "chd.kindergarten_student");