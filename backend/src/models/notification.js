import mongoose from "mongoose";
import { Counter } from "./counter.js";

const NotificationSchema = new mongoose.Schema({
  notification_id: { 
    type: Number, 
    unique: true 
  },
  recipient_id : {
    type: Number, 
    ref: 'User',
    required: true 
  },
  sender_id: { 
    type: Number, 
    ref: 'User',
    required: true 
  },
  type: { 
    type: String, 
    enum: ['Announcement', 'Attendance', 'Transfer', 'System', 'Alert'], 
    required: true 
  },
  title: { 
    type: String, 
    required: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  is_read: { 
    type: Boolean, 
    default: false 
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});


NotificationSchema.pre('save', async function () {
  const doc = this;
  if (doc.isNew) {
    try {
      const counterKey = 'notification_id';
      const counter = await Counter.findOneAndUpdate(
        { _id: counterKey },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      doc.notification_id = counter.seq;
    } catch (error) {
      console.error("❌ Notification ID Generation Failed:", error);
      throw error;
    }
  }
});

NotificationSchema.virtual('sender_details', {
  ref: 'User',
  localField: 'sender_id',
  foreignField: 'user_id',
  justOne: true
});

NotificationSchema.virtual('recipient_details', {
  ref: 'User',
  localField: 'recipient_id',
  foreignField: 'user_id',
  justOne: true
});

export const Notification = mongoose.model("Notification", NotificationSchema, "ntf.notifications");