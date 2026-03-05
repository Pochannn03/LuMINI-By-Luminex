import mongoose from "mongoose";
import { Counter } from "./counter.js";

const SectionSchema = new mongoose.Schema({
  section_id: {
    type: Number,
    unique: true,
  },  
  // --- FIX: ADDED SPARSE: TRUE ---
  section_code: {
    type: String,
    unique: true,
    sparse: true, 
  },
  section_name: {
    type: String,
    required: true,
  },
  class_schedule: {
    type: String,
    required: true, 
    default: "Not Specified"
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
  student_id: [{ 
    type: String, 
    ref: 'Student' 
  }], 
  is_archive: {
    type: Boolean,
    default: false,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

SectionSchema.virtual('user_details', {
  ref: 'User',          
  localField: 'user_id', 
  foreignField: 'user_id', 
  justOne: true          
});

SectionSchema.virtual('student_details', {
  ref: 'Student',          
  localField: 'student_id',  
  foreignField: 'student_id',
  justOne: false             
});

// Reverted to your original async promise style
SectionSchema.pre('save', async function() { 
  const doc = this;

  if (doc.isNew) {
    try {
      if (!Counter) throw new Error("Counter model is missing");

      // 1. Generate Section ID
      const counter = await Counter.findByIdAndUpdate(
        'section_id_seq', 
        { $inc: { seq: 1 } }, 
        { new: true, upsert: true }
      );
      doc.section_id = counter.seq;
      console.log(`✅ Generated section_id: ${doc.section_id}`);

      // 2. Generate Unique 6-Alphanumeric section_code safely
      let isUnique = false;
      while (!isUnique) {
        const generatedCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        // Use doc.constructor to safely reference the model during pre-save
        const existingCode = await doc.constructor.findOne({ section_code: generatedCode });
        if (!existingCode) {
          doc.section_code = generatedCode;
          isUnique = true;
        }
      }
      console.log(`✅ Generated section_code: ${doc.section_code}`);
      
    } catch (error) {
      console.error("❌ ID/Code Generation Failed:", error);
      throw error; 
    }
  }
});

export const Section = mongoose.model("Section", SectionSchema, "sec.section");