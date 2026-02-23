import { Router } from "express";
import { isAuthenticated, hasRole } from '../middleware/authMiddleware.js';
import { Announcement } from "../models/announcements.js";
import { Student } from '../models/students.js';
import { Section } from '../models/sections.js';
import { Audit } from '../models/audits.js';
import { User } from '../models/users.js';

const router = Router();

router.get('/api/announcement',
  isAuthenticated,
  hasRole('user'),
  async (req, res) => {
    try {
      const parentId = req.user.user_id;
      const students = await Student.find({ user_id: parentId });
      
      if (!students || students.length === 0) {
        return res.json({ success: true, announcements: [] });
      }

      const sectionIds = students.map(s => s.section_id).filter(id => id != null);
      const sections = await Section.find({ section_id: { $in: sectionIds } });
      const teacherIds = sections.map(sec => sec.user_id);

      const announcements = await Announcement.find({ 
        user_id: { $in: teacherIds } 
      })
      .sort({ created_at: -1 })
      .limit(10);

      return res.json({ 
        success: true, 
        announcements 
      });
    } catch (error) {
      console.error("❌ Error fetching announcements:", error.message);
      return res.status(500).json({ error: "Failed to load announcements." });
    }
  }
);

router.post('/api/announcements',
  isAuthenticated,
  hasRole('admin'),
  async (req, res) => {
    const { announcement, category } = req.body;
    const authorId = req.user.user_id;
    const firstName = req.user.first_name || "Admin";
    const lastName = req.user.last_name || "";
    const fullName = `${firstName} ${lastName}`.trim();

    try {
      if (!announcement?.trim()) {
        return res.status(400).json({ error: "Announcement content is required." });
      }

      const newAnnouncement = new Announcement({
        user_id: authorId,
        full_name: fullName,
        announcement: announcement,
        category: category || 'campaign' 
      });

      await newAnnouncement.save();

      const payload = {
        ...newAnnouncement.toObject(),
        user: { first_name: firstName, last_name: lastName }
      };

      const userDoc = await User.findOne({ user_id: authorId });

      const auditLog = new Audit({
        user_id: authorId,
        full_name: fullName,
        role: userDoc ? userDoc.role : 'user',
        action: "Posted Announcement",
        target: 'Parent/Guardian'
      });

      await auditLog.save();

      req.app.get('socketio').emit('new_announcement', payload);

      return res.status(201).json({ 
        success: true, 
        message: "Announcement posted successfully!",
        announcement: payload
      });
    } catch (error) {
      console.error("❌ Announcement Error:", error.message);
      return res.status(500).json({ error: "Failed to post announcement." });
    }
  }
);

export default router;