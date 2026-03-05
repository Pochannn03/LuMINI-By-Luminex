import { Router } from "express";
import { hasRole, isAuthenticated } from "../middleware/authMiddleware.js";
import { Transfer } from "../models/transfers.js";
import { Settings } from "../models/settings.js";
import { Audit } from "../models/audits.js"; 
import { User } from "../models/users.js"; 
import { Section } from "../models/sections.js"; 
import { Student } from "../models/students.js"
import { Queue } from "../models/queues.js";
import { Notification } from "../models/notification.js";

const router = Router();

// POST /api/queue
router.post('/api/queue', 
  isAuthenticated, 
  hasRole('user'),
  async (req, res) => {
    const { student_id, section_id, status, purpose, isEarly, authorized_picker_id } = req.body;
    const parentId = req.user.user_id;


    try {
      const student = await Student.findOne({ student_id }).populate('section_details');
      
      if (!student) {
        return res.status(400).json({ msg: "Student not found." });
      }

      if (student.status === 'Dismissed') {
        return res.status(403).json({ msg: "Student is already dismissed and no longer at school." });
      }

      // 2. Schedule Bypassing Logic for Standard Pickups
      if (purpose === 'Pick up' && !isEarly) {
        if (!student.section_details) {
          return res.status(400).json({ msg: "Section data not found for this student." });
        }

        // --- FETCH DYNAMIC SETTINGS ---
        const { Settings } = await import("../models/settings.js"); // Ensure correct path
        let sysSettings = await Settings.findOne();
        if (!sysSettings) {
            sysSettings = { morning_end: "11:30", afternoon_end: "16:30" }; // Fallback
        }

        const scheduleType = student.section_details.class_schedule; // "Morning" or "Afternoon"
        const now = new Date();
        const manilaTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
        const currentMins = (manilaTime.getHours() * 60) + manilaTime.getMinutes();

        // Get the end time string from settings (e.g., "11:30" or "17:00")
        const endTimeStr = scheduleType?.includes('Morning') 
            ? sysSettings.morning_end 
            : sysSettings.afternoon_end;

        // Convert "HH:mm" to total minutes
        const [endHr, endMin] = endTimeStr.split(':').map(Number);
        const dismissalMins = (endHr * 60) + endMin;
        
        // Window opens 20 minutes before the dynamic dismissal time
        const windowOpenMins = dismissalMins - 20;

        if (currentMins < windowOpenMins) {
          // Format the end time for the error message (e.g., "11:30 AM")
          const displayTime = new Date();
          displayTime.setHours(endHr, endMin);
          const formattedDisplay = displayTime.toLocaleTimeString('en-US', { 
            hour: 'numeric', minute: '2-digit', hour12: true 
          });

          return res.status(403).json({ 
            msg: `Pick-up window hasn't opened yet. Dismissal is at ${formattedDisplay}. Please try again 20 mins before.` 
          });
        }
      }

      const actualId = authorized_picker_id || parentId;
      let pickerDisplayName = `${req.user.first_name} ${req.user.last_name}`;
        if (authorized_picker_id && Number(authorized_picker_id) !== Number(parentId)) {
            const picker = await User.findOne({ user_id: authorized_picker_id });
            if (picker) {
                pickerDisplayName = `${picker.first_name} ${picker.last_name} (${picker.relationship})`;
            }
        }

      // 3. Update or Create Queue Entry
      const queueEntry = await Queue.findOneAndUpdate(
            { user_id: actualId, student_id: student_id }, // This ensures the Guardian is the record owner
            { 
              student_id, 
              section_id, 
              status, 
              purpose, 
              on_queue: true,
              created_at: new Date() 
            },
            { upsert: true, new: true }
        ).populate('user_details');

      try {
        const sectionDoc = await Section.findOne({ section_id: section_id });
        
        if (sectionDoc && sectionDoc.user_id) {
            const studentName = `${student.first_name} ${student.last_name}`;
            const parentName = `${req.user.first_name} ${req.user.last_name}`;

            const io = req.app.get('socketio');

            // Only trigger if it is an early pickup
            if (isEarly) {
                const newNotif = await Notification.create({
                  recipient_id: Number(sectionDoc.user_id),
                  sender_id: Number(parentId),
                  type: 'Transfer',
                  title: 'Early Pickup Request',
                  message: `${pickerDisplayName} is requesting to pick up ${studentName} before dismissal.`,
                  is_read: false,
                  created_at: new Date()
                });

                if (io) {
                    // Correctly emit the notification to the target room
                    io.to(`user_${sectionDoc.user_id}`).emit('new_notification', newNotif);
                }
            }
          }
      } catch (notifErr) {
          console.error("Notification/Socket Error:", notifErr.message);
      }

      // 5. Audit Log
      const auditLog = new Audit({
        user_id: parentId,
        full_name: `${req.user.first_name} ${req.user.last_name}`,
        role: req.user.role,
        action: isEarly ? "Early Pickup Request" : "Queue Update",
        target: `Status: ${status} | Purpose: ${purpose}${isEarly ? ' (Bypassed Schedule)' : ''}`
      });
      await auditLog.save();
      
      // 6. Real-time Queue Update
      const io = req.app.get('socketio');
      if (io) {
          io.emit('new_queue_entry', queueEntry);
      }

      return res.json({ success: true, msg: "Queue updated successfully." });

    } catch (err) { 
      console.error("Queue 500 Error:", err);
      return res.status(500).json({ msg: "Server Error: " + err.message }); 
    }
});

