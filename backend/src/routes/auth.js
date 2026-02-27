import { Router } from "express";
import passport from "../config/passport.js";
import { User } from "../models/users.js"; // <-- NEW: Import the User model!
import crypto from 'crypto';
import { sendPasswordUpdateOTP } from '../utils/emailService.js';
import { hashPassword } from '../utils/passwordUtils.js';

// Helper function for Face Matching
const euclideanDistance = (desc1, desc2) => {
    let sum = 0;
    for (let i = 0; i < desc1.length; i++) {
        sum += Math.pow(desc1[i] - desc2[i], 2);
    }
    return Math.sqrt(sum);
};

const router = Router();

router.post("/api/auth", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      console.error("Passport Error:", err);
      return res.status(500).json({ message: "Server error" });
    }

    if (!user) {
      return res.status(401).json({ message: "Invalid Credentials" });
    }

    // --- THE NEW FIX: CHECK IF ACCOUNT IS REVOKED/ARCHIVED ---
    if (user.is_archive === true) {
      return res.status(403).json({ message: "This account has been revoked or archived. Access denied." });
    }
    // ---------------------------------------------------------

    req.logIn(user, (err) => {
      if (err) {
        console.error("Login Session Error:", err);
        return res.status(500).json({ message: "Session login failed" });
      }

      // 3. Force Session Save (The fix we discussed)
      req.session.save((err) => {
        if (err) {
          return res.status(500).json({ message: "Session save failed" });
        }

        const safeUser = {
          id: user._id || req.user._id,
          username: user.username || req.user.username,
          relationship: user.relationship || req.user.relationship,
          role: user.role || req.user.role,
          user_id: user.user_id || req.user.user_id,
          firstName: user.first_name || req.user.first_name, 
          lastName: user.last_name || req.user.last_name,
          is_first_login: user.is_first_login !== undefined ? user.is_first_login : true, 
          profile_picture: user.profile_picture || req.user?.profile_picture
        };

        return res.status(200).json({
          message: "Login successful",
          user: safeUser,
        });
      });
    });
  })(req, res, next);
});

// --- UPDATED: Made async to fetch fresh DB data ---
router.get("/api/auth/session", async (req, res) => {
  if (req.isAuthenticated() && req.user) {
    
    try {
      // 1. Force a fresh database lookup using the ID from the session cookie
      const freshUser = await User.findById(req.user._id);

      if (!freshUser) {
        return res.status(200).json({ isAuthenticated: false, user: null });
      }

      // 2. Build the safe object with the 100% fresh data
      const safeUser = {
        id: freshUser._id,
        username: freshUser.username,
        relationship: freshUser.relationship,
        role: freshUser.role,
        user_id: freshUser.user_id,
        firstName: freshUser.first_name, 
        lastName: freshUser.last_name,
        is_first_login: freshUser.is_first_login !== undefined ? freshUser.is_first_login : true,
        profile_picture: freshUser.profile_picture // <-- ADDED MISSING PICTURE FIX!
      };

      return res.status(200).json({ isAuthenticated: true, user: safeUser });

    } catch (error) {
      console.error("Session DB Fetch Error:", error);
      return res.status(500).json({ isAuthenticated: false, message: "Server error" });
    }

  } else {
    return res.status(200).json({ isAuthenticated: false, user: null });
  }
});

router.post("/api/auth/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: "Logout failed" });
    }

    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not destroy session" });
      }
      res.clearCookie("connect.sid");
      return res.status(200).json({ message: "Logout successful" });
    });
  });
});

// =========================================================
// FORGOT PASSWORD FLOW (UNAUTHENTICATED ROUTES)
// =========================================================

// 1. Search Account (Case Insensitive)
router.post('/api/auth/forgot-password/search', async (req, res) => {
    try {
        const { firstName, lastName, email } = req.body;

        const user = await User.findOne({
            first_name: { $regex: new RegExp("^" + firstName + "$", "i") },
            last_name: { $regex: new RegExp("^" + lastName + "$", "i") },
            email: { $regex: new RegExp("^" + email + "$", "i") }
        });

        if (!user) {
            return res.status(404).json({ message: "No account found matching those details." });
        }

        // Return ONLY the ID, keep the rest secure
        return res.status(200).json({ userId: user._id });
    } catch (error) {
        console.error("Search Error:", error);
        return res.status(500).json({ message: "Server error during search." });
    }
});

// 2. Verify Facial Biometrics
router.post('/api/auth/forgot-password/verify-face', async (req, res) => {
    try {
        const { userId, facialDescriptor } = req.body;
        const user = await User.findById(userId);

        if (!user || !user.facial_descriptor || user.facial_descriptor.length === 0) {
            return res.status(400).json({ message: "No biometric data registered for this account." });
        }

        // Compare the camera descriptor to the database descriptor
        const distance = euclideanDistance(user.facial_descriptor, facialDescriptor);
        
        // 0.50 to 0.55 is the standard strict threshold for face-api.js
        if (distance > 0.55) {
            return res.status(401).json({ message: "Face does not match the registered user." });
        }

        return res.status(200).json({ message: "Identity verified successfully." });
    } catch (error) {
        console.error("Face Verify Error:", error);
        return res.status(500).json({ message: "Server error verifying biometrics." });
    }
});

// 3. Send OTP
router.post('/api/auth/forgot-password/send-otp', async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findById(userId);

        if (!user) return res.status(404).json({ message: "User not found." });

        const otp = crypto.randomInt(100000, 999999).toString();
        user.reset_otp = otp;
        user.reset_otp_expires = Date.now() + 5 * 60 * 1000; 
        await user.save();

        const emailSent = await sendPasswordUpdateOTP(user.email, otp, user.first_name);

        if (emailSent) {
            return res.status(200).json({ message: "OTP sent successfully!" });
        } else {
            return res.status(500).json({ message: "Failed to send email." });
        }
    } catch (error) {
        console.error("OTP Error:", error);
        return res.status(500).json({ message: "Server error generating OTP." });
    }
});

// 4. Verify OTP & Reset Password
router.post('/api/auth/forgot-password/reset', async (req, res) => {
    try {
        const { userId, otp, newPassword } = req.body;
        const user = await User.findById(userId);

        if (!user || !user.reset_otp || !user.reset_otp_expires) {
            return res.status(400).json({ message: "Invalid request. Please restart the process." });
        }

        if (Date.now() > user.reset_otp_expires) {
            user.reset_otp = null; user.reset_otp_expires = null; await user.save();
            return res.status(400).json({ message: "OTP has expired." });
        }

        if (user.reset_otp !== otp) {
            return res.status(400).json({ message: "Invalid OTP." });
        }

        // Success! Change password and clear OTP
        user.password = await hashPassword(newPassword);
        user.reset_otp = null;
        user.reset_otp_expires = null;
        await user.save();

        return res.status(200).json({ message: "Password reset successful!" });
    } catch (error) {
        console.error("Reset Error:", error);
        return res.status(500).json({ message: "Server error during reset." });
    }
});


export default router;