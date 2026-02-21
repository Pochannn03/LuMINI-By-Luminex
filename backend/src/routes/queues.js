import { Router } from "express";
import { hasRole, isAuthenticated } from "../middleware/authMiddleware.js";
import { Transfer } from "../models/transfers.js"; 
import { Section } from "../models/sections.js"; 
import { Student } from "../models/students.js"
import { Queue } from "../models/queues.js";

const router = Router();

// POST /api/queue
router.post('/api/queue', 
  isAuthenticated, 
  hasRole('user'),
  async (req, res) => {
  const { student_id, section_id, status, purpose } = req.body;

  try {
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
      
      await Queue.findOneAndUpdate(
        { user_id: userId, on_queue: true }, 
        { on_queue: false }
      );

      req.app.get('socketio').emit('remove_queue_entry', Number(userId));

      res.json({ success: true, msg: "Removed from queue" });
    } catch (err) {
      res.status(500).json({ success: false, msg: "Server error" });
    }
});

export default router;