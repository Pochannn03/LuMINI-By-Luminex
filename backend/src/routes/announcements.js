import { Router } from "express";
import { isAuthenticated, hasRole } from '../middleware/authMiddleware.js';
import { Announcement } from "../models/announcements.js";

const router = Router();

router.post('/api/announcements',
  isAuthenticated,
  hasRole('admin'),
  async (req, res) => {
    const { announcement } = req.body;
    const authorId = req.user.user_id;
    const fullName = `${req.user.first_name} ${req.user.last_name}`;

    try {
      if (!announcement || announcement.trim().length === 0) {
        return res.status(400).json({ error: "Announcement content is required." });
      }

      const newAnnouncement = new Announcement({
        user_id: authorId,
        full_name: fullName,
        announcement: announcement
      });

      await newAnnouncement.save();

      req.app.get('socketio').emit('new_announcement', {
        announcement_id: newAnnouncement.announcement_id,
        author_name: fullName,
        content: announcement,
        created_at: newAnnouncement.created_at
      });

      return res.status(201).json({ 
        success: true, 
        message: "Announcement posted successfully!" 
      });
      
    } catch (error) {
      console.error("❌ Announcement Submission Error:", error.message);
      return res.status(500).json({ error: "Failed to post announcement." });
    }
  }
);

export default router;