import mongoose from "mongoose";

const OverrideSchema = new mongoose.Schema({
  requested_by: {
    type: Number,
    ref: 'User',
    required: true
  },
  student_id: {
    type: String,
    ref: 'Student',
    required: true
  },
  purpose: {
    type: String,
    enum: ['Drop off', 'Pick up'],
    required: true
  },
  is_registered_guardian: {
    type: Boolean,
    required: true
  },
  // If registered, link to User. If guest, store string name.
  user_id: {
    type: Number,
    ref: 'User',
    default: null
  },
  user_name: {
    type: String,
    default: null
  },
  // Path to the uploaded ID photo (required for guests)
  id_photo_evidence: {
    type: String,
    default: null
  },
  is_approved: {
    type: Boolean,
    required: true
  },
  is_rejected: {
    type: Boolean,
    required: false
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
    toJSON: { virtuals: true }, 
    toObject: { virtuals: true }
  }
);;

OverrideSchema.virtual('user_details', {
  ref: 'User',          
  localField: 'user_id',
  foreignField: 'user_id',
  justOne: true
});

OverrideSchema.virtual('requester_details', {
  ref: 'User',          
  localField: 'requested_by',
  foreignField: 'user_id',
  justOne: true
});

OverrideSchema.virtual('student_details', {
  ref: 'Student',          
  localField: 'student_id',
  foreignField: 'student_id',
  justOne: true
});

export const Override = mongoose.model("Override", OverrideSchema, "ovr.manual_transfer");