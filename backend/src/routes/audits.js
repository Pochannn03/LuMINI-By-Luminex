import { Router } from "express";
import { isAuthenticated, hasRole } from '../middleware/authMiddleware.js';
import { Student } from '../models/students.js';
import { Section } from '../models/sections.js';
import { Audit } from '../models/audits.js';
import { User } from '../models/users.js';

const router = Router();

router.get('/api/audit', 
  isAuthenticated, 
  hasRole('superadmin'), 
  async (req, res) => {
    try {
      const { role, action, search, page = 1, limit = 5, startDate, endDate } = req.query;
      let query = {};
      const skipValue = (parseInt(page) - 1) * parseInt(limit);

      if (role && role !== 'All') query.role = role;
      if (action && action !== 'All') query.action = action;

      if (search) {
        query.$or = [
          { full_name: { $regex: search, $options: 'i' } },
          { target: { $regex: search, $options: 'i' } },
          { action: { $regex: search, $options: 'i' } }
        ];
      }

      if (startDate || endDate) {
        query.created_at = {};
        if (startDate) {
          const start = new Date(`${startDate}T00:00:00+08:00`);
          query.created_at.$gte = start;
        }
        if (endDate) {
          const end = new Date(`${endDate}T23:59:59.999+08:00`);
          query.created_at.$lte = end;
        }
      }
      
      const totalLogs = await Audit.countDocuments(query);
      const logs = await Audit.find(query)
                              .sort({ created_at: -1 }) 
                              .skip(skipValue)
                              .limit(parseInt(limit))
                              .lean();

      res.set('Access-Control-Expose-Headers', 'x-total-count');
      res.set('x-total-count', totalLogs.toString());
      res.status(200).json(logs);
    } catch (err) {
      console.error("Audit Fetch Error:", err);
      res.status(500).json({ message: "Failed to retrieve audit logs." });
    }
  }
);

export default router;