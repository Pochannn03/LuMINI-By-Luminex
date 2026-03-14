import { Router } from "express";
import { hasRole, isAuthenticated } from "../middleware/authMiddleware.js";
import { Transfer } from "../models/transfers.js"; 
import { Section } from "../models/sections.js"; 
import { Student } from "../models/students.js"
import { User } from "../models/users.js";
import { Audit } from "../models/audits.js";
import { Queue } from "../models/queues.js";
import { AccessPass } from "../models/accessPass.js"
import { Override } from '../models/manualTransfers.js';
import { Notification } from '../models/notification.js';
import { io } from '../index.js';
import cron from 'node-cron'; 
import multer from 'multer';
import path from 'path';
import fs from "fs";

// --- Import SMS Utility ---
import { sendIprogBulkSMS } from "../utils/smsProvider.js"; // ADJUST THIS PATH TO WHEREVER YOUR UTILITY IS LOCATED!

const router = Router();

const uploadDir = 'uploads/override';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); 
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'student-' + uniqueSuffix + path.extname(file.originalname)); 
  }
});

const upload = multer({ storage: storage });

// GET THE PICK UP AND DROP OFF HISTORY (TEACHER)
router.get('/api/transfer',
  isAuthenticated,
  hasRole('admin'),
  async (req, res) => {

    try {
      const { date } = req.query;
      const currentUserId = Number(req.user.user_id);
      const userRole = req.user.relationship?.toLowerCase();
      let query = {};

      if (date) {
        query.date = date;
      }

      if (userRole === 'teacher') {
        const teacherSections = await Section.find({ user_id: currentUserId })
                                             .select('section_id');
        const sectionIds = teacherSections.map(s => s.section_id);
        query.section_id = { $in: sectionIds };
      }

      const history = await Transfer.find(query) 
                                    .populate('student_details')
                                    .populate('user_details')
                                    .populate('section_details')
                                    .sort({ created_at: -1 });
        
      res.json({ success: true, data: history });

    } catch (err) {
      console.error("Transfer Fetch Error:", err);
      res.status(500).json({ success: false });
    }
});

// GET THE PICK UP AND DROP OFF HISTORY (PARENT)
router.get('/api/transfer/parent',
  isAuthenticated,
  hasRole('user'),
  async (req, res) => {
    try {
      const { date, purpose } = req.query;
      const currentUserId = req.user.user_id; 
      const children = await Student.find({ user_id: currentUserId });

      if (!children || children.length === 0) {
        return res.json({ success: true, data: [], message: "No students linked to this parent account." });
      }

      const studentIdStrings = children.map(child => child.student_id);

      let query = { 
        student_id: { $in: studentIdStrings }
      };

      if (date) {
        query.date = date;
      }

      if (purpose && purpose !== "all") {
        query.purpose = { $regex: new RegExp(purpose, "i") };
      }

      const history = await Transfer.find(query)
        .populate('student_details')
        .populate('user_details')
        .populate('section_details')
        .sort({ created_at: -1 });

      res.json({ success: true, data: history });

    } catch (err) {
      console.error("CRITICAL ERROR:", err);
      res.status(500).json({ success: false, error: "Internal Server Error" });
    }
});

// FOR ANALLYTICS 
router.get('/api/transfers/today-count', 
  isAuthenticated,
  hasRole('superadmin'),
  async (req, res) => {
    try {
      // Correctly format today's date for Asia/Manila (YYYY-MM-DD)
      const manilaDate = new Date().toLocaleDateString('en-CA', {
        timeZone: 'Asia/Manila'
      }); 

      const count = await Transfer.countDocuments({ date: manilaDate });

      res.status(200).json({ 
        success: true, 
        count: count,
        dateRef: manilaDate 
      });
    } catch (err) {
      console.error("Error fetching Manila today count:", err);
      res.status(500).json({ success: false });
    }
});

