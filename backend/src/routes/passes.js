import { Router } from "express";
import { hasRole, isAuthenticated } from "../middleware/authMiddleware.js";
import { AccessPass } from "../models/accessPass.js"; 
import crypto from "crypto"; 

const router = Router();

// POST /api/pass/generate
router.post('/api/pass/generate', 
  isAuthenticated,
  hasRole('user'),
  async (req, res) => {
    try {
      const purpose = req.body.purpose || 'pickup';
      const secretToken = crypto.randomBytes(16).toString('hex');

      // 2. Create the pass in DB
      const newPass = await AccessPass.create({
        user: req.user._id,
        user_id: req.user.user_id,
        token: secretToken,
        purpose: purpose
      });

      res.json({
        success: true,
        token: secretToken,
        expiresIn: '5 minutes'
      });

    } catch (error) {
      res.status(500).json({ error: "Could not generate pass" });
    }
});

export default router;