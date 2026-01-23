import mongoose from "mongoose";
import { Counter } from "./counter.js"

const UserSchema = new mongoose.Schema({
  // ID
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
  is_archive: {
    type: String, 
    default: false,
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
  },
  updated_by: { 
    type: String, 
  }
});

UserSchema.pre('save', async function() { 
  const doc = this;

  // Only run logic if this is a NEW user
  if (doc.isNew) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        'user_id_seq', // <--- Pass the ID string directly
        { $inc: { seq: 1 } }, 
        { new: true, upsert: true }
      );

      // This will OVERWRITE the '1001' you set in seedAdmin.js
      // But that's okay! The first counter (1) + 1000 = 1001 anyway.
      doc.user_id = 1000 + counter.seq;
      
    } catch (error) {
      // In async, simply THROW the error to stop the save
      throw error; 
    }
  }
  
  // No need to call next() -- when the function ends, Mongoose proceeds.
});

export const User = mongoose.model("User", UserSchema, "mng.user_active");