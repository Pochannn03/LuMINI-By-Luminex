import mongoose from "mongoose";

const QueueingSchema = new mongoose.Schema({
  user_id: {
    type: Number,
    ref: 'User',
    required: true,
    unique: true,
  },
  student_id: {
    type: String,
    ref: 'Student',
    required: true,
  },
  section_id: {
    type: Number,
    ref: 'Section',
    required: true,
  },
  status: {
    type: String,
    required: true,
  },
  purpose: {
    type: String,
    enum: ['Drop off', 'Pick up'],
    required: true,
  },
  on_queue: {
    type: Boolean,
    required: true,
    default: true
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
}, {
    toJSON: { 
      virtuals: true 
    },
    toObject: { 
      virtuals: true 
    }
  }
);

QueueingSchema.virtual('user_details', {
  ref: 'User',
  localField: 'user_id',
  foreignField: 'user_id',
  justOne: false
});

QueueingSchema.virtual('student_details', {
  ref: 'Student',
  localField: 'student_id',
  foreignField: 'student_id',
  justOne: true
});

QueueingSchema.virtual('section_details', {
  ref: 'Section',
  localField: 'section_id',
  foreignField: 'section_id',
  justOne: true
});



export const Queue = mongoose.model("Queue", QueueingSchema, "que.queueing");
