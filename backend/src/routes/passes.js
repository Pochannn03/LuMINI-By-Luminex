import { Router } from "express";
import { hasRole, isAuthenticated } from "../middleware/authMiddleware.js";
import { AccessPass } from "../models/accessPass.js"; 
import crypto from "crypto"; 

const router = Router();

// POST (PARENT / GUARDIAN QR GENERATION)
router.post('/api/pass/generate', 
  isAuthenticated,
  hasRole('user'),
  async (req, res) => {
    try {
      const purpose = req.body.purpose || 'pickup';
      
      // 1. CALCULATE THE TIME WINDOW (5 minutes ago)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      // 2. CHECK FOR EXISTING ACTIVE PASS
      // We look for a pass by this user, for this purpose, created AFTER 5 mins ago
      const existingPass = await AccessPass.findOne({
        user: req.user._id,
        purpose: purpose,
        createdAt: { $gt: fiveMinutesAgo } // $gt means "Greater Than" (newer than)
      });

      // 3. IF FOUND, RETURN THE EXISTING ONE (Do not create new)
      if (existingPass) {
        console.log("Restoring active pass for User:", req.user.user_id);
        return res.json({
          success: true,
          token: existingPass.token,
          createdAt: existingPass.createdAt, // Send this so frontend can sync timer
          message: "Restored active pass"
        });
      }

      // 4. IF NOT FOUND, CREATE NEW
      const secretToken = crypto.randomBytes(16).toString('hex');
      const newPass = await AccessPass.create({
        user: req.user._id,
        user_id: req.user.user_id,
        token: secretToken,
        purpose: purpose
      });

      res.json({
        success: true,
        token: secretToken,
        createdAt: newPass.createdAt,
        message: "Generated new pass"
      });

    } catch (error) {
      console.error("Pass Gen Error:", error);
      res.status(500).json({ error: "Could not generate pass" });
    }
});

router.get('/api/pass/generate', 
  isAuthenticated,
  hasRole('user'),
  async (req, res) => {
    try {
      const purpose = req.body.purpose || 'pickup';
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const existingPass = await AccessPass.findOne({
        user: req.user._id,
        purpose: purpose,
        createdAt: { $gt: fiveMinutesAgo } // $gt means "Greater Than" (newer than)
      });

      if (existingPass) {
        console.log("Restoring active pass for User:", req.user.user_id);
        return res.json({
          success: true,
          token: existingPass.token,
          createdAt: existingPass.createdAt, // Send this so frontend can sync timer
          message: "Restored active pass"
        });
      }

    } catch (error) {
      console.error("Pass Gen Error:", error);
      res.status(500).json({ error: "Could not generate pass" });
    }
});



export default router;