import { Router } from "express";
import { validationResult, matchedData, checkSchema} from "express-validator";
import { isAuthenticated, hasRole } from '../middleware/authMiddleware.js';
import { User } from "../models/users.js";
import { Audit } from "../models/audits.js";
import { Feedback } from "../models/feedback.js";

const router = Router();


router.get('/api/feedback/stats', 
  isAuthenticated,
  hasRole('superadmin'),
  async (req, res) => {
    try {
      const total = await Feedback.countDocuments();
      const positive = await Feedback.countDocuments({ rating: 1 }); 
      const negative = await Feedback.countDocuments({ rating: 0 });

      res.status(200).json({ 
        success: true, 
        total,
        positive,
        negative,
        satisfactionRate: total > 0 ? Math.round((positive / total) * 100) : 0
      });
    } catch (err) {
      console.error("Error fetching feedback stats:", err);
      res.status(500).json({ msg: "Server error" });
    }
});

router.post('/api/feedback',
  isAuthenticated,
  hasRole('user'), 
  async (req, res) => {
    const { remark, rating } = req.body; 
    const parentId = req.user.user_id; 
    const fullName = `${req.user.first_name} ${req.user.last_name}`;

    try {
      if (!rating) {
        return res.status(400).json({ error: "Satisfaction rating is required." });
      }

      const ratingValue = rating === 'up' ? 1 : 0;

      const newFeedback = new Feedback({
        user_id: parentId,
        full_name: fullName,
        remark: remark || "", 
        rating: ratingValue
      });

      await newFeedback.save();

      const auditLog = new Audit({
        user_id: parentId,
        full_name: fullName,
        role: req.user.role,
        action: "Submit Feedback",
        target: `Rating: ${ratingValue === 1 ? 'Thumbs Up' : 'Thumbs Down'}`
      });
      await auditLog.save();

      return res.status(201).json({ 
        success: true, 
        message: "Thank you for your feedback!" 
      });
      
    } catch (error) {
      console.error("❌ Feedback Submission Error:", error.message);
      return res.status(500).json({ error: "Failed to submit feedback." });
    }
  }
);

export default router;