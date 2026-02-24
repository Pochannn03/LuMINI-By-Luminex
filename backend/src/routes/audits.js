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
      const { role, action, search, page = 1, limit = 10 } = req.query;
      let query = {};
      const skipValue = (parseInt(page) - 1) * parseInt(limit);

      // Filter by Role
      if (role && role !== 'All') {
        query.role = role;
      }

      // Filter by Action/Status (if you store status in your Audit model)
      if (action && action !== 'All') {
        query.action = action;
      }

      // Search functionality (Searches name or target)
      if (search) {
        query.$or = [
          { full_name: { $regex: search, $options: 'i' } },
          { target: { $regex: search, $options: 'i' } },
          { action: { $regex: search, $options: 'i' } }
        ];
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