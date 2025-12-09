import mongoose from "mongoose";

const SectionSchema = new mongoose.Schema({
  section_name: {
    type: mongoose.Schema.Types.String,
    required: true,
  },
  is_archive: {
    type: mongoose.Schema.Types.String,
    required: true,
  },
  creaated_at: {
    type: mongoose.Schema.Types.String,
    required: true,
  },
});

export const Section = mongoose.model("Section", UserSchema, "sec.section");



