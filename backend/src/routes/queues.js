import { Router } from "express";
import { hasRole, isAuthenticated } from "../middleware/authMiddleware.js";
import { Transfer } from "../models/transfers.js";
import { Audit } from "../models/audits.js"; 
import { Section } from "../models/sections.js"; 
import { Student } from "../models/students.js"
import { Queue } from "../models/queues.js";

const router = Router();

// POST /api/queue
router.post('/api/queue', 
  isAuthenticated, 
  hasRole('user'),
  async (req, res) => {
  const { student_id, section_id, status, purpose, isEarly } = req.body;

    try {
      const student = await Student.findOne({ student_id }).populate('section_details');
      
      if (!student) {
        return res.status(400).json({ msg: "Student not found." });
      }

      if (student.status === 'Dismissed') {
        return res.status(403).json({ msg: "Student is already dismissed and no longer at school." });
      }

      if (purpose === 'Pick up' && !isEarly) {
        const student = await Student.findOne({ student_id }).populate('section_details');
        
        if (!student || !student.section_details) {
          return res.status(400).json({ msg: "Student or Section data not found." });
        }
        if (student.status === 'Dismissed') {
          return res.status(403).json({ 
            msg: `Pick-up window hasn't opened yet. Please try again 20 mins before dismissal.` 
          });
        }

        const schedule = student.section_details.class_schedule;
        const now = new Date();
        const manilaTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
        const currentMins = (manilaTime.getHours() * 60) + manilaTime.getMinutes();

        const dismissalMins = (schedule === 'Morning') ? (11 * 60 + 30) : (16 * 60 + 30);
        const windowOpenMins = dismissalMins - 20;

        if (currentMins < windowOpenMins) {
          return res.status(403).json({ 
            msg: `Pick-up window hasn't opened yet. Please try again 20 mins before dismissal.` 
          });
        }
      }

      const queueEntry = await Queue.findOneAndUpdate(
      { user_id: req.user.user_id },
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

    const auditLog = new Audit({
        user_id: req.user.user_id,
        full_name: `${req.user.first_name} ${req.user.last_name}`,
        role: req.user.role,
        action: isEarly ? "Early Pickup Request" : "Queue Update",
        target: `Status: ${status} | Purpose: ${purpose}${isEarly ? ' (Bypassed Schedule)' : ''}`
      });
      await auditLog.save();
      
    req.app.get('socketio').emit('new_queue_entry', queueEntry);

    res.json({ success: true });
  } catch (err) { res.status(500).json({ msg: "Server Error" }); }
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
  hasRole('user'),
  async (req, res) => {
  try {
    const queueCheck = await Queue.findOne({ 
      user_id: req.user.user_id, 
      on_queue: true 
    });
    res.json({ onQueue: !!queueCheck }); 
  } catch (err) {
    res.status(500).json({ error: "Server error checking queue status" });
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