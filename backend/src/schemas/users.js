import mongoose from "mongoose";
import AutoIncrementFactory from "mongoose-sequence";

const AutoIncrement = AutoIncrementFactory(mongoose);

const UserSchema = new mongoose.Schema({
  _id: {
    type: Number,
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true 
  },
  first_name: { 
    type: String, 
    required: true 
  },
  last_name: { 
    type: String, 
    required: true 
  },
  profile_picture: { 
    type: String, 
    required: true 
  },
  phone_number: { 
    type: String, 
    required: true 
  },
  address: { 
    type: String, 
    required: true 
  },
  relationship: { 
    type: String, 
    required: true
  },
  role: { 
    type: String, 
    required: true 
  },
  is_archive: {
    type: Boolean, 
    default: false,
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
  created_by: { 
    type: String, 
    required: true
  },
  updated_by: { 
    type: String, 
    required: true 
  }
}, { 
    // This creates 'createdAt' and 'updatedAt' automatically if you prefer
    // timestamps: true, 
    
    // Important: Tell Mongoose not to add the default ObjectId
    _id: false 
});

// Apply the plugin
// 'id': a unique name for this counter in the database
// 'inc_field': the field you want to increment (we are overwriting _id)
UserSchema.plugin(AutoIncrement, { id: 'user_seq', inc_field: '_id' });

export const User = mongoose.model("User", UserSchema, "mng.user_active");