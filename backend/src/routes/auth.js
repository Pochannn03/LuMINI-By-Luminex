import { Router } from "express";
import passport from "../config/passport.js";
import { User } from "../models/users.js"; // <-- NEW: Import the User model!

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

export default router;