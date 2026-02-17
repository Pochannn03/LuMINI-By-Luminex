import { Router } from "express";
import { hasRole, isAuthenticated } from "../middleware/authMiddleware.js";
import { Student } from "../models/students.js";
import { Section } from "../models/sections.js";
import { Attendance } from "../models/attendances.js";

const router = Router();

const ensureDailyAttendance = async () => {
  const todayDate = new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Manila'
  });

  const exists = await Attendance.exists({ date: todayDate });
  if (exists) return; 

  const allStudents = await Student.find({ is_archive: false }).populate('section_details');

  const placeholders = allStudents
    .filter(student => student.section_id)
    .map(student => ({
      student_id: student.student_id,
      student_name: `${student.first_name} ${student.last_name}`,
      section_id: student.section_id,
      section_name: student.section_details?.section_name || "Unassigned",
      status: "Absent",
      date: todayDate,
      time_in: "---"
    }));

  if (placeholders.length > 0) {
    await Attendance.insertMany(placeholders);
    console.log(`✅ ${todayDate}: Pre-filled ${placeholders.length} students as Absent.`);
  }
};


// GET STUDENT ATTENDANCES
router.get('/api/attendance', 
  isAuthenticated, 
  hasRole('admin'), 
  async (req, res) => {
    try {
      await ensureDailyAttendance();
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
router.patch('/api/attendance', 
  isAuthenticated, 
  hasRole('admin'), 
  async (req, res) => {
    const { studentId } = req.body;
    const currentUserId = Number(req.user.user_id);
    const userRole = req.user.relationship?.toLowerCase();
    const now = new Date();
    const todayDate = now.toLocaleDateString('en-CA');
    
    try {
      const student = await Student.findOne({ student_id: studentId })
                                   .populate('section_details');
      if (!student) return res.status(404).json({ msg: "Student not found" });

      if (userRole === 'teacher') {
        const isAuthorized = await Section.findOne({ 
          section_id: student.section_id, 
          user_id: currentUserId 
        });

        if (!isAuthorized) {
          return res.status(403).json({ 
            msg: `Unauthorized: You are not the assigned teacher for ${student.section_details?.section_name || 'this section'}.` 
          });
        }
      }

      const schedule = student.section_details?.class_schedule;
      const isMorning = schedule?.includes("Morning");

      let startHr = isMorning ? 8 : 13;
      let endHr = isMorning ? 11 : 16;
      let endMin = 30;

      // Create PH-based time comparison
      const phNow = new Date(
        now.toLocaleString("en-US", { timeZone: "Asia/Manila" })
      );

      const lateTime = new Date(phNow);
      lateTime.setHours(startHr, 15, 0, 0);

      let status = "Present";

      if (phNow.getTime() > lateTime.getTime()) {
        status = "Late";
      }

      const currentTimeString = phNow.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      const updated = await Attendance.findOneAndUpdate(
        { student_id: studentId, date: todayDate },
        { status, time_in: currentTimeString },
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({ msg: "Attendance record not found for today" });
      }

      res.status(200).json({ msg: `Marked as ${status}`, student: updated });
    } catch (err) {
        console.error("Update Error:", err);
        res.status(500).json({ msg: "Server Error" });
    }
});


export default router;