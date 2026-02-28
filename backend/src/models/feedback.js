import mongoose from "mongoose";
import { Counter } from "./counter.js"

const FeedbackSchema = new mongoose.Schema({
  feedback_id: { 
    type: Number, 
    unique: true 
  },
  user_id: {
    type: Number,
    ref: 'User'
  },
  full_name: {
    type: String,
    required: false,
  },
  rating: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  remark: { 
    type: String, 
    required: false 
  },
  created_at: {
    type: Date,
    default: Date.now,
  }
}, {
    toJSON: { 
      virtuals: true 
    },
    toObject: { 
      virtuals: true 
    }
  }
);

FeedbackSchema.pre('save', async function () {
  const doc = this;
  if (doc.isNew) {
    try {
      const counterKey = 'feedback_id';
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

      doc.feedback_id = counter.seq;
    } catch (error) {
      console.error("❌ Feedback ID Generation Failed:", error);
      throw error;
    }
  } else {
    next();
  }
});

FeedbackSchema.virtual('user_details', {
  ref: 'User',           
  localField: 'user_id',
  foreignField: 'user_id',
  justOne: true
});

export const Feedback = mongoose.model("Feedback", FeedbackSchema, "fdb.feedback");