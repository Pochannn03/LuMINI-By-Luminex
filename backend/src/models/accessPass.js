import mongoose from "mongoose";
import { Counter } from "./counter.js"

const AccessPassSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  user_id: {
    type: Number,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  purpose: {
    type: String,
    enum: ['dropoff', 'pickup'], 
    required: true
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600 
  }
});

export const AccessPass = mongoose.model("Access", AccessPassSchema, "qrc.qr_code");

