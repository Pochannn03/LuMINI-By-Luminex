import { Router } from "express";
import { User } from "../models/users.js";
import { Student } from "../models/students.js";
import { Audit } from "../models/audits.js";
import { editUserValidationSchema } from "../validation/editAccountsValidation.js";
import { validationResult, body, matchedData, checkSchema} from "express-validator";
import { isAuthenticated, hasRole } from '../middleware/authMiddleware.js';
import { hashPassword, comparePassword } from '../utils/passwordUtils.js';

// --- ADDED EMAIL SERVICE AND CRYPTO HERE ---
import { sendPasswordUpdateOTP, sendUnauthorizedAccessEmail } from '../utils/emailService.js'; // <-- NEW: Added sendUnauthorizedAccessEmail
import crypto from 'crypto'; 

import multer from "multer";
import path from "path";
import fs from "fs";

// ==========================================
// ANTI-SPOOFING MATH HELPER
// ==========================================
const euclideanDistance = (desc1, desc2) => {
    let sum = 0;
    for (let i = 0; i < desc1.length; i++) {
        sum += Math.pow(desc1[i] - desc2[i], 2);
    }
    return Math.sqrt(sum);
};

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
    try {
      // Exclude ONLY the primary superadmin by ID
      // This allows other 'superadmin' role users to show up in the list
      const users = await User.find({ 
        user_id: { $nin: [0, 1, "0", "1"] } 
      });

      res.status(200).json({ success: true, users: users || [] });
    } catch(err) {
      console.error("Error fetching accounts:", err);
      res.status(500).json({ msg: "Server error while fetching accounts" });
    }
});

