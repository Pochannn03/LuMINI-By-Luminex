import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { isAuthenticated } from '../middleware/authMiddleware.js';
import { EnrollmentRequest } from "../models/EnrollmentRequest.js"; 
import { Section } from "../models/sections.js"; 
import { Student } from "../models/students.js";
import { User } from "../models/users.js";

// --- NEW: IMPORT THE EMAIL FUNCTION ---
import { sendEnrollmentApprovalEmail } from '../utils/emailService.js';

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

// GET: FETCH PENDING ENROLLMENTS FOR A SPECIFIC TEACHER
router.get('/api/teacher/enrollments/pending', isAuthenticated, async (req, res) => {
  try {
    if (req.user.relationship !== 'Teacher') {
       return res.status(403).json({ success: false, msg: "Access denied. Only teachers can view this queue." });
    }

    const teacherId = req.user.user_id; 

    const pendingRequests = await EnrollmentRequest.find({ 
      teacher_id: Number(teacherId), 
      // THE FIX: Added 'Registered' to the allowed fetch statuses
      status: { $in: ['Pending', 'Approved_By_Teacher', 'Rejected', 'Registered'] } 
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
// PUT: UPDATE ENROLLMENT STATUS (Approve / Reject)
// ==================================================
router.put('/api/teacher/enrollments/:id/status', isAuthenticated, async (req, res) => {
  try {
    if (req.user.relationship !== 'Teacher') {
       return res.status(403).json({ success: false, msg: "Access denied." });
    }

    const { status } = req.body; // Expects 'Approved_By_Teacher' or 'Rejected'
    const requestId = req.params.id;

    if (!['Approved_By_Teacher', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, msg: "Invalid status update." });
    }

    const updatedRequest = await EnrollmentRequest.findByIdAndUpdate(
      requestId,
      { status: status },
      { new: true }
    );

    if (!updatedRequest) {
      return res.status(404).json({ success: false, msg: "Request not found." });
    }

    // --- NEW: FIRE AUTOMATED EMAIL IF APPROVED ---
    if (status === 'Approved_By_Teacher') {
      // Fire and forget (don't await it, so the UI responds instantly)
      sendEnrollmentApprovalEmail(
        updatedRequest.parent_email,
        updatedRequest.parent_name,
        updatedRequest.student_first_name
      );
    }

    res.status(200).json({ success: true, msg: `Application marked as ${status}`, request: updatedRequest });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ success: false, msg: "Failed to update application status." });
  }
});

// ==================================================
// GET: FETCH ALL TEACHER-APPROVED ENROLLMENTS FOR SUPER ADMIN
// ==================================================
router.get('/api/admin/enrollments/approved', isAuthenticated, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
       return res.status(403).json({ success: false, msg: "Access denied. Super Admin only." });
    }

    const approvedRequests = await EnrollmentRequest.find({ 
      status: 'Approved_By_Teacher' 
    }).lean();

    const populatedRequests = [];
    for (let req of approvedRequests) {
      const teacher = await User.findOne({ user_id: req.teacher_id }).select('first_name last_name');
      const section = await Section.findOne({ section_id: req.section_id }).select('section_name');

      populatedRequests.push({
        ...req,
        teacherName: teacher ? `${teacher.first_name} ${teacher.last_name}` : "Unknown Teacher",
        sectionName: section ? section.section_name : "Unknown Section"
      });
    }

    const teacherGroups = {};
    populatedRequests.forEach(req => {
      if (!teacherGroups[req.teacher_id]) {
        teacherGroups[req.teacher_id] = {
          id: req.teacher_id,
          name: req.teacherName,
          section: `Adviser - ${req.sectionName}`,
          pendingRequests: 0,
          requests: [] 
        };
      }
      teacherGroups[req.teacher_id].pendingRequests += 1;
      teacherGroups[req.teacher_id].requests.push(req);
    });

    const teacherQueue = Object.values(teacherGroups);

    res.status(200).json({ success: true, teacherQueue });

  } catch (error) {
    console.error("Error fetching admin enrollments:", error);
    res.status(500).json({ success: false, msg: "Failed to fetch admin queue." });
  }
});

// ==================================================
// POST: BULK REGISTER APPROVED STUDENTS (Super Admin)
// ==================================================
router.post('/api/admin/enrollments/bulk-register', isAuthenticated, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
       return res.status(403).json({ success: false, msg: "Access denied." });
    }

    const { requestIds } = req.body; 

    if (!requestIds || requestIds.length === 0) {
      return res.status(400).json({ success: false, msg: "No requests selected." });
    }

    const requestsToProcess = await EnrollmentRequest.find({
      _id: { $in: requestIds },
      status: 'Approved_By_Teacher' 
    });

    let registeredCount = 0;

    for (let reqData of requestsToProcess) {
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

      reqData.status = 'Registered';
      await reqData.save();

      registeredCount++;
    }

    res.status(200).json({ 
      success: true, 
      msg: `Successfully registered ${registeredCount} students into the system!` 
    });

  } catch (error) {
    console.error("Bulk Registration Error:", error);
    res.status(500).json({ success: false, msg: "Failed to process bulk registration." });
  }
});

export default router;