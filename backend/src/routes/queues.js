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

      let query = { on_queue: true };

      if (userRole === 'teacher') {
        const teacherSections = await Section.find({ user_id: currentUserId })
                                             .select('section_id');
        const sectionIds = teacherSections.map(s => s.section_id);
        
        // We need to find students in these sections first to filter the queue
        const studentsInSections = await Student.find({ section_id: { $in: sectionIds } })
                                                .select('student_id');
        const studentIds = studentsInSections.map(s => s.student_id);
        query.student_id = { $in: studentIds };
      }

      // 2. Fetch the Queue with full details
      const queue = await Queue.find(query)
                               .populate('user_details')
                               .populate('student_details')
                               .sort({ created_at: -1 });

      res.status(200).json({ success: true, queue });

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
    res.json({ onQueue: !!queueCheck }); // Returns true if found, false if not
  } catch (err) {
    res.status(500).json({ error: "Server error checking queue status" });
  }
});

export default router;