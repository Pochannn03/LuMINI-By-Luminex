import { Router } from "express";
import { hasRole, isAuthenticated } from "../middleware/authMiddleware.js";
import { AccessPass } from "../models/accessPass.js"; 
import { Student } from "../models/students.js"; 
import crypto from "crypto"; 

const router = Router();

// POST (PARENT / GUARDIAN QR GENERATION)
router.post('/api/pass/generate', 
  isAuthenticated,
  hasRole('user'),
  async (req, res) => {
    try {
      const purpose = req.body.purpose || 'pickup';
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

      const student = await Student.findOne({ 
        user_id: req.user.user_id 
      });

      const existingPass = await AccessPass.findOne({
        user: req.user._id,
        purpose: purpose,
        createdAt: { $gt: tenMinutesAgo } // $gt means "Greater Than" (newer than)
      });

      if (existingPass) {
        console.log("Restoring active pass for User:", req.user.user_id);
        return res.json({
          success: true,
          token: existingPass.token,
          createdAt: existingPass.createdAt,
          message: "Restored active pass"
        });
      }

      const fullName = `${req.user.first_name} ${req.user.last_name}`;
      const fullNameStud = `${student.first_name} ${student.last_name}`;

      const secretToken = crypto.randomBytes(16).toString('hex');
      const newPass = await AccessPass.create({
        user: req.user._id,
        user_id: req.user.user_id,
        user_name: fullName,
        token: secretToken,
        purpose: purpose,
        student_id: student.student_id,
        student_name: fullNameStud,
      });

      res.json({
        success: true,
        token: secretToken,
        createdAt: newPass.createdAt,
        message: "Generated new pass"
      });

    } catch (error) {
      console.error("Pass Gen Error:", error);
      res.status(500).json({ error: "Could not generate pass" });
    }
});

// GET INFORMATION OF SCANNED QR
router.get('/api/pass/scan/:token', 
  isAuthenticated,
  hasRole(['admin', 'superadmin']), 
  async (req, res) => {
    try {
      const { token } = req.params;

      const pass = await AccessPass.findOne({ token: token })
        .populate('user', 'first_name last_name profile_picture relationship') 
        .populate({
           path: 'student_details',
           select: 'first_name last_name profile_picture section_id',
           populate: { 
             path: 'section_details', 
             select: 'section_name' 
           } 
        });

      // 2. VALIDATION: DOES PASS EXIST?
      if (!pass) {
        return res.status(404).json({ 
            valid: false, 
            message: "Invalid or Missing Pass" 
        });
      }

      // 3. VALIDATION: IS PASS EXPIRED? (e.g., 10 Minute Limit)
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      if (pass.createdAt < tenMinutesAgo) {
         return res.status(400).json({ 
             valid: false, 
             message: "This pass has expired." 
         });
      }

      // 4. PREPARE DATA SAFEGUARDS
      // Handle cases where user or student might have been deleted
      const guardianData = pass.user || {};
      const studentData = pass.student_details || {};
      const sectionData = studentData.section_details || {};

      // 5. SEND RESPONSE
      res.json({
        valid: true,
        passId: pass._id,
        purpose: pass.purpose,
        timestamp: pass.createdAt,
        
        // Guardian Info (Mapped for Frontend Modal)
        guardian: {
          name: `${guardianData.first_name || 'Unknown'} ${guardianData.last_name || ''}`,
          photo: guardianData.profile_picture || null, 
          relation: guardianData.relationship || 'Guardian'
        },
        
        // Student Info (Mapped for Frontend Modal)
        student: {
          name: `${studentData.first_name || 'Unknown'} ${studentData.last_name || ''}`,
          photo: studentData.profile_picture || null,
          section: sectionData.section_name || "Not Assigned",
          studentId: pass.student_id
        }
      });

    } catch (error) {
      console.error("Scan Error:", error);
      res.status(500).json({ error: "Scan processing failed" });
    }
});

export default router;