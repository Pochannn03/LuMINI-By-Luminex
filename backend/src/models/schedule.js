import mongoose from "mongoose";

const SectionSchema = new mongoose.Schema({
  
  section_id: {
    type: Number,
    required: true,
  },
  section_name: {
    type: String,
    required: true,
  },
  is_archive: {
    type: String,
    default: false,
  },
  creaated_at: {
    type: String,
    required: true,
  },
});

export const Section = mongoose.model("Section", UserSchema, "sec.section");