/// CONFIRM PICKUP/DROPOFF AUTHORIZATION
router.post('/api/transfer', 
  isAuthenticated, 
  hasRole('admin'), 
  async (req, res) => {
    const { studentId, guardianId, guardianName, studentName, sectionName, sectionId, purpose, token } = req.body;
    const currentUserId = Number(req.user.user_id); 
    const userRole = req.user.relationship?.toLowerCase();

    try {
        const pass = await AccessPass.findOne({ 
            token: token, 
            isUsed: false 
        });

        if (!pass) {
            return res.status(400).json({ 
                error: "This pass has already been used or has timed out." 
            });
        }

      if (userRole === 'teacher') {
          const isAuthorized = await Section.findOne({ 
              section_id: Number(sectionId), 
              user_id: currentUserId 
          });
          if (!isAuthorized) {
              return res.status(403).json({ error: "Unauthorized Not your assigned Student." });
          }
      }

      const queueCheck = await Queue.findOne({
          user_id: guardianId,
          student_id: studentId,
          on_queue: true
      });

      if (!queueCheck) {
          return res.status(400).json({ 
              error: "Guardian has not initiated arrival status (Not on Queue)." 
          });
      }

      const todayDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
      const currentTime = new Date().toLocaleTimeString('en-US', { 
            timeZone: 'Asia/Manila',
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
          });

      const duplicateCheck = await Transfer.findOne({
          student_id: studentId,
          date: todayDate,
          purpose: purpose
      });

      if (duplicateCheck) {
          return res.status(400).json({ 
              error: `Duplicate Entry: This student has already been recorded for ${purpose} today.` 
          });
      }

      const newTransfer = new Transfer({
          student_id: studentId,
          student_name: studentName,
          section_id: sectionId,
          section_name: sectionName,
          user_id: guardianId,
          user_name: guardianName,
          purpose: purpose,
          date: todayDate,
          time: currentTime,
      });

      await newTransfer.save();

      const studentDoc = await Student.findOne({ student_id: studentId });
      
      // ==========================================
      // IN-APP NOTIFICATION & SMS LOGIC
      // ==========================================
      if (studentDoc && studentDoc.user_id) {
        const recipientIds = Array.isArray(studentDoc.user_id) 
            ? studentDoc.user_id 
            : [studentDoc.user_id];

        // 1. Send In-App Notifications
        const notificationPromises = recipientIds.map(async (id) => {
            const notification = new Notification({
              recipient_id: Number(id), 
              sender_id: currentUserId,
              type: 'Transfer',
              title: `Student ${purpose} Successful`,
              message: `${studentName} has been ${purpose === 'Drop off' ? 'dropped off' : 'picked up'} by ${guardianName}.`,
              is_read: false
            });
            
            const savedNotif = await notification.save();
            req.app.get('socketio').to(`user_${id}`).emit('new_notification', savedNotif);
            return savedNotif;
        });

        await Promise.all(notificationPromises);

        // 2. Check if the person scanning is a Guardian, and send SMS to Parent(s)
        try {
            const scanActor = await User.findOne({ user_id: guardianId });
            
            // ---> THE FIX: Check relationship instead of role! <---
            if (scanActor && scanActor.relationship?.toLowerCase() === 'guardian') {
                // Fetch the actual Parent Users to get their phone numbers
                const parents = await User.find({ user_id: { $in: recipientIds } });
                
                const phoneNumbers = parents
                    .map(p => p.phone_number)
                    .filter(phone => phone && phone.startsWith("09") && phone.length === 11) // Basic validation
                    .join(",");

                if (phoneNumbers.length > 0) {
                    const smsMessage = `LuMINI Alert: ${studentName} has been successfully ${purpose === 'Drop off' ? 'dropped off' : 'picked up'} by ${guardianName} at ${currentTime}.`;
                    
                    // Dispatch the SMS silently in the background
                    sendIprogBulkSMS(phoneNumbers, smsMessage)
                        .then(() => console.log(`✅ SMS Alert sent to Parents for ${studentName}'s transfer.`))
                        .catch(err => console.error("❌ SMS Dispatch Failed:", err.message));
                }
            }
        } catch (smsError) {
            console.error("❌ Failed to process SMS logic:", smsError);
            // We don't want an SMS failure to stop the whole transfer process, so we just log it.
        }
    }

      await AccessPass.findOneAndUpdate(
            { token: token },
            { isUsed: true }
        );

      const newStatus = purpose === 'Drop off' ? 'Learning' : 'Dismissed';

      // ---> THE FIX: Correct Mongoose findOneAndUpdate syntax! <---
      await Student.findOneAndUpdate(
          { student_id: studentId },
          { 
            $set: {
                status: newStatus,
                last_reset_date: todayDate 
            }
          },
          { returnDocument: 'after' } // Clears the deprecation warning
      );

      await Queue.findOneAndUpdate(
          { user_id: Number(guardianId), student_id: studentId },
          { on_queue: false }
      );

      req.app.get('socketio').emit('remove_queue_entry', Number(guardianId));
      req.app.get('socketio').emit('student_status_updated', {
        student_id: studentId,
        newStatus: newStatus,
        purpose: purpose
      });

      const auditLog = new Audit({
        user_id: req.user.user_id,
        full_name: `${req.user.first_name} ${req.user.last_name}`,
        role: req.user.role,
        action: "Record Student Transfer",
        target: `${purpose} ${studentName} by ${guardianName}`
      });
      await auditLog.save();
      
      return res.status(200).json({ 
            success: true,
            message: {
                text: `Successfully Recorded!`,
                purpose: purpose 
            },
            studentName,
            guardianName
        });
        
    } catch (error) {
        console.error("❌ Transfer Error:", error.message);
        return res.status(500).json({ error: "Failed to record transfer: " + error.message });
    }
});

