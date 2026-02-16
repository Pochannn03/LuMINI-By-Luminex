import { Router } from "express";
import { hasRole, isAuthenticated } from "../middleware/authMiddleware.js";
import { Student } from "../models/students.js"; 
import { Attendance } from "../models/attendances.js";

const router = Router();

// GET STUDENT ATTENDANCES
router.get('/api/attendance', 
  isAuthenticated, 
  hasRole('admin'), 
  async (req, res) => {
    const userId = req.user.user_id;
    const userRole = req.user.role;

    try {
      let query = {};

      if (userRole === 'Teacher') {
        const teacherSections = await Section.find({ user_id: userId });
        const sectionIds = teacherSections.map(sec => sec.section_id);
        query = { section_id: { $in: sectionIds } };
      }
      const records = await Attendance.find(query).sort({ created_at: -1 });
      
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
        const student = await Student.findOne({ student_id: studentId })
                                     .populate('section_details');
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
            section_id: student.section_id,
            section_name: student.section_details?.section_name || "N/A",
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