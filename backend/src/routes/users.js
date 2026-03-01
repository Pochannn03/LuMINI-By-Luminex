import { Router } from "express";
import { User } from "../models/users.js";
import { Student } from "../models/students.js";
import { Audit } from "../models/audits.js";
import { editUserValidationSchema } from "../validation/editAccountsValidation.js";
import { validationResult, body, matchedData, checkSchema} from "express-validator";
import { isAuthenticated, hasRole } from '../middleware/authMiddleware.js';
import { hashPassword } from '../utils/passwordUtils.js';

// --- ADDED EMAIL SERVICE AND CRYPTO HERE ---
import { sendPasswordUpdateOTP } from '../utils/emailService.js';
import crypto from 'crypto'; 

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
      res.status(200).json({ success: true, users: users || [], });
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
      const teachers = await User.find({ is_archive: false, relationship: 'Teacher' });
      const users = await User.find({ is_archive: false, relationship: { $in: ['Parent', 'Guardian'] } });
      const students = await Student.find({ is_archive: false });
      const pendingTeachers = await User.find({ is_archive: true, relationship: 'Teacher' }).sort({ created_at: -1 });

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
    const updateData = { ...req.body };
    
    if (req.file) updateData.profile_picture = req.file.path; 

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
      const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true })
      if (!updatedUser) return res.status(404).json({ success: false, msg: "User not found" });

      const auditLog = new Audit({
        user_id: req.user.user_id,
        full_name: `${req.user.first_name} ${req.user.last_name}`,
        role: req.user.role,
        action: "Edit User Info",
        target: `Updated user ${updatedUser.first_name} ${updatedUser.last_name}`
      });
      await auditLog.save();

      return res.status(200).json({ success: true, msg: "User updated successfully!", user: updatedUser });
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
      const archiveUser = await User.findByIdAndUpdate(userId, { is_archive: true }, { new: true, runValidators: true });
      if (!archiveUser) return res.status(404).json({ success: false, msg: "User not found" });

      const auditLog = new Audit({
        user_id: req.user.user_id,
        full_name: `${req.user.first_name} ${req.user.last_name}`,
        role: req.user.role,
        action: "Archive User",
        target: `Archived user ${archiveUser.first_name} ${archiveUser.last_name}`
      });
      await auditLog.save();

      return res.status(200).json({ success: true, msg: "User archived successfully.", user: archiveUser });
    } catch (err) {
      console.error("Archive Error:", err);
      return res.status(500).json({ success: false, msg: "Failed to archive user", error: err.message });
    }
})

router.get("/api/user/profile", (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const userProfile = {
    _id: req.user._id,
    user_id: req.user.user_id,
    username: req.user.username,
    first_name: req.user.first_name,
    last_name: req.user.last_name,
    email: req.user.email,
    relationship: req.user.relationship,
    phone_number: req.user.phone_number,
    address: req.user.address,
    role: req.user.role,
    profile_picture: req.user.profile_picture,
  };

  res.status(200).json(userProfile);
});

// PUT /api/user/profile (Updates Contact/Address/Profile Picture ONLY)
router.put("/api/user/profile", 
  upload.single('profile_picture'), 
  async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { phone_number, address, email } = req.body;
    const updateFields = {};
    if (phone_number !== undefined) updateFields.phone_number = phone_number;
    if (address !== undefined) updateFields.address = address;
    if (email !== undefined) updateFields.email = email;

    if (req.file) {
        updateFields.profile_picture = req.file.path;
        const currentUser = await User.findById(req.user._id);

        if (currentUser && currentUser.profile_picture) {
            try {
                const oldImagePath = path.join(process.cwd(), currentUser.profile_picture);
                if (fs.existsSync(oldImagePath) && fs.statSync(oldImagePath).isFile()) {
                    fs.unlinkSync(oldImagePath);
                }
            } catch (fsError) {
                console.error("Non-fatal error: Could not delete old image:", fsError);
            }
        }
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { $set: updateFields },
        { new: true, runValidators: true } 
    );

    if (!updatedUser) return res.status(404).json({ message: "User not found in database." });

    const auditLog = new Audit({
      user_id: req.user.user_id,
      full_name: `${req.user.first_name} ${req.user.last_name}`,
      role: req.user.role,
      action: "Update Own Profile",
      target: `Updated personal profile information`
    });
    await auditLog.save();

    res.status(200).json({ message: "Profile updated successfully", user: updatedUser });
    
  } catch (err) {
    console.error("Update Profile Error:", err);
    res.status(500).json({ message: err.message || "Failed to update profile" });
  }
});

