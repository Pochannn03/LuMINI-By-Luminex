import mongoose from "mongoose";
import { Counter } from "./counter.js";

const TransferSchema = new mongoose.Schema({
  transfer_id: {
    type: String,
    unique: true
  },
  student_id: {
    type: String,
    ref: 'Student',
    required: true,
  },
  student_name: {
    type: String,
    required: true,
  },
    section_id: {
    type: Number,
    ref: 'Section',
    required: true,
  },
  section_name: {
    type: String,
    required: true,
  },
  user_id: {
    type: Number,
    ref: 'User',
    required: true,
  },
  user_name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['Drop off', 'Pick up'],
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
}, {
    toJSON: { 
      virtuals: true 
    }, // Important: Ensure virtuals show up when you query
    toObject: { 
      virtuals: true 
    }
  }
);


TransferSchema.pre('save', async function() {
  const doc = this;

  if (doc.isNew) {
    try {
      // Use a consistent counter name for all transfers
      const counterName = 'transfer_id_sequence';

      const counter = await Counter.findByIdAndUpdate(
        counterName,                
        { $inc: { seq: 1 } }, 
        { new: true, upsert: true }
      );

      // Format: TRX-XXXX (e.g., TRX-0001)
      // If you want it exactly like "8821" (no leading zeros), remove the padStart
      const sequenceStr = String(counter.seq).padStart(4, '0');
      doc.transfer_id = `TRX-${sequenceStr}`; 

      console.log(`✅ Generated transfer_id: ${doc.transfer_id}`);
      
    } catch (error) {
      console.error("❌ Transfer ID Generation Failed:", error);
    }
  }
});

TransferSchema.virtual('user_details', {
  ref: 'User',
  localField: 'user_id',
  foreignField: 'user_id',
  justOne: true
});

TransferSchema.virtual('student_details', {
  ref: 'Student',
  localField: 'student_id',
  foreignField: 'student_id',
  justOne: true
});

TransferSchema.virtual('section_details', {
  ref: 'Section',
  localField: 'section_id',
  foreignField: 'section_id',
  justOne: true
});


export const Transfer = mongoose.model("Transfer", TransferSchema, "trn.transfer_history");