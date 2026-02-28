import { Router } from "express";
import { hasRole, isAuthenticated } from "../middleware/authMiddleware.js";
import { Notification } from '../models/notification.js';
import { User } from '../models/users.js'
import { Student } from "../models/students.js";
import { Section } from "../models/sections.js";
import { Attendance } from "../models/attendances.js";
import { Audit } from "../models/audits.js";
import { Transfer } from "../models/transfers.js";
import { Queue } from "../models/queues.js";

const router = Router();

router.get('/api/notifications', 
  isAuthenticated, 
  async (req, res) => {
    
  try {
    // 1. Ensure currentUserId is a number
    const currentUserId = Number(req.user.user_id);
    
    // 2. Add a log to see what ID is being queried
    console.log(`Fetching notifications for ID: ${currentUserId}`);

    // 3. Query the data
    const notifications = await Notification.find({ recipient_id: currentUserId })
      .sort({ created_at: -1 })
      .populate('sender_details', 'first_name last_name profile_picture') 
      .limit(50);

    const unreadCount = await Notification.countDocuments({ 
      recipient_id: currentUserId, 
      is_read: false 
    });

    return res.status(200).json({
      success: true,
      unreadCount,
      notifications
    });
  } catch (error) {
    // This will print the exact reason for the 500 error in your terminal
    console.error("❌ Notification Route Error:", error); 
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.patch('/api/notifications/:id/read', isAuthenticated, async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { notification_id: req.params.id, recipient_id: req.user.user_id },
      { is_read: true }
    );
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update notification" });
  }
});

// PUT: Clear All notifications (Mark all as read)
router.put('/api/notifications/read-all', isAuthenticated, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient_id: req.user.user_id, is_read: false },
      { is_read: true }
    );
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to clear notifications" });
  }
});

export default router;