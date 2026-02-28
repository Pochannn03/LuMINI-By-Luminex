import { Router } from "express";
import { isAuthenticated, hasRole } from '../middleware/authMiddleware.js';
import { Announcement } from "../models/announcements.js";
import { Student } from '../models/students.js';
import { Section } from '../models/sections.js';
import { Audit } from '../models/audits.js';
import { User } from '../models/users.js';
import { Notification } from '../models/notification.js';

const router = Router();

// ANNOUNCEMENT DISPLAYED ON PARENTS/GUARDIAN
router.get('/api/announcement',
  isAuthenticated,
  hasRole('user'),
  async (req, res) => {
    try {
      const parentId = req.user.user_id; //
      
      // 1. Find all students linked to this parent
      const students = await Student.find({ user_id: parentId });
      
      const superAdmins = await User.find({ role: 'superadmin' }).select('user_id');
      const superAdminIds = superAdmins.map(sa => sa.user_id);

      if (!students || students.length === 0) {
        // If no students, they only see SuperAdmin announcements
        const globalAnnouncements = await Announcement.find({ 
          user_id: { $in: superAdminIds } 
        }).sort({ created_at: -1 }).limit(10);

        return res.json({ success: true, announcements: globalAnnouncements });
      }

      const sectionIds = students.map(s => s.section_id).filter(id => id != null);
      const sections = await Section.find({ section_id: { $in: sectionIds } });
      const teacherIds = sections.map(sec => sec.user_id);

      // 4. Combine Teacher IDs and SuperAdmin IDs
      const allAuthorizedAuthors = [...new Set([...teacherIds, ...superAdminIds])];

      // 5. Fetch announcements from both Teachers and SuperAdmins
      const announcements = await Announcement.find({ 
        user_id: { $in: allAuthorizedAuthors } 
      })
      .sort({ created_at: -1 })
      .limit(15); // Increased limit to accommodate more sources

      const announcementsWithRoles = await Promise.all(announcements.map(async (ann) => {
      const author = await User.findOne({ user_id: ann.user_id }).select('role');
        
        return {
          ...ann.toObject(),
          role: author ? author.role : 'admin'
        };
      }));

      return res.json({ 
        success: true, 
        announcements: announcementsWithRoles,
      });
    } catch (error) {
      console.error("❌ Error fetching announcements:", error.message); //
      return res.status(500).json({ error: "Failed to load announcements." }); //
    }
  }
);

router.get('/api/announcement/teacher',
  isAuthenticated,
  hasRole('admin'),
  async (req, res) => {
    try {
      // 1. Get all SuperAdmin IDs
      const superAdmins = await User.find({ role: 'superadmin' }).select('user_id');
      const superAdminIds = superAdmins.map(sa => sa.user_id);

      // 2. Fetch announcements made by SuperAdmins
      const announcements = await Announcement.find({ 
        user_id: { $in: superAdminIds } 
      })
      .sort({ created_at: -1 })
      .limit(10)
      .lean();

      // 3. Attach the 'superadmin' role explicitly so the frontend knows
      const announcementsWithRoles = announcements.map(ann => ({
        ...ann,
        role: 'superadmin' 
      }));

      return res.json({ 
        success: true, 
        announcements: announcementsWithRoles 
      });
    } catch (error) {
      console.error("❌ Teacher Announcement Error:", error.message);
      return res.status(500).json({ error: "Failed to load system announcements." });
    }
  }
);

router.post('/api/announcements',
  isAuthenticated,
  hasRole('admin', 'superadmin'),
  async (req, res) => {
    const { announcement, category } = req.body;
    const authorId = req.user.user_id;
    const firstName = req.user.first_name || "Admin";
    const lastName = req.user.last_name || "";
    const fullName = `${firstName} ${lastName}`.trim();
    const authorRole = req.user.role;

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

      const targetRoles = authorRole === 'superadmin' ? ['user', 'admin'] : ['user'];

      const recipients = await User.find({ 
        role: { $in: targetRoles },
        user_id: { $ne: authorId },
        is_archive: false 
      }).select('user_id');

      if (recipients.length > 0) {
        const io = req.app.get('socketio');
        const notificationPromises = recipients.map(async (recipient) => {
          const newNotif = new Notification({
            recipient_id: recipient.user_id,
            sender_id: authorId,
            type: 'Announcement',
            title: authorRole === 'superadmin' ? 'System Announcement' : 'School Announcement',
            message: `${fullName} posted: ${announcement.substring(0, 30)}...`,
            is_read: false
          });
          
          const savedNotif = await newNotif.save(); 
          io.emit('new_notification', savedNotif);
          return savedNotif;
        });

        await Promise.all(notificationPromises); // More efficient than a for-loop
      }

      const payload = {
        ...newAnnouncement.toObject(),
        user: { 
          first_name: firstName, 
          last_name: lastName,
          role: authorRole 
        },
        role: authorRole
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
      
      req.app.get('socketio').emit('notification_received');
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