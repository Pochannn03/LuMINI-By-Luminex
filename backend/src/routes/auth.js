import { Router } from "express";
import passport from "../config/passport.js";

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

    req.logIn(user, (err) => {
      if (err) {
        console.error("Login Session Error:", err);
        return res.status(500).json({ message: "Session login failed" });
      } else {
        const safeUser = {
          id: user._id,
          username: user.username,
          role: user.role,
        };

        return res.status(200).json({
          message: "Login successful",
          user: safeUser,
        });
      }
    });
  })(req, res, next);
});

router.get("/api/auth/session", (req, res) => {
  if (req.isAuthenticated() && req.user) {
    const safeUser = {
      id: req.user._id,
      username: req.user.username,
      role: req.user.role,
    };
    return res.status(200).json({ isAuthenticated: true, user: safeUser });
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

// GET /api/user/profile
// Description: Get full details of the currently logged-in user
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
