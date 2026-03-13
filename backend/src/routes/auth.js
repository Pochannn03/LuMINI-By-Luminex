import { Router } from "express";
import passport from "../config/passport.js";
import crypto from 'crypto';
import { User } from "../models/users.js";
import { Audit } from "../models/audits.js"

import { sendPasswordUpdateOTP, sendUnauthorizedAccessEmail } from '../utils/emailService.js';
import { hashPassword } from '../utils/passwordUtils.js';

// ==========================================
// BULLETPROOF ANTI-SPOOFING MATH HELPER
// ==========================================
const euclideanDistance = (desc1, desc2) => {
    // 1. Force both inputs into standard arrays (handles MongoDB objects/strings)
    let arr1 = typeof desc1 === 'string' ? JSON.parse(desc1) : desc1;
    let arr2 = typeof desc2 === 'string' ? JSON.parse(desc2) : desc2;
    
    arr1 = Array.isArray(arr1) ? arr1 : Object.values(arr1);
    arr2 = Array.isArray(arr2) ? arr2 : Object.values(arr2);

    // 2. If lengths don't match (128 data points), it's corrupted data = NaN
    if (arr1.length !== arr2.length || arr1.length === 0) return NaN;

    // 3. Calculate distance
    let sum = 0;
    for (let i = 0; i < arr1.length; i++) {
        sum += Math.pow(Number(arr1[i]) - Number(arr2[i]), 2);
    }
    return Math.sqrt(sum);
};

const router = Router();