// NUMBER OF STUDENTS/TEACHERS/PARENTS ON DASHBOARD
router.get('/api/users/cards', 
  isAuthenticated,
  hasRole('superadmin'),
  async (req, res) => {
    try {
      // 1. ACTIVE USERS (Approved)
      const teachers = await User.find({ is_archive: false, is_approved: true, relationship: 'Teacher' });
      const users = await User.find({ is_archive: false, is_approved: true, relationship: { $in: ['Parent', 'Guardian'] } });
      const students = await Student.find({ is_archive: false });

      // 2. PENDING USERS (Not Approved) - Combined Query
      const pendingAccounts = await User.find({ 
          is_archive: false, 
          is_approved: false, 
          relationship: { $in: ['Teacher', 'Parent', 'Guardian'] } 
      }).sort({ created_at: -1 });

    res.status(200).json({ 
      success: true, 
      teachers: teachers || [], 
      users: users || [], 
      students: students || [],
      pending_accounts: pendingAccounts || [] // Sending as one combined array
    });
    } catch(err) {
      console.error("Error fetching dashboard data:", err);
      res.status(500).json({ msg: "Server error while fetching data" });
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
// NEW: Verify Facial Match for Logged-In User
// =========================================================
router.post('/api/user/verify-face-match', isAuthenticated, async (req, res) => {
    try {
        const { facialDescriptor } = req.body;
        const user = await User.findById(req.user._id);

        if (!user || !user.facial_descriptor || user.facial_descriptor.length === 0) {
            return res.status(400).json({ message: "No biometric data registered for this account." });
        }

        // Mathematical Comparison
        const distance = euclideanDistance(user.facial_descriptor, facialDescriptor);

        // 0.55 is the standard strict threshold for Face-API
        if (distance > 0.55) {
            const failedAudit = new Audit({
                user_id: user.user_id,
                full_name: `${user.first_name} ${user.last_name}`,
                role: user.role,
                action: "Face Verify Failed",
                target: `Profile password change biometric mismatch (Distance: ${distance.toFixed(4)})`
            });
            await failedAudit.save().catch(e => console.error(e));

            // --- NEW: FIRE OFF THE SECURITY ALERT EMAIL ---
            if (user.email) {
                await sendUnauthorizedAccessEmail(user.email, user.first_name);
            }

            return res.status(401).json({ message: "Biometric mismatch. Face does not match the registered user." });
        }

        const successAudit = new Audit({
            user_id: user.user_id,
            full_name: `${user.first_name} ${user.last_name}`,
            role: user.role,
            action: "Face Verify Success",
            target: "Profile identity verified via facial recognition."
        });
        await successAudit.save().catch(e => console.error(e));
        
        return res.status(200).json({ message: "Identity verified successfully." });
    } catch (error) {
        console.error("Face Verify Error:", error);
        return res.status(500).json({ message: "Server error verifying biometrics." });
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
      const auditLog = new Audit({
        user_id: user.user_id, 
        full_name: `${user.first_name} ${user.last_name}`,
        role: user.role,
        action: "Reset",
        target: `OTP sent to verified email: ${user.email}`
      });
      await auditLog.save();

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

    const auditLog = new Audit({
      user_id: user.user_id,
      full_name: `${user.first_name} ${user.last_name}`,
      role: user.role,
      action: "Password Reset",
      target: `Password updated via OTP verification for user ID: ${user.user_id}`
    });
    await auditLog.save();

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
    const currentUserId = req.user.user_id;

    const numericIds = Array.isArray(userIds) ? userIds.map(id => Number(id)) : [];

    const users = await User.find({ 
      user_id: { 
        $in: numericIds, 
        $ne: currentUserId
      },
      is_archive: false 
    }).select('user_id first_name last_name profile_picture relationship');

    res.status(200).json({ success: true, users });
  } catch (err) {
    console.error("Profile Fetch Error:", err);
    res.status(500).json({ success: false, msg: "Failed to fetch profiles" });
  }
});

// =========================================================
// NEW: SUPER ADMIN 2FA SECURITY GATE
// =========================================================

// STEP 1: Verify Password and Send OTP
router.post('/api/superadmin/request-settings-otp', isAuthenticated, hasRole('superadmin'), async (req, res) => {
  try {
    const { currentPassword } = req.body;
    const user = await User.findById(req.user._id);

    // Verify Password
    const isMatch = await comparePassword(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Incorrect current password." });
    }

    // NEW: Check if the admin actually has an email set up
    if (!user.email) {
      return res.status(400).json({ success: false, message: "No email registered to this account. Contact system support." });
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    user.reset_otp = otp;
    user.reset_otp_expires = Date.now() + 5 * 60 * 1000; // 5 mins expiration
    await user.save();

    // NEW: Send to the user's actual registered email
    const emailSent = await sendPasswordUpdateOTP(user.email, otp, user.first_name || "Super Admin");

    if (emailSent) {
      const auditLog = new Audit({
        user_id: user.user_id,
        full_name: `${user.first_name} ${user.last_name}`,
        role: user.role,
        action: "Settings 2FA Request",
        target: `OTP sent to registered admin email`
      });
      await auditLog.save().catch(e => console.error(e));

      // NEW: Create a masked version of the email for the frontend (e.g., ad***@gmail.com)
      const maskedEmail = user.email.replace(/(.{2})(.*)(?=@)/, (match, p1, p2) => p1 + '*'.repeat(p2.length));

      return res.status(200).json({ 
        success: true, 
        message: "OTP sent to your registered email.",
        maskedEmail: maskedEmail // Send this to display in the UI securely
      });
    } else {
      return res.status(500).json({ success: false, message: "Failed to send OTP email." });
    }
  } catch (error) {
    console.error("2FA OTP Request Error:", error);
    return res.status(500).json({ success: false, message: "Server error generating OTP." });
  }
});

// STEP 2: Verify the OTP (REMAINS THE SAME)
router.post('/api/superadmin/verify-settings-otp', isAuthenticated, hasRole('superadmin'), async (req, res) => {
  try {
    const { otp } = req.body;
    const user = await User.findById(req.user._id);

    if (!user.reset_otp || !user.reset_otp_expires || Date.now() > user.reset_otp_expires) {
      return res.status(400).json({ success: false, message: "OTP expired or invalid. Please try again." });
    }

    if (user.reset_otp !== otp) {
      return res.status(400).json({ success: false, message: "Incorrect Verification Code." });
    }

    user.reset_otp = null;
    user.reset_otp_expires = null;
    await user.save();

    return res.status(200).json({ success: true, message: "OTP verified. Access granted." });
  } catch (error) {
    console.error("2FA OTP Verify Error:", error);
    return res.status(500).json({ success: false, message: "Server error verifying OTP." });
  }
});

// =========================================================
// NEW: SUPER ADMIN CREDENTIAL SETTINGS (FINAL SAVE)
// =========================================================

router.put('/api/superadmin/credentials', isAuthenticated, hasRole('superadmin'), async (req, res) => {
  try {
    // NEW: Destructure newEmail
    const { currentPassword, newUsername, newPassword, newEmail } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    const isMatch = await comparePassword(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Incorrect current password." });
    }

    let credentialsChanged = false;
    let passwordChanged = false;

    // Username Update
    if (newUsername && newUsername.trim() !== "") {
      const existingUser = await User.findOne({ username: newUsername, _id: { $ne: user._id } });
      if (existingUser) return res.status(400).json({ success: false, message: "Username is already taken." });
      user.username = newUsername;
      credentialsChanged = true;
    }

    // NEW: Email Update
    if (newEmail && newEmail.trim() !== "") {
      const existingEmail = await User.findOne({ email: newEmail, _id: { $ne: user._id } });
      if (existingEmail) return res.status(400).json({ success: false, message: "Email is already in use by another account." });
      user.email = newEmail;
      credentialsChanged = true;
    }

    // Password Update
    if (newPassword && newPassword.trim() !== "") {
      if (newPassword.length < 8) return res.status(400).json({ success: false, message: "New password must be at least 8 characters long." });
      user.password = await hashPassword(newPassword);
      credentialsChanged = true;
      passwordChanged = true;
    }

    if (!credentialsChanged) {
       return res.status(400).json({ success: false, message: "No new credentials provided to update." });
    }

    await user.save();

    const successAudit = new Audit({
      user_id: user.user_id,
      full_name: `${user.first_name} ${user.last_name}`,
      role: user.role,
      action: "Credentials Updated",
      target: "Super Admin updated their master credentials."
    });
    await successAudit.save().catch(e => console.error(e));

    if (passwordChanged) {
      user.current_session_id = null;
      await user.save();
      req.logout((err) => {
        req.session.destroy();
        res.clearCookie("connect.sid");
        return res.status(200).json({ success: true, message: "Credentials updated successfully. Please log in again.", requireRelogin: true });
      });
    } else {
      return res.status(200).json({ success: true, message: "Settings updated successfully.", requireRelogin: false });
    }

  } catch (error) {
    console.error("Super Admin Credential Update Error:", error);
    return res.status(500).json({ success: false, message: "Server error updating credentials." });
  }
});

export default router;