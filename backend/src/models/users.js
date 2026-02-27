import mongoose from "mongoose";
import { Counter } from "./counter.js"

const UserSchema = new mongoose.Schema({
  user_id: { type: Number, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true },
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  
  profile_picture: { type: String },
  school_id_photo: { type: String },
  valid_id_photo: { type: String },
  
  // --- NEW FACIAL BIOMETRIC FIELDS ---
  facial_capture_image: { type: String, default: "" }, // Path to the snapshot
  facial_descriptor: { type: [Number], default: [] },  // The 128D array

  phone_number: { type: String, required: true },
  address: { type: String, required: true },
  relationship: { 
    type: String,
    enum: ['SuperAdmin', 'Teacher', 'Parent', 'Guardian'], 
    required: true
  },
  role: { 
    type: String, 
    required: true ,
    enum: ['superadmin', 'admin', 'user'], 
    default: 'user'
  },
  status: {
    type: String,
    enum: ['At Home', 'On the way', 'At School', 'Arrived'],
    default: 'At Home', 
    required: function() { 
        return this.relationship === 'Parent' || this.relationship === 'Guardian'; 
    }
  },
  is_first_login: { type: Boolean, default: true },
  is_archive: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  created_by: { type: String },
  updated_by: { type: String }
});

UserSchema.pre('save', async function() { 
  const doc = this;
  if (doc.isNew) {
    try {
      if (!Counter) throw new Error("Counter model is missing");

      let counterKey = '';
      let startSeq = 1;

      if (doc.relationship === 'SuperAdmin') {
        doc.user_id = 1;
        return;
      } else if (doc.relationship === 'Teacher') {
        counterKey = 'user_id_teacher';
        startSeq = 2;
      } else {
        counterKey = 'user_id_parent';
        startSeq = 1000;
      }

      const counter = await Counter.findOneAndUpdate(
        { _id: counterKey }, 
        { $inc: { seq: 1 } }, 
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      if (counter.seq < startSeq) {
        counter.seq = startSeq;
        await counter.save();
      }

      doc.user_id = counter.seq;
      console.log(`✅ Generated user_id for ${doc.relationship}: ${doc.user_id}`);
      
    } catch (error) {
      console.error("❌ ID Generation Failed:", error);
      throw error; 
    }
  }
});

export const User = mongoose.model("User", UserSchema, "mng.user_active");