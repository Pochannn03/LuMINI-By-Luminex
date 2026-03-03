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
      const parentId = req.user.user_id;
      
      const students = await Student.find({ user_id: parentId, is_archive: false });
      const mySectionIds = students.map(s => s.section_id).filter(id => id !== null);

      const sections = await Section.find({ section_id: { $in: mySectionIds } });
      const myTeacherIds = sections.map(sec => sec.user_id);

      const superadmins = await User.find({ role: 'superadmin' }).select('user_id');
      const superadminIds = superadmins.map(u => u.user_id);

      const validGlobalAuthors = [...superadminIds, ...myTeacherIds];

      const announcements = await Announcement.find({
        $or: [
          { section_id: null, user_id: { $in: validGlobalAuthors } },
          { section_id: { $in: mySectionIds } }
        ]
      })
      .sort({ created_at: -1 })
      .limit(20);

      // 3. Populate Author Roles (to distinguish System vs Teacher in UI)
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
      console.error("❌ Error fetching announcements:", error.message);
      return res.status(500).json({ error: "Failed to load announcements." });
    }
  }
);

router.get('/api/announcement/teacher',
  isAuthenticated,
  hasRole('admin'),
  async (req, res) => {
    try {
      const superAdmins = await User.find({ role: 'superadmin' }).select('user_id');
      const superAdminIds = superAdmins.map(sa => sa.user_id);

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
    const { announcement, category, section_id } = req.body;
    const authorId = req.user.user_id;
    const { first_name, last_name, role: authorRole } = req.user;
    const fullName = `${first_name} ${last_name}`.trim();

    try {
      if (!announcement?.trim()) {
        return res.status(400).json({ error: "Announcement content is required." });
      }

      if (authorRole !== 'superadmin' && !section_id) {
        return res.status(403).json({ error: "Teachers must select a section to post an announcement." });
      }

      const finalSectionId = section_id === 'all' ? null : (section_id || null);

      const newAnnouncement = new Announcement({
        user_id: authorId,
        full_name: fullName,
        announcement: announcement,
        category: category || 'notifications_active',
        section_id: finalSectionId
      });
      await newAnnouncement.save();

      let recipientIds = [];

      if (finalSectionId) {
        const students = await Student.find({ 
          section_id: finalSectionId, 
          is_archive: false 
        }).select('user_id');

        recipientIds = [...new Set(students.flatMap(s => s.user_id))]; 

      } else if (section_id === 'all' && authorRole !== 'superadmin') {
        const mySections = await Section.find({ user_id: authorId, is_archive: false }).select('section_id');
        const mySecIds = mySections.map(s => s.section_id);
        const students = await Student.find({ section_id: { $in: mySecIds }, is_archive: false }).select('user_id');
        recipientIds = [...new Set(students.flatMap(s => s.user_id))];

      } else {
        const targetRoles = authorRole === 'superadmin' ? ['user', 'admin'] : ['user'];
        const users = await User.find({ 
          role: { $in: targetRoles },
          user_id: { $ne: authorId },
          is_archive: false 
        }).select('user_id');
        recipientIds = users.map(u => u.user_id); 
      }

      const io = req.app.get('socketio');
      if (recipientIds.length > 0) {
        const notificationPromises = recipientIds.map(async (rId) => {
          const newNotif = new Notification({
            recipient_id: rId,
            sender_id: authorId,
            type: 'Announcement',
            title: section_id ? 'Section Announcement' : 'School Announcement',
            message: `${fullName} posted: ${announcement.substring(0, 30)}...`,
          });
          await newNotif.save();
          
          io.to(`user_${rId}`).emit('new_notification', newNotif);
        });
        await Promise.all(notificationPromises);
      }

      const payload = {
        ...newAnnouncement.toObject(),
        user: { 
          first_name: first_name, 
          last_name: last_name,
          role: authorRole 
        },
        role: authorRole
      };
      
      const userDoc = await User.findOne({ user_id: authorId });

      let targetName = 'All Parents';
      
      if (finalSectionId) {
        const targetSection = await Section.findOne({ section_id: finalSectionId }).select('section_name');
        targetName = targetSection ? `Section ${targetSection.section_name}` : `Section ${finalSectionId}`;
      } else if (section_id === 'all') {
        targetName = 'All My Sections';
      }

      // 2. Save the Audit Log
      const auditLog = new Audit({
        user_id: authorId,
        full_name: fullName,
        role: authorRole,
        action: "Posted Announcement",
        target: targetName 
      });
      await auditLog.save();
      
      io.emit('notification_received');
      io.emit('new_announcement', payload);

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