import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { isAuthenticated } from '../middleware/authMiddleware.js'; // Removed hasRole entirely here
import { EnrollmentRequest } from "../models/EnrollmentRequest.js"; // Note: ensure exact casing matches your file
import { Section } from "../models/sections.js"; 

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
    // Check relationship instead of role
    if (req.user.relationship !== 'Teacher') {
       return res.status(403).json({ success: false, msg: "Access denied. Only teachers can view this queue." });
    }

    const teacherId = req.user.user_id; 
    console.log(`🔍 [DEBUG] Searching for pending requests for Teacher ID:`, teacherId);

    const pendingRequests = await EnrollmentRequest.find({ 
      teacher_id: Number(teacherId), 
      status: { $in: ['Pending', 'Approved_By_Teacher', 'Rejected'] } // <--- THE FIX
    }).sort({ created_at: -1 }).lean();

    console.log(`✅ [DEBUG] Found ${pendingRequests.length} pending requests!`);

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
// GET: FETCH ALL ENROLLMENTS FOR A SPECIFIC TEACHER (Pending & History)
// ==================================================
router.get('/api/teacher/enrollments/pending', isAuthenticated, async (req, res) => {
  try {
    if (req.user.relationship !== 'Teacher') {
       return res.status(403).json({ success: false, msg: "Access denied." });
    }

    const teacherId = req.user.user_id; 
    
    // Fetch ALL requests for this teacher (Pending, Approved_By_Teacher, Rejected)
    const allRequests = await EnrollmentRequest.find({ 
      teacher_id: Number(teacherId),
      status: { $in: ['Pending', 'Approved_By_Teacher', 'Rejected'] }
    }).sort({ created_at: -1 }).lean();

    // Attach section info
    for (let request of allRequests) {
      const sectionInfo = await Section.findOne({ section_id: request.section_id })
                                       .select('section_name section_code');
      request.section_id = sectionInfo || { section_name: "Unknown Section", section_code: "" };
    }

    res.status(200).json({ success: true, requests: allRequests });
  } catch (error) {
    console.error("Error fetching enrollments:", error);
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

    // Ensure the status is valid based on your schema
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

    res.status(200).json({ success: true, msg: `Application marked as ${status}`, request: updatedRequest });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ success: false, msg: "Failed to update application status." });
  }
});

export default router;