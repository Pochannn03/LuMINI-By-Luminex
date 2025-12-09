import mongoose from "mongoose";

const AnnouncementSchema = new mongoose.Schema({
  title: {
    type: mongoose.Schema.Types.String,
    required: true,
    unique: true,
  },
  body: {
    type: mongoose.Schema.Types.String,
    required: true,
  },
  user_id: {
    type: mongoose.Schema.Types.String,
    required: true,
  },
  created_at: {
    type: mongoose.Schema.Types.String,
    required: true,
  },
});

export const Announcement = mongoose.model("Announcement", UserSchema, "anc.announce_post");



