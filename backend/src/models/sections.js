import mongoose from "mongoose";
import { Counter } from "./counter.js";

const SectionSchema = new mongoose.Schema({
  section_id: {
    type: Number,
    unique: true,
  },  
  section_name: {
    type: String,
    required: true,
  },
  max_capacity: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  user_id: {
    type: Number,
    required: true,
    ref: 'User'
  },
  is_archive: {
    type: String,
    default: false,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

SectionSchema.virtual('user_details', {
  ref: 'User',           // The Model to use
  localField: 'user_id', // The field in StudentSchema
  foreignField: 'user_id', // The field in UserSchema (The Primary Key)
  justOne: true          // Since one student has only one user account
});

SectionSchema.pre('save', async function() { 
  const doc = this;

  if (doc.isNew) {
    try {
      if (!Counter) throw new Error("Counter model is missing");

      const counter = await Counter.findByIdAndUpdate(
        'section_id_seq', 
        { $inc: { seq: 1 } }, 
        { new: true, upsert: true }
      );

      doc.section_id = counter.seq - 1;

      // Use doc.section_id instead of newId
      console.log(`✅ Generated section_id: ${doc.section_id}`);
      
    } catch (error) {
      console.error("❌ ID Generation Failed:", error);
      throw error; 
    }
  }

});

export const Section = mongoose.model("Section", SectionSchema, "sec.section");



