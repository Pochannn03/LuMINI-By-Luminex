import mongoose from "mongoose";
import { Counter } from "./counter.js"

const UserSchema = new mongoose.Schema({
  // ID (MONGODB Object ID)
  user_id: {
    type: Number,
    unique: true,
  },

  // Credentials
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true 
  },

  // Personal Information
  first_name: { 
    type: String, 
    required: true 
  },
  last_name: { 
    type: String, 
    required: true 
  },
  profile_picture: { 
    type: String, 
  },
  phone_number: { 
    type: String, 
    required: true 
  },
  address: { 
    type: String, 
    required: true 
  },
  relationship: { 
    type: String,
    enum: ['SuperAdmin', 'Teacher', 'Parent', 'Guardian'], 
    required: true
  },

  // Roles
  role: { 
    type: String, 
    required: true ,
    enum: ['superadmin', 'admin', 'user'], 
    default: 'user'
  },

  // Timestamps & Validation
  is_first_login: {
    type: Boolean,
    default: true, // <-- ADD THIS: Forces new users to setup!
  },
  is_archive: {
    type: Boolean, 
    default: false, // <-- FIX THIS: Should be false for active users
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
  },
  updated_by: { 
    type: String, 
  }
});

// Pre-function to Auto Increment the user_id with counter schema
UserSchema.pre('save', async function() { 
  const doc = this;

  if (doc.isNew) {
    try {
      if (!Counter) throw new Error("Counter model is missing");

      const counter = await Counter.findByIdAndUpdate(
        'user_id_seq', 
        { $inc: { seq: 1 } }, 
        { new: true, upsert: true }
      );

      // 2. Assign the ID
      const newId = counter.seq;
      doc.user_id = newId;

      console.log(`✅ Generated user_id: ${newId}`);
      
    } catch (error) {
      // 3. Just THROW the error to stop the save
      console.error("❌ ID Generation Failed:", error);
      throw error; 
    }
  }

});

export const User = mongoose.model("User", UserSchema, "mng.user_active");