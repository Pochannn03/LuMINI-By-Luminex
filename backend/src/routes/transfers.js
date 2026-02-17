import { Router } from "express";
import { hasRole, isAuthenticated } from "../middleware/authMiddleware.js";
import { Transfer } from "../models/transfers.js"; 
import { Section } from "../models/sections.js"; 


const router = Router();

router.get('/api/transfer',
  isAuthenticated,
  hasRole('admin'),
  async (req, res) => {

    try {
      const { date } = req.query;
      let query = {};

      if (date) {
        query.date = date;
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

/// CONFIRM PICKUP/DROPOFF AUTHORIZATION
router.post('/api/transfer', 
  isAuthenticated, 
  hasRole('admin'), 
  async (req, res) => {
    const { studentId, guardianId, guardianName, studentName, sectionName, sectionId } = req.body;
    const currentUserId = Number(req.user.user_id); 
    const userRole = req.user.relationship?.toLowerCase();

    try {
        // Section Validation: Only allow assigned teacher
        if (userRole === 'teacher') {
            const isAuthorized = await Section.findOne({ 
                section_id: Number(sectionId), 
                user_id: currentUserId 
            });
            if (!isAuthorized) {
                return res.status(403).json({ error: "Unauthorized: Not your assigned section." });
            }
        }

        const todayDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

        const newTransfer = new Transfer({
            student_id: studentId,
            student_name: studentName,
            section_id: sectionId,
            section_name: sectionName,
            user_id: guardianId,
            user_name: guardianName,
            purpose: req.body.purpose,
            date: todayDate,
            time: new Date().toLocaleTimeString('en-US', { 
                hour: 'numeric', minute: '2-digit', hour12: true 
            }),
        });

        await newTransfer.save();
        return res.status(200).json({ 
            success: true, 
            message: `${studentName} successfully recorded for ${purpose}!` 
        });
        
    } catch (error) {
        console.error("❌ Transfer Error:", error.message);
        return res.status(500).json({ error: "Failed to record transfer: " + error.message });
    }
});

export default router;