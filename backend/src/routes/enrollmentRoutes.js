import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { isAuthenticated } from '../middleware/authMiddleware.js';
import { EnrollmentRequest } from "../models/EnrollmentRequest.js"; 
import { Section } from "../models/sections.js"; 
import { Student } from "../models/students.js";

import { sendInvitationEmail, sendBulkSectionInvite } from '../utils/emailService.js';

const router = Router();

const uploadDir = 'uploads/students';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); 
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'student-enrollment-' + uniqueSuffix + path.extname(file.originalname)); 
  }
});
const upload = multer({ storage: storage });

// ==================================================
// POST: SUBMIT PARENT ENROLLMENT FORM
// ==================================================
router.post('/api/enrollments/submit', upload.single('studentPhoto'), async (req, res) => {
  try {
    console.log("📥 --- INCOMING ENROLLMENT REQUEST ---");

    const {
      studentFirstName, studentLastName, studentSuffix, studentBirthdate, studentGender,
      parentFirstName, parentLastName, parentPhone, parentEmail,
      sectionId 
    } = req.body;

    if (!sectionId) {
      return res.status(400).json({ success: false, msg: "Missing Section ID" });
    }

    const section = await Section.findOne({ section_id: Number(sectionId) });
    if (!section) {
      return res.status(404).json({ success: false, msg: "Target section not found." });
    }

    const newRequest = new EnrollmentRequest({
      student_first_name: studentFirstName,
      student_last_name: studentLastName,
      student_suffix: studentSuffix || "",
      student_dob: studentBirthdate,
      student_gender: studentGender,
      student_photo: req.file ? req.file.path : null,
      parent_name: `${parentFirstName} ${parentLastName}`,
      parent_phone: parentPhone,
      parent_email: parentEmail,
      section_id: section.section_id,
      teacher_id: section.user_id,
      status: 'Pending'
    });

    await newRequest.save();
    console.log("✅ Successfully saved Enrollment Request to DB!");

    return res.status(201).json({ success: true, msg: "Application submitted successfully." });

  } catch (error) {
    console.error("❌ SUBMISSION ERROR CRASH:", error);
    res.status(500).json({ success: false, msg: "Failed to submit application.", errorDetails: error.message });
  }
});

// ==================================================
// GET: FETCH PENDING ENROLLMENTS FOR A SPECIFIC TEACHER
// ==================================================
router.get('/api/teacher/enrollments/pending', isAuthenticated, async (req, res) => {
  try {
    // THE FIX: Check if role is 'admin' (Teacher), not relationship
    if (req.user.role !== 'admin') {
       return res.status(403).json({ success: false, msg: "Access denied. Only teachers can view this queue." });
    }

    const teacherId = req.user.user_id; 

    const pendingRequests = await EnrollmentRequest.find({ 
      teacher_id: Number(teacherId), 
      status: { $in: ['Pending', 'Rejected', 'Registered'] } 
    }).sort({ created_at: -1 }).lean();

    for (let request of pendingRequests) {
      const sectionInfo = await Section.findOne({ section_id: request.section_id })
                                       .select('section_name section_code');
                                       
      request.section_id = sectionInfo || { section_name: "Unknown Section", section_code: "" };
    }

    res.status(200).json({ success: true, requests: pendingRequests });
  } catch (error) {
    console.error("Error fetching pending enrollments:", error);
    res.status(500).json({ success: false, msg: "Failed to fetch enrollments" });
  }
});

// ==================================================
// PUT: DIRECT APPROVE & REGISTER STUDENT (OR REJECT)
// ==================================================
router.put('/api/teacher/enrollments/:id/status', isAuthenticated, async (req, res) => {
  try {
    // THE FIX: Check if role is 'admin' (Teacher)
    if (req.user.role !== 'admin') {
       return res.status(403).json({ success: false, msg: "Access denied." });
    }

    const { status } = req.body; 
    const requestId = req.params.id;

    if (!['Registered', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, msg: "Invalid status update." });
    }

    const reqData = await EnrollmentRequest.findById(requestId);
    if (!reqData) {
      return res.status(404).json({ success: false, msg: "Request not found." });
    }

    // If teacher approves, instantly register the student!
    if (status === 'Registered') {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789';
      let invCode = '';
      let isUnique = false;
      while (!isUnique) {
        invCode = Array.from({length: 6}, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
        const existing = await Student.findOne({ invitation_code: invCode });
        if (!existing) isUnique = true;
      }

      const birthDate = new Date(reqData.student_dob);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      if (today.getMonth() < birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }

      const newStudent = new Student({
        first_name: reqData.student_first_name,
        last_name: reqData.student_last_name,
        birthday: reqData.student_dob,
        gender: reqData.student_gender,
        age: calculatedAge >= 0 ? calculatedAge : 0,
        profile_picture: reqData.student_photo, 
        section_id: reqData.section_id,
        invitation_code: invCode,
        
        passive_parent: {
          name: reqData.parent_name,
          phone: reqData.parent_phone,
          email: reqData.parent_email,
          is_verified: false
        }
      });

      const savedStudent = await newStudent.save();

      await Section.findOneAndUpdate(
        { section_id: reqData.section_id },
        { $push: { student_id: savedStudent.student_id } } 
      );

      // Send the final parent invitation email directly
      if (reqData.parent_email) {
        sendInvitationEmail(
          reqData.parent_email,
          invCode,
          reqData.parent_name,
          reqData.student_first_name
        );
      }
    }

    // Update status in DB
    reqData.status = status;
    await reqData.save();

    res.status(200).json({ 
      success: true, 
      msg: status === 'Registered' ? "Student successfully registered and parent notified!" : "Application rejected.", 
      request: reqData 
    });
  } catch (error) {
    console.error("Error updating status & registering:", error);
    res.status(500).json({ success: false, msg: "Failed to process application." });
  }
});

// ==================================================
// POST: TEACHER BULK INVITE PARENTS
// ==================================================
router.post('/api/teacher/bulk-invite-section', isAuthenticated, async (req, res) => {
  try {
    // THE FIX: Check if role is 'admin' (Teacher)
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, msg: "Access denied." });
    }

    const { sectionName, sectionCode, recipients } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, msg: "No recipients provided." });
    }

    const teacherName = `${req.user.first_name} ${req.user.last_name}`;

    recipients.forEach(parent => {
      if (parent.email) {
        const fullName = `${parent.firstName} ${parent.lastName}`.trim();
        sendBulkSectionInvite(
          parent.email, 
          fullName || "Parent/Guardian", 
          sectionName, 
          sectionCode, 
          teacherName
        );
      }
    });

    res.status(200).json({ success: true, msg: `Sending ${recipients.length} invitations.` });
  } catch (error) {
    console.error("Bulk Invite Error:", error);
    res.status(500).json({ success: false, msg: "Failed to send invitations." });
  }
});

export default router;