// GET QUEUE 
router.get('/api/queue', 
  isAuthenticated, 
  hasRole('admin'), 
  async (req, res) => {
    try {
      const currentUserId = Number(req.user.user_id);
      const userRole = req.user.relationship?.toLowerCase();
      let sectionIds = [];
      let query = { on_queue: true };

      if (userRole === 'teacher') {
        const teacherSections = await Section.find({ user_id: currentUserId })
                                             .select('section_id');
        
        // If teacher has no sections, return empty queue immediately
        if (!teacherSections || teacherSections.length === 0) {
          return res.status(200).json({ success: true, queue: [], authorized_sections: [] });
        }

        sectionIds = teacherSections.map(s => s.section_id);
        
        // Find students in these sections
        const studentsInSections = await Student.find({ 
            section_id: { $in: sectionIds },
            is_archive: false 
        }).select('student_id');

        const studentIds = studentsInSections.map(s => s.student_id);

        // If no students are in the teacher's sections, return empty
        if (studentIds.length === 0) {
          return res.status(200).json({ success: true, queue: [], authorized_sections: sectionIds });
        }

        // Explicitly filter the queue by these student IDs
        query.student_id = { $in: studentIds };
      }

      const queue = await Queue.find(query)
                               .populate('user_details')
                               .populate('student_details')
                               .sort({ created_at: -1 });

      res.status(200).json({ 
        success: true, 
        queue, 
        authorized_sections: sectionIds 
      });

    } catch (err) {
      console.error("Queue Fetch Error:", err);
      res.status(500).json({ success: false, msg: "Failed to load queue." });
    }
});

// QUEUE CHECKING FOR SCAN BUTTON ENABLER
// Backend: Queue Check Endpoint
router.get('/api/queue/check', 
  isAuthenticated, 
  async (req, res) => {
    try {
      const { student_id } = req.query; // Accept student_id from frontend

      if (!student_id) {
         return res.json({ onQueue: false });
      }

      const queueEntry = await Queue.findOne({ 
        user_id: req.user.user_id, 
        student_id: student_id, // Match the specific child
        on_queue: true 
      });

      res.json({ onQueue: !!queueEntry });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
});

router.patch('/api/queue/remove/:userId', 
  isAuthenticated, 
  hasRole('admin'),
  async (req, res) => {
    try {
      const { userId } = req.params;

      const queueEntry = await Queue.findOne({ user_id: userId, on_queue: true });

      if (!queueEntry) {
        return res.status(404).json({ success: false, msg: "Active queue entry not found" });
      }

      queueEntry.on_queue = false;
      await queueEntry.save();
      
      let targetName = `User ID: ${userId}`;
      if (queueEntry.first_name) {
        targetName = `${queueEntry.first_name} ${queueEntry.last_name}`;
      } else if (queueEntry.user_details?.first_name) {
        targetName = `${queueEntry.user_details.first_name} ${queueEntry.user_details.last_name}`;
      }

      const auditLog = new Audit({
        user_id: req.user.user_id,
        full_name: `${req.user.first_name} ${req.user.last_name}`,
        role: req.user.role,
        action: "Remove from Queue",
        target: `Removed ${targetName} from the active queue`
      });
      await auditLog.save();

      req.app.get('socketio').emit('remove_queue_entry', Number(userId));

      res.json({ success: true, msg: "Removed from queue" });
    } catch (err) {
      res.status(500).json({ success: false, msg: "Server error" });
    }
});

export default router;