// USERS DEMOGRAPHICS
router.get('/api/users/demographics', 
  isAuthenticated,
  hasRole('superadmin'),
  async (req, res) => {
    try {
      const query = { role: { $in: ['admin', 'user'] } };

      const demographics = await User.aggregate([
        { $match: query },
        { $group: { _id: "$role", count: { $sum: 1 } } }
      ]);

      const totalCount = await User.countDocuments(query);
      const stats = { teachers: { count: 0, color: "#f59e0b" }, users: { count: 0, color: "#39a8ed" } };

      demographics.forEach(item => {
        if (item._id === 'admin') stats.teachers.count = item.count;
        if (item._id === 'user') stats.users.count = item.count;
      });

      res.status(200).json({ success: true, total: totalCount, stats: stats });
    } catch(err) {
      console.error("Demographics Fetch Error:", err);
      res.status(500).json({ msg: "Failed to fetch user demographics" });
    }
});

// =========================================================
// ROUTE 1: Request Password Change OTP (FACIAL BIOMETRICS SUCCESS)
// =========================================================
router.post('/api/user/request-password-otp', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || !user.email) {
      return res.status(400).json({ message: "User or email not found." });
    }

    // 1. Generate a 6-digit numeric OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // 2. Save it to the database with a 5-minute expiration
    user.reset_otp = otp;
    user.reset_otp_expires = Date.now() + 5 * 60 * 1000; 
    await user.save();

    // 3. Send the email
    const emailSent = await sendPasswordUpdateOTP(user.email, otp, user.first_name);

    if (emailSent) {
      return res.status(200).json({ message: "OTP sent successfully!" });
    } else {
      return res.status(500).json({ message: "Failed to send email. Please try again." });
    }

  } catch (error) {
    console.error("OTP Generation Error:", error);
    res.status(500).json({ message: "Server error generating OTP." });
  }
});

// =========================================================
// ROUTE 2: Verify OTP & Actually Change Password
// =========================================================
router.put('/api/user/verify-password-otp', isAuthenticated, async (req, res) => {
  try {
    const { otp, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    // 1. Validate the OTP exists and hasn't expired
    if (!user.reset_otp || !user.reset_otp_expires) {
      return res.status(400).json({ message: "No OTP requested." });
    }
    
    if (Date.now() > user.reset_otp_expires) {
      user.reset_otp = null;
      user.reset_otp_expires = null;
      await user.save();
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    if (user.reset_otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP. Please try again." });
    }

    // 2. OTP is valid! Hash the new password and save it
    user.password = await hashPassword(newPassword);
    
    // 3. Clear the OTP fields
    user.reset_otp = null;
    user.reset_otp_expires = null;
    await user.save();

    res.status(200).json({ message: "Password updated successfully!" });

  } catch (error) {
    console.error("OTP Verification Error:", error);
    res.status(500).json({ message: "Server error verifying OTP." });
  }
});

router.post('/api/users/profiles', 
  isAuthenticated, 
  async (req, res) => {
  try {
    const { userIds } = req.body;
    // Get current user's ID from the session/token
    const currentUserId = req.user.user_id;

    const numericIds = Array.isArray(userIds) ? userIds.map(id => Number(id)) : [];

    const users = await User.find({ 
      user_id: { 
        $in: numericIds, 
        $ne: currentUserId // Exclude the current authenticated user
      },
      is_archive: false 
    }).select('user_id first_name last_name profile_picture relationship');

    res.status(200).json({ success: true, users });
  } catch (err) {
    console.error("Profile Fetch Error:", err);
    res.status(500).json({ success: false, msg: "Failed to fetch profiles" });
  }
});

export default router;