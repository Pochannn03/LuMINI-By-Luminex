import { Router } from "express";
import { User } from "../models/users.js";
import { Student } from "../models/students.js";
// import { Counter } from '../models/counter.js';
import { editUserValidationSchema } from "../validation/editAccountsValidation.js";
import { validationResult, body, matchedData, checkSchema} from "express-validator";
import { isAuthenticated, hasRole } from '../middleware/authMiddleware.js';
import { hashPassword } from '../utils/passwordUtils.js';
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/') 
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); 
  }
});

const upload = multer({ storage: storage });

// GET ALL ACCOUNTS
router.get('/api/users', 
  isAuthenticated,
  hasRole('superadmin'),
  async (req, res) => {
    try{
      
      const users = await User.find({ role: { $ne: 'superadmin' } });

      res.status(200).json({ 
        success: true, 
        users: users || [], 
      });
  
    } catch(err) {
      console.error("Error fetching students:", err);
      res.status(500).json({ msg: "Server error while fetching students" });
    }
})

// NUMBER OF STUDENTS/TEACHERS/PARENTS ON DASHBOARD
router.get('/api/users/cards', 
  isAuthenticated,
  hasRole('superadmin'),
  async (req, res) => {
    try{

      const teachers = await User.find({ 
        is_archive: false, 
        relationship: 'Teacher'
      });
      
      const users = await User.find({ 
        is_archive: false, 
        relationship: { 
          $in: ['Parent', 'Guardian'] 
        } 
      });

      const students = await Student.find({
        is_archive: false,
      })

      const pendingTeachers = await User.find({ 
        is_archive: true, 
        relationship: 'Teacher'
      }).sort({ created_at: -1 });

    res.status(200).json({ 
      success: true, 
      teachers: teachers || [], 
      users: users || [], 
      students: students || [],
      pending_teachers: pendingTeachers || []
    });
  
    } catch(err) {
      console.error("Error fetching students:", err);
      res.status(500).json({ msg: "Server error while fetching students" });
    }
})

// EDIT USER ACC (ALL DEPENDS ON ID)
router.put('/api/users/:id',
  isAuthenticated,
  hasRole('superadmin'),
  upload.single('profile_photo'),
  ...checkSchema(editUserValidationSchema),
  async (req, res) => {
    const result = validationResult(req);

    if (!result.isEmpty()) {
      return res.status(400).send({ errors: result.array() });
    }
    
    const userId = req.params.id;
    const updateData = {
        ...req.body
    };
    
    if (req.file) {
        updateData.profile_picture = req.file.path; 
    }

    if (updateData.password && updateData.password.trim() !== "") {
        try {
            updateData.password = await hashPassword(updateData.password);
        } catch (hashError) {
            console.error("Hash Error:", hashError);
            return res.status(500).json({ success: false, msg: "Error hashing password" });
        }
    } else {
        delete updateData.password;
    }

    try {
      const updatedUser = await User.findByIdAndUpdate(
        userId, 
        updateData, 
        { 
          new: true,           
          runValidators: true  
        }
      )

      if (!updatedUser) {
        return res.status(404).json({ success: false, msg: "Class not found" });
      }

      return res.status(200).json({ 
        success: true, 
        msg: "Class updated successfully!", 
        class: updatedUser 
      });

    } catch (err) {
      console.error("Update Error:", err);
      return res.status(500).json({ success: false, msg: "Update failed", error: err.message });
    }
})

// ARCHIVING AN ACCOUNT 
router.put('/api/users/archive/:id',
  isAuthenticated, 
  hasRole('superadmin'),
  async (req, res) => {
    const userId = req.params.id;

    try {
      const archiveUser = await User.findByIdAndUpdate(
        userId, 
        { is_archive: true }, 
        { new: true, runValidators: true }
      );

      if (!archiveUser) {
        return res.status(404).json({ success: false, msg: "User not found" });
      }

      console.log(`User archived: ${archiveUser.username}`);

      return res.status(200).json({ 
        success: true, 
        msg: "User archived successfully.", 
        user: archiveUser 
      });

    } catch (err) {
      console.error("Archive Error:", err);
      return res.status(500).json({ success: false, msg: "Failed to archive Student", error: err.message });
    }
})

router.get("/api/user/profile", (req, res) => {
  // 1. Check if user is logged in
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // 2. Extract only the necessary data (Exclude password!)
  const userProfile = {
    _id: req.user._id,
    user_id: req.user.user_id,
    username: req.user.username,
    first_name: req.user.first_name,
    last_name: req.user.last_name,
    email: req.user.email,
    phone_number: req.user.phone_number,
    address: req.user.address,
    role: req.user.role,
    profile_picture: req.user.profile_picture,
  };

  // 3. Send the data back
  res.status(200).json(userProfile);
});

// PUT /api/user/profile
// Description: Update user contact details (Phone, Address, Email)
router.put("/api/user/profile", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 1. Get data from the frontend
    const { phone_number, address, email } = req.body;

    // 2. Update the user object (req.user is the Mongoose document)
    // We only update specific fields to prevent users from changing their Role or Name
    if (phone_number !== undefined) req.user.phone_number = phone_number;
    if (address !== undefined) req.user.address = address;
    if (email !== undefined) req.user.email = email;

    // 3. Save to Database
    await req.user.save();

    res
      .status(200)
      .json({ message: "Profile updated successfully", user: req.user });
  } catch (err) {
    console.error("Update Profile Error:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

export default router;