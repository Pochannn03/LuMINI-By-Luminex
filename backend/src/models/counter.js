import mongoose from "mongoose";

const CounterSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    required: true 
  }, // E.g., "user_id_seq"
  seq: { 
    type: Number, 
    default: 0 
  }  // The current number (e.g., 1000)
});

export const Counter = mongoose.model("Counter", CounterSchema);