router.post("/api/auth", (req, res, next) => {
  passport.authenticate("local", async (err, user, info) => {
    if (err) {
      console.error("Passport Error:", err);
      return res.status(500).json({ message: "Server error" });
    }

    if (!user) {
      const failedAudit = new Audit({
        user_id: 0, 
        full_name: "Unauthenticated System Attempt",
        role: "user",
        action: "Login Failed",
        target: `Failed login attempt for username: ${req.body.username || 'Unknown'}`
      });
      await failedAudit.save().catch(e => console.error("Audit Save Error:", e));
      return res.status(401).json({ message: "Invalid Credentials" });
    }

    if (user.is_archive) {
      const archiveAudit = new Audit({
        user_id: user.user_id,
        full_name: `${user.first_name} ${user.last_name}`,
        role: user.role,
        action: "Login Blocked",
        target: `Archived user tried to log in.`
      });
      await archiveAudit.save().catch(e => console.error("Audit Save Error:", e));
      return res.status(403).json({ message: "This account has been revoked or archived. Access denied." });
    }

    if (user.is_approved === false) {
      const pendingAudit = new Audit({
        user_id: user.user_id,
        full_name: `${user.first_name} ${user.last_name}`,
        role: user.role,
        action: "Login Blocked",
        target: `Pending user tried to log in before approval.`
      });
      await pendingAudit.save().catch(e => console.error("Audit Save Error:", e));
      return res.status(403).json({ message: "Your account is still pending admin approval. Please wait to be verified." });
    }

    const { rememberMe } = req.body; 
    if (rememberMe) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; 
    } else {
      req.session.cookie.expires = false; 
    }

    req.logIn(user, async (err) => {
      if (err) {
        console.error("Login Session Error:", err);
        return res.status(500).json({ message: "Session login failed" });
      }

      const newSessionId = req.sessionID;

      if (user.current_session_id && user.current_session_id !== newSessionId) {
        req.sessionStore.destroy(user.current_session_id, (storeErr) => {
          if (storeErr) console.error("Error destroying old session:", storeErr);
        });
      }

      user.current_session_id = newSessionId;
      await user.save();

      req.session.save(async (err) => {
        if (err) {
          return res.status(500).json({ message: "Session save failed" });
        }

        const successAudit = new Audit({
          user_id: user.user_id,
          full_name: `${user.first_name} ${user.last_name}`,
          role: user.role,
          action: "Login Success",
          target: `User logged in successfully. RememberMe: ${!!rememberMe}`
        });

        await successAudit.save().catch(e => console.error("Audit Save Error:", e));

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

router.get("/api/auth/session", async (req, res) => {
  if (req.isAuthenticated() && req.user) {
    try {
      const freshUser = await User.findById(req.user._id);

      if (!freshUser) {
        return res.status(200).json({ isAuthenticated: false, user: null });
      }

      const safeUser = {
        id: freshUser._id,
        username: freshUser.username,
        relationship: freshUser.relationship,
        role: freshUser.role,
        user_id: freshUser.user_id,
        firstName: freshUser.first_name, 
        lastName: freshUser.last_name,
        is_first_login: freshUser.is_first_login !== undefined ? freshUser.is_first_login : true,
        profile_picture: freshUser.profile_picture 
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

router.post("/api/auth/logout", async (req, res) => {
  const user = req.user;
  
  if (user) {
    try {
      await User.findByIdAndUpdate(user._id, { $set: { current_session_id: null } });
    } catch (dbErr) {
      console.error("Error clearing session ID on logout:", dbErr);
    }
  }

  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: "Logout failed" });
    }

    req.session.destroy(async (err) => {
      if (err) {
        return res.status(500).json({ message: "Could not destroy session" });
      }

      if (user) {
        try {
          const auditLog = new Audit({
            user_id: user.user_id,
            full_name: `${user.first_name} ${user.last_name}`,
            role: user.role,
            action: "Logout Success",
            target: `User logged out successfully. Session ended.`
          });
          await auditLog.save();
        } catch (auditErr) {
          console.error("Logout Audit Error:", auditErr);
        }
      }

      res.clearCookie("connect.sid");
      return res.status(200).json({ message: "Logout successful" });
    });
  });
});

// =========================================================
// FORGOT PASSWORD FLOW (UNAUTHENTICATED ROUTES)
// =========================================================

// 1. Search Account
router.post('/api/auth/forgot-password/search', async (req, res) => {
    try {
        const { firstName, lastName, email } = req.body;

        const user = await User.findOne({
            first_name: { $regex: new RegExp("^" + firstName + "$", "i") },
            last_name: { $regex: new RegExp("^" + lastName + "$", "i") },
            email: { $regex: new RegExp("^" + email + "$", "i") }
        });

        if (!user) {
            const failedAudit = new Audit({
                user_id: 0, 
                full_name: "Anonymous System User",
                role: "user",
                action: "Forgot Password Search Fail",
                target: `Search attempt failed for email: ${email}`
            });
            await failedAudit.save().catch(e => console.error("Audit Error:", e));

            return res.status(404).json({ message: "No account found matching those details." });
        }

        return res.status(200).json({ userId: user._id });
    } catch (error) {
        console.error("Search Error:", error);
        return res.status(500).json({ message: "Server error during search." });
    }
});

// 2. Verify Facial Biometrics (STRICT REJECTION ENFORCED)
router.post('/api/auth/forgot-password/verify-face', async (req, res) => {
    try {
        const { userId, facialDescriptor } = req.body;
        const user = await User.findById(userId);

        if (!user || !user.facial_descriptor || user.facial_descriptor.length === 0) {
            return res.status(400).json({ message: "No biometric data registered for this account." });
        }

        // Calculate distance with strict parsing
        const distance = euclideanDistance(user.facial_descriptor, facialDescriptor);

        // STRICT REJECTION: Reject if over 0.55 OR if the calculation failed (NaN)
        if (isNaN(distance) || distance > 0.55) {
            
            const failReason = isNaN(distance) ? "Corrupted Data (NaN)" : `Distance: ${distance.toFixed(4)}`;

            const failedAudit = new Audit({
                user_id: user.user_id,
                full_name: `${user.first_name} ${user.last_name}`,
                role: user.role,
                action: "Face Verify Failed",
                target: `Forgot Password biometric mismatch (${failReason})`
            });
            await failedAudit.save().catch(e => console.error(e));

            // FIRE SECURITY ALERT EMAIL
            if (user.email) {
                await sendUnauthorizedAccessEmail(user.email, user.first_name);
            }

            return res.status(401).json({ message: "Security Alert: Face does not match the registered user. The account owner has been notified." });
        }

        const successAudit = new Audit({
            user_id: user.user_id,
            full_name: `${user.first_name} ${user.last_name}`,
            role: user.role,
            action: "Face Verify Success",
            target: "Identity verified via facial recognition."
        });
        await successAudit.save().catch(e => console.error(e));
        
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
            const auditLog = new Audit({
                user_id: user.user_id,
                full_name: `${user.first_name} ${user.last_name}`,
                role: user.role,
                action: "OTP Request",
                target: `Security OTP sent to email: ${user.email}`
            });
            await auditLog.save().catch(e => console.error("Audit Error:", e));

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

        const auditLog = new Audit({
            user_id: user.user_id,
            full_name: `${user.first_name} ${user.last_name}`,
            role: user.role,
            action: "Password Reset",
            target: `Password successfully updated via forgot-password flow.`
        });
        await auditLog.save().catch(e => console.error("Audit Save Error:", e));

        return res.status(200).json({ message: "Password reset successful!" });
    } catch (error) {
        console.error("Reset Error:", error);
        return res.status(500).json({ message: "Server error during reset." });
    }
});

export default router;