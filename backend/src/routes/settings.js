import { Router } from "express";
import { hasRole, isAuthenticated } from "../middleware/authMiddleware.js";
import { Settings } from "../models/settings.js";
import { Audit } from "../models/audits.js";

const router = Router();

// GET SCHEDULE SETTINGS
router.get('/api/settings/schedule', 
  isAuthenticated, 
  hasRole('superadmin'),
  async (req, res) => {
    try {
      let settings = await Settings.findOne();

      if (!settings) {
        settings = await Settings.create({});
      }

      res.status(200).json({ 
        success: true, 
        settings 
      });
    } catch (error) {
      console.error("Settings Fetch Error:", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

// UPDATE SCHEDULE SETTINGS
router.patch('/api/settings/schedule', 
  isAuthenticated, 
  hasRole('superadmin'), 
  async (req, res) => {
    try {
      const { morning_start, morning_end, afternoon_start, afternoon_end, late_grace_period_minutes } = req.body;
      const currentUserId = Number(req.user.user_id);
      const fullName = `${req.user.first_name} ${req.user.last_name}`;
      const userRoleSys = req.user.role;

      // Update or create the global settings document
      const updatedSettings = await Settings.findOneAndUpdate(
        {}, 
        {
          morning_start,
          morning_end,
          afternoon_start,
          afternoon_end,
          late_grace_period_minutes
        },
        { new: true, upsert: true }
      );

      const auditLog = new Audit({
        user_id: currentUserId,
        full_name: fullName,
        role: userRoleSys,
        action: "Updated System Config",
        target: "Class Schedule Settings"
      });
      await auditLog.save();

      res.status(200).json({ 
        success: true, 
        message: "Schedule settings updated successfully",
        settings: updatedSettings 
      });

    } catch (error) {
      console.error("Settings Update Error:", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

export default router;