router.post('/api/transfer/override',
  isAuthenticated,
  hasRole('admin'), 
  upload.single('idPhoto'),
  async (req, res) => {
    try {
      const { studentId, purpose, isRegistered, guardianId, manualGuardianName } = req.body;
      const requestedBy = req.user.user_id;

      const studentDetails = await Student.findOne({ student_id: studentId });

      if (!studentDetails) {
        return res.status(404).json({ error: "Student not found." });
      }

      // ✅ Validate student status against purpose
      const purposeNormalized = purpose?.trim().toLowerCase();
      const statusNormalized = studentDetails.status?.trim().toLowerCase();

      if (purposeNormalized === 'pick up' && statusNormalized === 'dismissed') {
        return res.status(400).json({ error: "Student is already dismissed." });
      }

      if (purposeNormalized === 'pick up' && statusNormalized !== 'learning') {
        return res.status(400).json({ error: "Student has not been dropped off yet." });
      }

      if (purposeNormalized === 'drop off' && statusNormalized === 'learning') {
        return res.status(400).json({ error: "Student is already in school." });
      }

      if (purposeNormalized === 'drop off' && statusNormalized === 'dismissed') {
        return res.status(400).json({ error: "Student is already dismissed." });
      }

      const studentName = `${studentDetails.first_name} ${studentDetails.last_name}`

      let overrideData = {
        requested_by: requestedBy,
        student_id: studentId,
        purpose,
        is_registered_guardian: isRegistered === 'true'
      };

      if (isRegistered === 'true') {
        if (!guardianId) {
            return res.status(400).json({ error: "Guardian selection is required for registered path." });
        }

        const userDetail = await User.findOne({ user_id: guardianId });
        if (!userDetail) {
            return res.status(404).json({ error: "Registered guardian not found." });
        }

        overrideData.user_id = guardianId;
        overrideData.user_name = `${userDetail.first_name} ${userDetail.last_name}`;
        overrideData.is_approved = false
        overrideData.is_rejected = false
      } else {
        if (!manualGuardianName) {
            return res.status(400).json({ error: "Guest name is required." });
        }
        if (!req.file) {
            return res.status(400).json({ error: "ID photo evidence is required for guests." });
        }
        overrideData.user_name = manualGuardianName;
        overrideData.id_photo_evidence = req.file.path;
        overrideData.is_approved = false
        overrideData.is_rejected = false
      }

      const newOverride = new Override(overrideData);
      const savedOverride = await newOverride.save();

      const populatedOverride = await Override.findById(savedOverride._id)
        .populate('student_details')
        .populate('user_details') 
        .populate({
            path: 'requested_by',
            model: 'User',
            localField: 'requested_by',
            foreignField: 'user_id',
            justOne: true
        });

      const auditLog = new Audit({
        user_id: req.user.user_id,
        full_name: `${req.user.first_name} ${req.user.last_name}`,
        role: req.user.role,
        action: "Manual Process Override",
        target: `${purpose} for ${studentName} by ${isRegistered === 'true' ? `Registered Guardian` : `Guest: ${manualGuardianName}`}`
      });
      await auditLog.save();

      const io = req.app.get('socketio');
      if (io) {
        io.emit('new_override_request', populatedOverride); 
      }

      return res.status(201).json({ 
        success: true, 
        msg: "Emergency transfer recorded successfully.",
        data: newOverride 
      });

      } catch (err) {
        console.error("Override Error:", err);
        return res.status(500).json({ 
            error: "Internal server error. Failed to process override." 
        });
      }
    }
);

router.get('/api/transfer/override',
    isAuthenticated,
    hasRole('superadmin'),
    async (req, res) => {
      try {
        const pendingOverrides = await Override.find({ is_approved: false, is_rejected: false })
                                                .populate('student_details') 
                                                .populate('user_details')
                                                .populate('requester_details')
                                                .sort({ created_at: -1 });

        return res.status(200).json({
            success: true,
            count: pendingOverrides.length,
            overrides: pendingOverrides
        });

      } catch (err) {
          console.error("Fetch Overrides Error:", err);
          return res.status(500).json({ 
              error: "Failed to retrieve pending manual transfers." 
          });
      }
    }
);

