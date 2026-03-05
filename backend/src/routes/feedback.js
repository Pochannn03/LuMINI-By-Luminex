import { Router } from "express";
import { validationResult, matchedData, checkSchema} from "express-validator";
import { isAuthenticated, hasRole } from '../middleware/authMiddleware.js';
import { User } from "../models/users.js";
import { Audit } from "../models/audits.js";
import { Feedback } from "../models/feedback.js";

const router = Router();

function formatRelativeTime(date) {
  const now = new Date();
  const diff = Math.floor((now - new Date(date)) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(date).toLocaleDateString();
}

router.get('/api/feedback',
  isAuthenticated,
  hasRole('superadmin'),
  async (req, res) => {
    try {
      // Fetch feedbacks and populate the virtual 'user_details'
      // We sort by 'created_at' descending (-1) to get newest first
      const feedbacks = await Feedback.find()
        .populate('user_details', 'first_name last_name profile_picture') 
        .sort({ created_at: -1 })
        .limit(50); // Optional: limit to last 50 entries

      // Format the data for your frontend card
      const formattedFeedbacks = feedbacks.map(fb => ({
        _id: fb._id,
        // If full_name was saved directly, use it; otherwise use populated details
        user_name: fb.full_name || 
                   (fb.user_details ? `${fb.user_details.first_name} ${fb.user_details.last_name}` : "Unknown User"),
        remark: fb.remark,
        rating: fb.rating === 1 ? 'up' : 'down',
        time: formatRelativeTime(fb.created_at), // Helper for "2 hours ago" etc.
        created_at: fb.created_at
      }));

      res.status(200).json({
        success: true,
        feedbacks: formattedFeedbacks
      });
    } catch (error) {
      console.error("Error fetching feedbacks:", error);
      res.status(500).json({ 
        success: false, 
        error: "Internal Server Error" 
      });
    }
  }
);

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

      const io = req.app.get('socketio'); 
      if (io) {
        io.emit('new_feedback', {
          _id: newFeedback._id,
          user_name: fullName,
          remark: newFeedback.remark,
          rating: rating, 
          created_at: newFeedback.created_at,
          time: "Just now"
        });
      }

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