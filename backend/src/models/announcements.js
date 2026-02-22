import mongoose from "mongoose";
import { Counter } from "./counter.js";

const AnnouncementSchema = new mongoose.Schema({
  announcement_id: { 
    type: Number, 
    unique: true 
  },
  user_id: { // The Teacher/Admin ID
    type: Number,
    ref: 'User'
  },
  full_name: {
    type: String,
    required: true, // Recommended to keep this required for the audit trail
  },
  announcement: { 
    type: String, 
    required: true 
  },
  created_at: {
    type: Date,
    default: Date.now,
  }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

AnnouncementSchema.pre('save', async function () {
  const doc = this;
  if (doc.isNew) {
    try {
      // ✅ Use a unique key for announcements
      const counterKey = 'announcement_id';
      const startSeq = 1;

      const counter = await Counter.findOneAndUpdate(
        { _id: counterKey },
        { $inc: { seq: 1 } },
        { 
          new: true, 
          upsert: true, 
          setDefaultsOnInsert: true 
        }
      );

      if (counter.seq < startSeq) {
        counter.seq = startSeq;
        await counter.save();
      }

      doc.announcement_id = counter.seq;
    } catch (error) {
      console.error("❌ Announcement ID Generation Failed:", error);
      throw error;
    }
  }
});

AnnouncementSchema.virtual('user_details', {
  ref: 'User',           
  localField: 'user_id',
  foreignField: 'user_id',
  justOne: true
});

export const Announcement = mongoose.model("Announcement", AnnouncementSchema, "ann.announcement");