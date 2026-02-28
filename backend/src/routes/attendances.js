import { Router } from "express";
import { hasRole, isAuthenticated } from "../middleware/authMiddleware.js";
import { Student } from "../models/students.js";
import { Section } from "../models/sections.js";
import { Attendance } from "../models/attendances.js";
import { Audit } from "../models/audits.js";
import { Transfer } from "../models/transfers.js";
import { Queue } from "../models/queues.js";

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
      
      // --- FIX 2: ADDED POPULATE TO GET THE PROFILE PICTURE ---
      const records = await Attendance.find({  ...query, date: dateToUse  })
                                      .populate('student_details') 
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

router.get('/api/attendance/weekly-stats', 
  isAuthenticated, 
  hasRole('superadmin'), 
  async (req, res) => {
    try {
      const stats = [];
      const daysToTrack = ["Mon", "Tue", "Wed", "Thu", "Fri"];
      const now = new Date();
      const currentDay = now.getDay(); 
      const diffToMonday = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diffToMonday));

      for (let i = 0; i < 5; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        
        const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
        const dayName = daysToTrack[i];

        // LOGIC: Count both 'Present' AND 'Late' as part of the bar height
        const presentCount = await Attendance.countDocuments({ 
          date: dateStr, 
          status: { $in: ['Present', 'Late'] } 
        });

        const totalCount = await Attendance.countDocuments({ date: dateStr });
        const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

        stats.push({
          day: dayName,
          present: percentage,
          isToday: dateStr === new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
        });
      }

      res.json({ success: true, data: stats });
    } catch (error) {
      console.error("Weekly Stats Error:", error);
      res.status(500).json({ success: false });
    }
});

// STUDENT SCANNED QR ATTENDANCE AND RECORD
router.post('/api/attendance', 
    isAuthenticated, 
    hasRole('admin'), 
    async (req, res) => {
    const { studentId } = req.body;
    const currentUserId = Number(req.user.user_id); 
    const userRole = req.user.relationship?.toLowerCase()
    const now = new Date();
    const todayDate = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    const fullName = `${req.user.first_name} ${req.user.last_name}`;
    const userRoleSys = req.user.role;

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
                    msg: "This student belongs to another section/teacher." 
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

        if (student && student.user_id) {
            const recipientIds = Array.isArray(student.user_id) 
                ? student.user_id 
                : [student.user_id];

            const notificationPromises = recipientIds.map(async (id) => {
                const notification = new Notification({
                    recipient_id: Number(id),
                    sender_id: currentUserId, 
                    type: 'Attendance',
                    title: 'Attendance Recorded',
                    message: `${student.first_name} ${student.last_name} has been marked ${status} at ${currentTimeString}.`,
                    is_read: false
                });

                const savedNotif = await notification.save();
                req.app.get('socketio').emit('new_notification', savedNotif);
                
                return savedNotif;
            });

            await Promise.all(notificationPromises);
        }

        const existingTransfer = await Transfer.exists({
            student_id: studentId,
            date: todayDate,
            purpose: 'Drop off'
        });

        if (!existingTransfer) {
            const queueEntry = await Queue.findOne({ 
                student_id: studentId, 
                purpose: 'Drop off', 
                on_queue: true 
            }).populate('user_details');

            let transferData = {
                student_id: studentId,
                student_name: `${student.first_name} ${student.last_name}`,
                section_id: student.section_id,
                section_name: student.section_details?.section_name || "Unassigned",
                purpose: 'Drop off',
                time: currentTimeString,
                date: todayDate
            };

            if (queueEntry && queueEntry.user_details && queueEntry.user_details.length > 0) {
                const parent = queueEntry.user_details[0];
                transferData.user_id = parent.user_id;
                transferData.user_name = `${parent.first_name} ${parent.last_name}`;

                await Queue.findOneAndUpdate({ _id: queueEntry._id }, { on_queue: false });
                req.app.get('socketio').emit('remove_queue_entry', parent.user_id);
            } else {
                transferData.user_id = 0; 
                transferData.user_name = "Unattended"; 
            }

            const newTransfer = new Transfer(transferData);
            await newTransfer.save();

            await Student.findOneAndUpdate(
                { student_id: studentId },
                { status: "Learning" }
            );

            req.app.get('socketio').emit('student_status_updated', { 
                student_id: studentId,
                newStatus: "Learning",
                purpose: "Drop off" 
            });
            
            const auditData = {
                user_id: currentUserId,
                full_name: fullName,
                role: userRoleSys,
                target: `Student: ${transferData.student_name}`
            };

            if (transferData.user_id === 0) {
                auditData.action = "Unattended Drop-off";
            } else {
                auditData.action = "Drop-off ";
                auditData.target += ` Drop off By ${transferData.user_name}`;
            }

            const auditLog = new Audit(auditData);
            await auditLog.save();
        }

        const studentFullName = `${student.first_name} ${student.last_name}`;
        const auditLog = new Audit({
            user_id: currentUserId,
            full_name: fullName,
            role: userRoleSys,
            action: `Scanned Attendance (${status})`,
            target: `Student: ${studentFullName} (ID: ${studentId})`
        });
        await auditLog.save();

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

router.post('/api/attendance/absence', 
    isAuthenticated,
    hasRole('user'),
    async (req, res) => {
        try {
            const { reason, details } = req.body;
            const parentId = Number(req.user.user_id);
            const fullName = `${req.user.first_name} ${req.user.last_name}`;
            const todayDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

            const students = await Student.find({ user_id: parentId, is_archive: false })
                                          .populate('section_details');

            if (!students || students.length === 0) {
                return res.status(404).json({ error: "No students linked to your account found." });
            }

            const newStatus = "Dismissed";

            for (const student of students) {
                await Attendance.findOneAndUpdate(
                    { 
                        student_id: student.student_id, 
                        date: todayDate 
                    },
                    { 
                        status: 'Absent',
                        details: `Parent Note: ${details || 'No additional info'}`,
                        $setOnInsert: {
                            student_name: `${student.first_name} ${student.last_name}`,
                            section_id: student.section_id,
                            section_name: student.section_details?.section_name || "Unassigned",
                            date: todayDate,
                            time_in: "---"
                        }
                    },
                    { upsert: true, new: true }
                );

                await Student.findOneAndUpdate(
                    { student_id: student.student_id },
                    { status: newStatus }
                );

                const auditLog = new Audit({
                    user_id: parentId,
                    full_name: fullName,
                    role: req.user.role,
                    action: `Reported Absence`,
                    target: `Student: ${student.first_name} ${student.last_name}`
                });
                await auditLog.save();

                req.app.get('socketio').emit('student_status_updated', { 
                    student_id: student.student_id,
                    newStatus: newStatus,
                    purpose: 'Absence' 
                });
            }

            res.status(200).json({ success: true, msg: "Absence reported successfully." });

        } catch (err) {
            console.error("Absence Report Error:", err);
            res.status(500).json({ error: "Failed to submit absence report." });
        }
    }
);

export default router;