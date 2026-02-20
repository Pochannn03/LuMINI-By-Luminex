import { Router } from "express";
import { hasRole, isAuthenticated } from "../middleware/authMiddleware.js";
import { Student } from "../models/students.js";
import { Section } from "../models/sections.js";
import { Attendance } from "../models/attendances.js";

const router = Router();

// GET STUDENT ATTENDANCES
router.get('/api/attendance', 
  isAuthenticated, 
  hasRole('admin'), 
  async (req, res) => {
    try {
      const selectedDate = req.query.date;
      const dateToUse = req.query.date || new Date().toLocaleDateString('en-CA');
      const currentUserId = Number(req.user.user_id);
      const userRole = req.user.relationship;

      let teacherSections = [];
      let query = {};

      if (userRole === 'teacher' || userRole === 'Teacher') {
        teacherSections = await Section.find({ user_id: currentUserId });
        if (teacherSections.length > 0) {
          const sectionIds = teacherSections.map(sec => sec.section_id);
          query = { section_id: { $in: sectionIds } };
        } else {
          return res.json({ success: true, data: [], sections: [] });
        }
      } else if (userRole === 'superadmin') {
        teacherSections = await Section.find({}); 
      }

      const todayDate = new Date().toISOString().split('T')[0];
      const records = await Attendance.find({  ...query, date: dateToUse  })
                                      .sort({ created_at: -1 });
      
      res.json({
        success: true,
        data: records,
        sections: teacherSections
      });
    } catch (error) {
      console.error("Attendance Fetch Error:", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

// STUDENT SCANNED QR ATTENDANCE AND RECORD
router.post('/api/attendance', 
    isAuthenticated, 
    hasRole('admin'), 
    async (req, res) => {
    const { studentId } = req.body;
    
    const now = new Date();
    const todayDate = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    
    try {
        const student = await Student.findOne({ student_id: studentId }).populate('section_details');
        
        if (!student) {
            return res.status(404).json({ msg: "Student not found in system" });
        }

        if (userRole === 'teacher') {
            const isAuthorized = await Section.findOne({ 
                section_id: student.section_id, 
                user_id: currentUserId 
            });

            if (!isAuthorized) {
                return res.status(403).json({ 
                    msg: "Access Denied: This student belongs to another section/teacher." 
                });
            }
        }

        const exists = await Attendance.exists({ 
            date: todayDate, 
            section_id: student.section_id
        });
        
        if (!exists) {
            const sectionStudents = await Student.find({ 
                is_archive: false, 
                section_id: student.section_id 
            }).populate('section_details');

            const placeholders = sectionStudents.map(s => ({
                student_id: s.student_id,
                student_name: `${s.first_name} ${s.last_name}`,
                section_id: s.section_id,
                section_name: s.section_details?.section_name || "Unassigned",
                status: "Absent",
                date: todayDate,
                time_in: "---"
            }));

            if (placeholders.length > 0) {
                await Attendance.insertMany(placeholders, { ordered: false });
            }
        }

        // 3. Time calculation
        const phNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
        const isMorning = student.section_details?.class_schedule?.includes("Morning");
        const startHr = isMorning ? 8 : 13;
        const lateTime = new Date(phNow);
        lateTime.setHours(startHr, 15, 0, 0);

        let status = phNow.getTime() > lateTime.getTime() ? "Late" : "Present";
        const currentTimeString = phNow.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
        });

        const updated = await Attendance.findOneAndUpdate(
            { student_id: studentId, date: todayDate },
            { 
                status, 
                time_in: currentTimeString,
                $setOnInsert: {
                    student_name: `${student.first_name} ${student.last_name}`,
                    section_id: student.section_id,
                    section_name: student.section_details?.section_name || "Unassigned",
                    date: todayDate
                }
            },
            { new: true, upsert: true }
        ).populate('student_details').lean();

        const finalData = {
            ...updated,
            full_name: updated.student_details 
                ? `${updated.student_details.first_name} ${updated.student_details.last_name}` 
                : updated.student_name
        };

        res.status(200).json({ 
            msg: `Marked as ${status}`, 
            student: finalData 
        });

    } catch (err) {
        console.error("Attendance Error:", err);
        res.status(500).json({ msg: "Server Error" });
    }
});

export default router;