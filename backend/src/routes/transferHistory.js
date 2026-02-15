import { Router } from "express";
import { hasRole, isAuthenticated } from "../middleware/authMiddleware.js";
import { Transfer } from "../models/transfers.js"; 

const router = Router();

router.get('/api/transfer',
  isAuthenticated,
  hasRole('admin'),
  async (req, res) => {
    try {
        const history = await Transfer.find()
            .populate('student_details')
            .populate('user_details')
            .populate('section_details') // Add this!
            .sort({ created_at: -1 });
        
        res.json({ success: true, data: history });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

/// CONFIRM PICKUP/DROPOFF AUTHORIZATION
router.post('/api/transfer', 
  isAuthenticated, 
  hasRole('admin'), 
  async (req, res) => {
    const { studentId, guardianId, type, guardianName, studentName, sectionName, sectionId } = req.body;

    try {
        const formattedType = type.toLowerCase() === 'pickup' ? 'Pick up' : 'Drop off';

        const newTransfer = new Transfer({
            student_id: studentId,
            student_name: studentName,
            section_id: sectionId,
            section_name: sectionName,
            user_id: guardianId,
            user_name: guardianName,
            type: formattedType,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('en-US', { 
                hour: 'numeric', minute: '2-digit', hour12: true 
            }),
        });

        await newTransfer.save();
        res.json({ success: true, message: `Student successfully recorded for ${formattedType}!` });
        
    } catch (error) {
        console.error("❌ Transfer Save Error:", error.message);
        res.status(500).json({ error: "Failed to record transfer: " + error.message });
    }
});

export default router;