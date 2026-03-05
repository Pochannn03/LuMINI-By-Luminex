import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    // THE MAGIC TRICK: This tells MongoDB to automatically delete this document after 300 seconds (5 minutes)!
    expires: 300 
  }
});

export const OTP = mongoose.model('OTP', otpSchema);