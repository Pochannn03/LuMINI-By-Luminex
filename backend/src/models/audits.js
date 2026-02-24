import mongoose from "mongoose";
import { Counter } from "./counter.js";

const AuditSchema = new mongoose.Schema({
  audit_id: { 
    type: Number, 
    unique: true 
  },
  user_id: {
    type: Number,
    ref: 'User'
  },
  full_name: {
    type: String,
    required: true,
  },
  role: { 
    type: String, 
    enum: ['user', 'admin', 'superadmin'],
  },
  action: { 
    type: String, 
    required: true 
  },
  target: { 
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

AuditSchema.pre('save', async function () {
  const doc = this;
  if (doc.isNew) {
    try {
      const counterKey = 'audit_id';
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

      doc.audit_id = counter.seq;
    } catch (error) {
      console.error("❌ Announcement ID Generation Failed:", error);
      throw error;
    }
  }
});

AuditSchema.virtual('user_details', {
  ref: 'User',           
  localField: 'user_id',
  foreignField: 'user_id',
  justOne: true
});

export const Audit = mongoose.model("Audit", AuditSchema, "adt.audit_trail");