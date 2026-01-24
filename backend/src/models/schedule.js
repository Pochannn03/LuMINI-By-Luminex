import mongoose from "mongoose";
import { Counter } from "./counter.js";

const ScheduleSchema = new mongoose.Schema({
  schedule_id: {
    type: Number,
    required: true,
  },
  day_time: {
    type: String,
    required: true,
  },
  time: {
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

ScheduleSchema.pre('save', async function() { 
  const doc = this;

  if (doc.isNew) {
    try {
      if (!Counter) throw new Error("Counter model is missing");

      const counter = await Counter.findByIdAndUpdate(
        'schedule_id_seq', 
        { $inc: { seq: 1 } }, 
        { new: true, upsert: true }
      );

      doc.schedule_id = counter.seq - 1;

      console.log(`✅ Generated schedule_id: ${newId}`);
      
    } catch (error) {
      // 3. Just THROW the error to stop the save
      console.error("❌ ID Generation Failed:", error);
      throw error; 
    }
  }

});

export const Schedule = mongoose.model("Schedule", ScheduleSchema, "sch.schedule");



