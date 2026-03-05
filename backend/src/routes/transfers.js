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
import multer from 'multer';
import path from 'path';
import fs from "fs";

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
      console.log("Step 3: Searching transfers for Student IDs:", studentIdStrings);

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

      console.log(`Step 4: Success! Found ${history.length} transfer records.`);

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
      // 'en-CA' is a trick to get YYYY-MM-DD format easily

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
          time: new Date().toLocaleTimeString('en-US', { 
              hour: 'numeric', minute: '2-digit', hour12: true 
          }),
      });

      await newTransfer.save();

      const studentDoc = await Student.findOne({ student_id: studentId });
      
      if (studentDoc && studentDoc.user_id) {
        const recipientIds = Array.isArray(studentDoc.user_id) 
            ? studentDoc.user_id 
            : [studentDoc.user_id];

        // Map through and save notifications
        const notificationPromises = recipientIds.map(async (id) => {
            const notification = new Notification({
              recipient_id: Number(id), 
              sender_id: currentUserId,
              type: 'Transfer',
              title: `Student ${purpose} Successful`,
              message: `${studentName} has been ${purpose === 'Drop off' ? 'dropped off' : 'picked up'}`,
              is_read: false
            });
            
            const savedNotif = await notification.save();

            req.app.get('socketio').to(`user_${id}`).emit('new_notification', savedNotif);
            
            return savedNotif;
        });

        await Promise.all(notificationPromises);
        const io = req.app.get('socketio');

        recipientIds.forEach(id => {
            io.emit('new_notification', {
              recipient_id: Number(id),
              type: 'Transfer',
              title: `Student ${purpose} Successful`,
              message: `${studentName} has been ${purpose === 'Drop off' ? 'dropped off' : 'picked up'}`,
              is_read: false,
              created_at: new Date()
            });
        });
    }

      await AccessPass.findOneAndUpdate(
            { token: token },
            { isUsed: true }
        );

      const newStatus = purpose === 'Drop off' ? 'Learning' : 'Dismissed';

      await Student.findOneAndUpdate(
          { student_id: studentId },
          { 
            status: newStatus,
            last_reset_date: todayDate 
          },
          { status: newStatus },
          { new: true }
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
          // Note: This requires a join/lookup if filtering strictly by User model role
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


export default router;