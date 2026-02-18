// backend/src/models/GuardianRequest.js
import mongoose from "mongoose";

const GuardianRequestSchema = new mongoose.Schema({
  parent: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  student: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Student', 
    required: true 
  },
  teacher: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  guardianDetails: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String, required: true },
    role: { type: String, required: true },
    tempUsername: { type: String, required: true },
    tempPassword: { type: String, required: true }, 
    idPhotoPath: { type: String, required: true } ,
    createdUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'revoked'],
    default: 'pending' 
  }
}, { timestamps: true });

export default mongoose.model('GuardianRequest', GuardianRequestSchema);