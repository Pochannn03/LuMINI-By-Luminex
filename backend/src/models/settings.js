import mongoose from "mongoose";

const SettingsSchema = new mongoose.Schema({
  morning_start: {
    type: String,
    default: "08:00"
  },
  morning_end: {
    type: String,
    default: "11:30"
  },
  afternoon_start: {
    type: String,
    default: "13:00"
  },
  afternoon_end: {
    type: String,
    default: "16:30"
  },
  late_grace_period_minutes: {
    type: Number,
    default: 15
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  }
});

export const Settings = mongoose.model("Settings", SettingsSchema, "sys.settings");