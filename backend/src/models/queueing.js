import mongoose from "mongoose";

const QueueingSchema = new mongoose.Schema({
  requested_user_id: {
    type: mongoose.Schema.Types.String,
    required: true,
    unique: true,
  },
  student_id: {
    type: mongoose.Schema.Types.String,
    required: true,
  },
  status: {
    type: mongoose.Schema.Types.String,
    required: true,
  },
  type: {
    type: mongoose.Schema.Types.String,
    required: true,
  },
  created_at: {
    type: mongoose.Schema.Types.String,
    required: true,
  },
});

export const Queue = mongoose.model("Queue", UserSchema, "que.queueing");



