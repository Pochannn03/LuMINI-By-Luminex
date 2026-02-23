import { Router } from "express";
import { validationResult, matchedData, checkSchema} from "express-validator";
import { isAuthenticated, hasRole } from '../middleware/authMiddleware.js';
import { User } from "../models/users.js";
import { Feedback } from "../models/feedback.js";

const router = Router();

// routes/feedback.js

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
        target: `Rating: ${ratingValue === 'up' ? 'Thumbs Up' : 'Thumbs Down'}`
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