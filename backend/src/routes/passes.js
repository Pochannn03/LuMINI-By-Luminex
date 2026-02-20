import { Router } from "express";
import { hasRole, isAuthenticated } from "../middleware/authMiddleware.js";
import { AccessPass } from "../models/accessPass.js"; 
import { Student } from "../models/students.js"; 
import { Attendance } from "../models/attendances.js";
import { Transfer } from "../models/transfers.js";
import crypto from "crypto"; 

const router = Router();

// QR PASS CREATION OF PARENT/GUARDIAN SCANNING THE QR SCHOOL GATE
router.post('/api/pass/generate', 
  isAuthenticated,
  hasRole('user'),
  async (req, res) => {
    try {
      const todayDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

      const student = await Student.findOne({ 
        user_id: req.user.user_id 
      });
      if (!student) return res.status(404).json({ error: "Student not found" });

      const existingTransfer = await Transfer.findOne({
          student_id: student.student_id,
          date: todayDate
      });

      const autoPurpose = existingTransfer ? 'Pick up' : 'Drop off';

      const existingPass = await AccessPass.findOne({
        user: req.user._id,
        purpose: autoPurpose,
        createdAt: { $gt: tenMinutesAgo } // $gt means "Greater Than" (newer than)
      });

      if (existingPass) {
        console.log("Restoring active pass for User:", req.user.user_id);
        return res.json({
          success: true,
          token: existingPass.token,
          createdAt: existingPass.createdAt,
          purpose: autoPurpose,
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
        purpose: autoPurpose,
        student_id: student.student_id,
        student_name: fullNameStud,
      });

      res.json({
        success: true,
        token: secretToken,
        purpose: autoPurpose,
        createdAt: newPass.createdAt,
        message: "Generated new pass"
      });

    } catch (error) {
      console.error("Pass Gen Error:", error);
      res.status(500).json({ error: "Could not generate pass" });
    }
});

// GET INFORMATION OF SCANNED QR
router.get('/api/scan/pass/:token', 
  isAuthenticated,
  hasRole('admin'), 
  async (req, res) => {
    try {
      const { token } = req.params;
      const todayDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

      const pass = await AccessPass.findOne({ token: token })
        .populate('user', 'user_id first_name last_name profile_picture relationship') 
        .populate({
           path: 'student_details',
           select: 'student_id first_name last_name profile_picture section_id',
           populate: { 
             path: 'section_details', 
             select: 'section_id section_name' 
           } 
        });

      if (!pass) {
        return res.status(404).json({ 
            valid: false, 
            message: "Invalid or Missing Pass" 
        });
      }

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
          userId: guardianData.user_id,
          name: `${guardianData.first_name || 'Unknown'} ${guardianData.last_name || ''}`,
          photo: guardianData.profile_picture || null, 
          relation: guardianData.relationship || 'Guardian'
        },
        
        // Student Info (Mapped for Frontend Modal)
        student: {
          name: `${studentData.first_name || 'Unknown'} ${studentData.last_name || ''}`,
          photo: studentData.profile_picture || null,
          sectionId: sectionData.section_id,
          sectionName: sectionData.section_name || "Not Assigned",
          studentId: pass.student_id
        }
      });

    } catch (error) {
      console.error("Scan Error:", error);
      res.status(500).json({ error: "Scan processing failed" });
    }
});

// STUDENT SCANNED QR ATTENDANCE AND RECORD
router.post('/api/scan/attendance', 
  isAuthenticated,
  hasRole('admin'),
  async (req, res) => {
    const { studentId } = req.body;
    
    try {
        const student = await Student.findOne({ student_id: studentId });
        if (!student) {
            return res.status(404).json({ msg: "Student not found" });
        }

        const now = new Date();
        const todayDate = now.toISOString().split('T')[0]; // "2026-02-13"
        const currentTimeString = now.toLocaleTimeString('en-US', { 
            hour: 'numeric', minute: '2-digit', hour12: true 
        });

        // 2. Check if student already scanned today
        const existingRecord = await Attendance.findOne({ 
            student_id: studentId, 
            date: todayDate 
        });

        if (existingRecord) {
            return res.status(400).json({ 
                msg: "Attendance already recorded for today",
                student: {
                    first_name: student.first_name,
                    last_name: student.last_name,
                    time_in: existingRecord.time_in
                }
            });
        }

        // 3. Determine Status (Example: Late if after 8:00 AM)
        let status = "Present";
        const hour = now.getHours();
        if (hour >= 8) { status = "Late"; }

        // 4. Create Attendance Record
        const newAttendance = new Attendance({
            student_id: student.student_id,
            student_name: `${student.first_name} ${student.last_name}`,
            status: status,
            date: todayDate,
            time_in: currentTimeString
        });

        await newAttendance.save();

        res.status(200).json({
            msg: `Attendance marked as ${status}`,
            student: {
                first_name: student.first_name,
                last_name: student.last_name,
                student_id: student.student_id,
                profile_picture: student.profile_picture,
                status: status,
                time_in: currentTimeString
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Server Error" });
    }
});


export default router;