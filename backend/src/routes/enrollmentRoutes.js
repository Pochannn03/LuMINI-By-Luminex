import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { EnrollmentRequest } from "../models/enrollmentRequest.js"; 
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

router.post('/api/enrollments/submit', upload.single('studentPhoto'), async (req, res) => {
  try {
    console.log("📥 --- INCOMING ENROLLMENT REQUEST ---");
    console.log("BODY DATA:", req.body);
    console.log("UPLOADED FILE:", req.file ? "Yes" : "No");

    const {
      studentFirstName, studentLastName, studentSuffix, studentBirthdate, studentGender,
      parentFirstName, parentLastName, parentPhone, parentEmail,
      sectionId 
    } = req.body;

    // 1. Check if sectionId exists
    if (!sectionId) {
      console.log("❌ Missing Section ID in request");
      return res.status(400).json({ success: false, msg: "Missing Section ID" });
    }

    // 2. Find the target section
    const section = await Section.findOne({ section_id: Number(sectionId) });
    if (!section) {
      console.log(`❌ Section not found for ID: ${sectionId}`);
      return res.status(404).json({ success: false, msg: "Target section not found." });
    }

    console.log(`✅ Found Section: ${section.section_name}, Teacher ID: ${section.user_id}`);

    // 3. Create the Database Document
    const newRequest = new EnrollmentRequest({
      student_first_name: studentFirstName,
      student_last_name: studentLastName,
      student_suffix: studentSuffix || "", // Fallback to empty string if undefined
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

    // 4. Save to Database
    await newRequest.save();
    console.log("✅ Successfully saved Enrollment Request to DB!");

    return res.status(201).json({ success: true, msg: "Application submitted successfully." });

  } catch (error) {
    console.error("❌ SUBMISSION ERROR CRASH:");
    console.error(error);
    
    // Send the exact error message back to the frontend
    res.status(500).json({ 
      success: false, 
      msg: "Failed to submit application.",
      errorDetails: error.message 
    });
  }
});

export default router;