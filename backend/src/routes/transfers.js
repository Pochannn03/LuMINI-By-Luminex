import { Router } from "express";
import { hasRole, isAuthenticated } from "../middleware/authMiddleware.js";
import { Transfer } from "../models/transfers.js"; 
import { Section } from "../models/sections.js"; 
import { Student } from "../models/students.js"
import { Queue } from "../models/queues.js";
import { AccessPass } from "../models/accessPass.js"

const router = Router();

// GETT THE PICK UP AND DROP OFF HISTORY (TEACHER)
router.get('/api/transfer',
  isAuthenticated,
  hasRole('admin'),
  async (req, res) => {

    try {
      const { date } = req.query;
      const currentUserId = Number(req.user.user_id);
      const userRole = req.user.relationship?.toLowerCase();
      let query = {};

      if (date) {
        query.date = date;
      }

      if (userRole === 'teacher') {
        const teacherSections = await Section.find({ user_id: currentUserId })
                                             .select('section_id');
        const sectionIds = teacherSections.map(s => s.section_id);
        query.section_id = { $in: sectionIds };
      }

      const history = await Transfer.find(query) 
                                    .populate('student_details')
                                    .populate('user_details')
                                    .populate('section_details')
                                    .sort({ created_at: -1 });
        
      res.json({ success: true, data: history });

    } catch (err) {
      console.error("Transfer Fetch Error:", err);
      res.status(500).json({ success: false });
    }
});

// GETT THE PICK UP AND DROP OFF HISTORY (PARENT)
router.get('/api/transfer/parent',
  isAuthenticated,
  hasRole('user'),
  async (req, res) => {
    try {
      const currentUserId = Number(req.user.user_id); 
      const query = { user_id: currentUserId };

      const history = await Transfer.find(query) 
                                    .populate('student_details')
                                    .populate('user_details')
                                    .populate('section_details')
                                    .sort({ created_at: -1 });
        
      res.json({ success: true, data: history });

    } catch (err) {
      console.error("Parent Transfer Fetch Error:", err);
      res.status(500).json({ success: false, error: "Failed to fetch your history" });
    }
});

/// CONFIRM PICKUP/DROPOFF AUTHORIZATION
router.post('/api/transfer', 
  isAuthenticated, 
  hasRole('admin'), 
  async (req, res) => {
    const { studentId, guardianId, guardianName, studentName, sectionName, sectionId, purpose, token } = req.body;
    const currentUserId = Number(req.user.user_id); 
    const userRole = req.user.relationship?.toLowerCase();

    try {
        const pass = await AccessPass.findOne({ 
            token: token, 
            isUsed: false 
        });

        if (!pass) {
            return res.status(400).json({ 
                error: "This pass has already been used or has timed out." 
            });
        }

      if (userRole === 'teacher') {
          const isAuthorized = await Section.findOne({ 
              section_id: Number(sectionId), 
              user_id: currentUserId 
          });
          if (!isAuthorized) {
              return res.status(403).json({ error: "Unauthorized Not your assigned Student." });
          }
      }

      const queueCheck = await Queue.findOne({
          user_id: guardianId,
          student_id: studentId,
          on_queue: true
      });

      if (!queueCheck) {
          return res.status(400).json({ 
              error: "Guardian has not initiated arrival status (Not on Queue)." 
          });
      }

      const todayDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

      const duplicateCheck = await Transfer.findOne({
          student_id: studentId,
          date: todayDate,
          purpose: purpose
      });

      if (duplicateCheck) {
          return res.status(400).json({ 
              error: `Duplicate Entry: This student has already been recorded for ${purpose} today.` 
          });
      }

      const newTransfer = new Transfer({
          student_id: studentId,
          student_name: studentName,
          section_id: sectionId,
          section_name: sectionName,
          user_id: guardianId,
          user_name: guardianName,
          purpose: purpose,
          date: todayDate,
          time: new Date().toLocaleTimeString('en-US', { 
              hour: 'numeric', minute: '2-digit', hour12: true 
          }),
      });

      await newTransfer.save();

      await AccessPass.findOneAndUpdate(
            { token: token },
            { isUsed: true }
        );

      const newStatus = purpose === 'Drop off' ? 'Learning' : 'Dismissed';

      await Student.findOneAndUpdate(
          { student_id: studentId },
          { status: newStatus },
          { new: true }
      );

      await Queue.findOneAndUpdate(
          { user_id: Number(guardianId), student_id: studentId },
          { on_queue: false }
      );

      req.app.get('socketio').emit('remove_queue_entry', Number(guardianId));
      req.app.get('socketio').emit('student_status_updated', {
            student_id: studentId,
            newStatus: newStatus
        });
      
      return res.status(200).json({ 
            success: true,
            message: {
                text: `${studentName} successfully recorded!`,
                purpose: purpose // This allows you to do response.data.message.purpose
            },
            studentName,
            guardianName
        });
        
    } catch (error) {
        console.error("❌ Transfer Error:", error.message);
        return res.status(500).json({ error: "Failed to record transfer: " + error.message });
    }
});

export default router;