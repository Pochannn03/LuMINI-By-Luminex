import { Router } from "express";
import { hasRole, isAuthenticated } from "../middleware/authMiddleware.js";
// import { AccessPass } from "../models/accessPass.js"; 
import { Student } from "../models/students.js"; 
import { Attendance } from "../models/attendances.js";
// import { Transfer } from "../models/transfers.js";
// import crypto from "crypto"; 

const router = Router();

// GET STUDENT ATTENDANCES
router.get('/api/attendance', 
  isAuthenticated, 
  hasRole('admin'), 
  async (req, res) => {
    try {
      // Fetch all records for now (you can filter by date later)
      const records = await Attendance.find().sort({ created_at: -1 });
      
      res.json({
        success: true,
        data: records
      });
    } catch (error) {
      console.error("Attendance Fetch Error:", error);
      res.status(500).json({ success: false, message: "Server Error" });
    }
});

// STUDENT SCANNED QR ATTENDANCE AND RECORD
router.post('/api/attendance', 
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