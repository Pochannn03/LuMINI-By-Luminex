import mongoose from "mongoose";

const QrSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.String,
    required: true,
    unique: true,
  },
  qr_code: {
    type: mongoose.Schema.Types.String,
    required: true,
  },
  qr_owner: {
    type: mongoose.Schema.Types.String,
    required: true,
  },
  status: {
    type: mongoose.Schema.Types.String,
    required: true,
  },
  created_at: {
    type: mongoose.Schema.Types.String,
    required: true,
  },
});

export const Qr = mongoose.model("Qrcode", UserSchema, "qrc.qr_code");