router.get('/api/transfer/override/rejected',
    isAuthenticated,
    hasRole('superadmin'),
    async (req, res) => {
      try {
        const { search, role, page = 1, limit = 10 } = req.query;
        const query = { is_rejected: true };

        // 1. Search Logic (Student Name or Guardian Name)
        if (search) {
          query.$or = [
            { user_name: { $regex: search, $options: 'i' } },
            { student_name: { $regex: search, $options: 'i' } }
          ];
        }

        if (role && role !== "All") {
          // If role is provided, we filter the user_details link
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Override.countDocuments(query);
        
        const overrides = await Override.find(query)
          .populate({
            path: 'student_details',
            populate: { path: 'section_details' }
          })
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(parseInt(limit));

        res.setHeader('x-total-count', total);
        return res.status(200).json({
            success: true,
            overrides
        });

      } catch (err) {
          console.error("Fetch Rejected Error:", err);
          return res.status(500).json({ error: "Server error" });
      }
    }
);

router.patch('/api/transfer/override/:id/approve',
  isAuthenticated,
  hasRole('superadmin'),
  async (req, res) => {
    try {
      const ovr = await Override.findById(req.params.id)
                                 .populate({
                                  path: 'student_details',
                                  populate: { 
                                    path: 'section_details' 
                                  } 
                                })
                                 .populate('user_details');

      if (!ovr) return res.status(404).json({ error: "Record not found." });
      if (ovr.is_approved) return res.status(400).json({ error: "Already approved." });
      const student = await Student.findOne({ student_id: ovr.student_id });

      if (!student) return res.status(404).json({ error: "Student not found." });

      if (ovr.purpose === 'Pick up' && student.status === 'Dismissed') {
        return res.status(400).json({ error: "Student is already dismissed." });
      }

      if (ovr.purpose === 'Drop off' && student.status === 'Learning') {
        return res.status(400).json({ error: "Student is already in school." });
      }

      const requestDate = new Date(ovr.created_at);
      
      const formattedTime = requestDate.toLocaleTimeString('en-US', { 
        timeZone: 'Asia/Manila',
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });

      const formattedDate = requestDate.toLocaleDateString('en-CA', { 
        timeZone: 'Asia/Manila' 
      });

      const newTransfer = new Transfer({
        student_id: ovr.student_id,
        student_name: `${ovr.student_details?.first_name || 'Unknown'} ${ovr.student_details?.last_name || 'Student'}`,
        section_id: ovr.student_details?.section_id || 0,
        section_name: ovr.student_details?.section_name || ovr.student_details?.section_details?.section_name || "N/A",
        user_id: ovr.user_id || 1000,
        user_name: ovr.user_name,
        purpose: ovr.purpose,
        time: formattedTime, 
        date: formattedDate, 
        transfer_id: `TRX-${Math.floor(1000 + Math.random() * 9000)}`,
      });

      await newTransfer.save();
      ovr.is_approved = true;

      if (ovr.purpose === 'Pick up' && ovr.student_id) {
        await Student.findOneAndUpdate(
          { student_id: ovr.student_id },
          { 
            status: 'Dismissed',
            updated_at: new Date(),
            updated_by: `${req.user.first_name} ${req.user.last_name}`
          }
        );
      } else if (ovr.purpose === 'Drop off' && ovr.student_id) {
        await Student.findOneAndUpdate(
          { student_id: ovr.student_id },
          { 
            status: 'Learning',
            updated_at: new Date(),
            updated_by: `${req.user.first_name} ${req.user.last_name}`
          }
        );  
      }

      await ovr.save();

      const io = req.app.get('socketio');
      if (io) {
        io.emit('override_processed', { id: ovr._id, action: 'approved' });
      }

      const auditLog = new Audit({
        user_id: req.user.user_id,
        full_name: `${req.user.first_name} ${req.user.last_name}`,
        role: req.user.role,
        action: "Manual Transfer Approved",
        target: `${ovr.purpose} for ${ovr.student_details?.first_name}`
      });
      await auditLog.save();

      // ==========================================
      // SMS LOGIC FOR OVERRIDE APPROVALS
      // ==========================================
      try {
        if (ovr.student_details && ovr.student_details.user_id) {
          const recipientIds = Array.isArray(ovr.student_details.user_id) 
              ? ovr.student_details.user_id 
              : [ovr.student_details.user_id];
          
          const parents = await User.find({ user_id: { $in: recipientIds } });
          const phoneNumbers = parents
              .map(p => p.phone_number)
              .filter(phone => phone && phone.startsWith("09") && phone.length === 11)
              .join(",");

          if (phoneNumbers.length > 0) {
              const guardianLabel = ovr.is_registered_guardian ? ovr.user_name : `Guest: ${ovr.user_name}`;
              const smsMessage = `LuMINI Alert: Manual Override Approved. ${ovr.student_details.first_name} has been ${ovr.purpose === 'Drop off' ? 'dropped off' : 'picked up'} by ${guardianLabel}.`;
              
              sendIprogBulkSMS(phoneNumbers, smsMessage)
                  .then(() => console.log(`✅ SMS Alert sent for Override Approval.`))
                  .catch(err => console.error("❌ SMS Dispatch Failed (Override):", err.message));
          }
        }
      } catch (smsError) {
          console.error("❌ Failed to process SMS logic for override:", smsError);
      }


      return res.status(200).json({ 
        success: true, 
        msg: `Transfer recorded for ${formattedDate} ${formattedTime}` 
      });

    } catch (err) {
      console.error("Approval Error:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }
);

router.patch('/api/transfer/override/:id/reject',
  isAuthenticated,
  hasRole('superadmin'),
  async (req, res) => {
    try {
      const ovr = await Override.findById(req.params.id)
                                 .populate({
                                  path: 'student_details',
                                  populate: { 
                                    path: 'section_details' 
                                  } 
                                })
                                 .populate('user_details');

      if (!ovr) return res.status(404).json({ error: "Record not found." });
      if (ovr.is_approved) return res.status(400).json({ error: "Already approved." });
      if (ovr.is_rejected) return res.status(400).json({ error: "Already rejected." });

      ovr.is_rejected = true;
      await ovr.save();

      const auditLog = new Audit({
        user_id: req.user.user_id,
        full_name: `${req.user.first_name} ${req.user.last_name}`,
        role: req.user.role,
        action: "Manual Transfer Rejected",
        target: `${ovr.purpose} for ${ovr.student_details?.first_name}`
      });
      await auditLog.save();

      const io = req.app.get('socketio');
      if (io) {
        io.emit('override_processed', { id: ovr._id, action: 'rejected' });
      }

      return res.status(200).json({ 
        success: true, 
        msg: `Manual Transfer Rejected` 
      });

    } catch (err) {
      console.error("Approval Error:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }
);

cron.schedule('59 23 * * *', async () => {
    try {
      const now = new Date();
      const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
      
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

      const strandedStudents = await Student.find({ status: 'Learning', is_archive: false })
                                            .populate({
                                              path: 'section_details',
                                              options: { strictPopulate: false }
                                            });

      if (strandedStudents.length > 0) {
        for (const student of strandedStudents) {
            const missedTransfer = new Transfer({
                student_id: student.student_id,
                student_name: student.first_name ? `${student.first_name} ${student.last_name}` : 'Unknown Student',
                section_id: student.section_id || '---',
                section_name: student.section_details?.section_name || 'Unassigned',
                user_id: 0, 
                user_name: 'Unattended',
                purpose: '---',
                date: todayStr,
                time: '---', 
            });
            
            await missedTransfer.save();
            const studentWithUsers = await Student.findOne({ student_id: student.student_id });

            if (studentWithUsers?.user_id?.length > 0) {
              const recipientIds = Array.isArray(studentWithUsers.user_id)
                ? studentWithUsers.user_id
                : [studentWithUsers.user_id];

              const notificationPromises = recipientIds.map(async (id) => {
                const notification = new Notification({
                  recipient_id: Number(id),
                  sender_id: 0,
                  type: 'Transfer',
                  title: 'Missed Pick Up',
                  message: `${student.first_name} ${student.last_name} was not picked up or properly picked up yesterday and has been auto-dismissed by the system.`,
                  is_read: false
                });

                const savedNotif = await notification.save();

                io.to(`user_${id}`).emit('new_notification', savedNotif);

                return savedNotif;
              });

              await Promise.all(notificationPromises);
            }

            const auditLog = new Audit({
              user_id: 0,
              full_name: "System",
              role: "superadmin",
              action: "Midnight Status Reset",
              target: `Student: ${student.first_name} ${student.last_name} (Auto-Dismissed)`
            });
            await auditLog.save();

            student.status = 'On the way';
            student.last_reset_date = todayStr;
            await student.save();
        }
      }
  } catch (error) {
      console.error('❌ Auto-Reset Cron Error:', error);
  }
}, {
    scheduled: true,
    timezone: "Asia/Manila"
});

export default router;