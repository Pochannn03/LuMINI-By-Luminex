import mongoose from "mongoose";
import { Counter } from "./counter.js";

const SectionSchema = new mongoose.Schema({
  section_id: {
    type: Number,
    required: true,
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
    type: String,
    required: true,
  },
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

      console.log(`✅ Generated section_id: ${newId}`);
      
    } catch (error) {
      // 3. Just THROW the error to stop the save
      console.error("❌ ID Generation Failed:", error);
      throw error; 
    }
  }

});

export const Section = mongoose.model("Section", SectionSchema, "sec.section");



