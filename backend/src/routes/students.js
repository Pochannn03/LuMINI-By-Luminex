import { Router } from "express";
import { validationResult, matchedData, checkSchema} from "express-validator";
import { isAuthenticated, hasRole } from '../middleware/authMiddleware.js';
import { createStudentValidationSchema } from '../validation/studentValidation.js';
import { updateStudentValidationSchema } from '../validation/editStudentValidation.js';
// import { User } from "../models/users.js";
import { Student } from "../models/students.js";
import { Section } from "../models/sections.js";
import { Counter } from '../models/counter.js';
import multer from "multer";
import path from "path";
import fs from "fs";

// Router Import to Export this router to index.js
const router = Router();

// for Image/File Holder
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/') 
  },
  filename: function (req, file, cb) {
    // Unique filename: timestamp + original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); 
  }
});

const upload = multer({ storage: storage });

// STUDENT
router.get('/api/students', 
  isAuthenticated,
  hasRole('superadmin'),
  upload.single('profile_photo'),
  async (req, res) => {
    try{
    const students = await Student.find({ is_archive: false })
                                  .populate('section_details')
                                  .populate('user_details');
                               
    if (!students || students.length === 0) {
      return res.status(200).json({ success: true, students: [] });
    }

    res.status(200).json({ success: true, students });

  } catch(err) {
    console.error("Error fetching students:", err);
    res.status(500).json({ msg: "Server error while fetching students" });
  }
})

// EDIT STUDENT
router.put('/api/students/:id',
  isAuthenticated, 
  hasRole('superadmin'),
  upload.single('profile_photo'),
  ...checkSchema(updateStudentValidationSchema),
  async (req, res) => {
    const result = validationResult(req);

    if (!result.isEmpty()) {
      console.log("Validation Errors:", result.array());
      return res.status(400).send({ errors: result.array() });
    }
    
    const studentId = req.params.id;
    const updateData = {
        ...req.body
    };
    
    if (req.file) {
        updateData.profile_picture = req.file.path; 
    }

    try {
      const updatedStudent = await Student.findByIdAndUpdate(
        studentId, 
        updateData, 
        { 
          new: true,           
          runValidators: true  
        }
      )

      if (!updatedStudent) {
        return res.status(404).json({ success: false, msg: "Class not found" });
      }

      return res.status(200).json({ 
        success: true, 
        msg: "Class updated successfully!", 
        class: updatedStudent 
      });

    } catch (err) {
      console.error("Update Error:", err);
      return res.status(500).json({ success: false, msg: "Update failed", error: err.message });
    }
})

// ARCHIVING STUDENT 
router.put('/api/students/archive/:id',
  isAuthenticated, 
  hasRole('superadmin'),
  async (req, res) => {
    const studentId = req.params.id;

    try {
      const archivedStudent = await Student.findByIdAndUpdate(
        studentId, 
        { is_archive: true }, 
        { new: true, runValidators: true }
      );

      if (!archivedStudent) {
        return res.status(404).json({ success: false, msg: "Teacher not found" });
      }

      console.log(`Student archived: ${archivedStudent.username}`);

      return res.status(200).json({ 
        success: true, 
        msg: "Student archived successfully.", 
        user: archivedStudent 
      });

    } catch (err) {
      console.error("Archive Error:", err);
      return res.status(500).json({ success: false, msg: "Failed to archive Student", error: err.message });
    }
})

// AVAILABLE STUDENTS TO ASSIGN SECTION
router.get('/api/students/available', 
  isAuthenticated, 
  hasRole('superadmin'), 
  async (req, res) => {
  try {
    const { editingSectionId } = req.query;

    const sectionIdNum = (editingSectionId !== undefined && editingSectionId !== '') 
      ? Number(editingSectionId) 
      : null;

    const query = {
      is_archive: false,
      $or: [
        { section_id: null },
        { section_id: { $exists: false } }
      ]
    };

    if (sectionIdNum !== null && !isNaN(sectionIdNum)) {
      query.$or.push({ section_id: sectionIdNum });
    }

    const students = await Student.find(query);

    res.status(200).json({ success: true, students });
  } catch (err) {
    console.error("Fetch available students error:", err);
    res.status(500).json({ success: false });
  }
});


// CREATE STUDENT
router.post('/api/students', 
  isAuthenticated,
  hasRole('superadmin'),
  upload.single('profile_photo'),
  ...checkSchema(createStudentValidationSchema), 
  async (req, res) => {

    const result = validationResult(req);

    if (!result.isEmpty()) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).send({ errors: result.array() });
    }

    const data = matchedData(req);
    console.log("Received Valid Data:", data);
    data.created_by = "superadmin";
    data.updated_by = "superadmin";

    if (req.file) {
      data.profile_picture = req.file.path; 
    }

    const newStudent = new Student(data);

    try {
        const savedStudent = await newStudent.save();
        return res.status(201).send({ msg: "Student registered successfully!", user: savedStudent });
    } catch (err) {
        if (req.file) fs.unlinkSync(req.file.path);
        
        if (err.code === 11000) {
          if (err.keyPattern && err.keyPattern.student_id) {
            return res.status(400).send({ msg: "ID Generation conflict. Please try again." });
          }
          return res.status(400).send({ msg: "Duplicate Data: Invitation Code or ID already exists." });
        }
        return res.status(400).send({ msg: "Registration failed", error: err.message });
    }

  }
);

// GET CURRENT STUDENT ID 
router.get('/api/students/id',
  isAuthenticated,
  hasRole('superadmin'),
  async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const counterName = `student_id_${currentYear}`;
    
    // 1. Find the current counter for this year (don't update it!)
    let counter = await Counter.findById(counterName);
    
    // 2. Calculate next number (Current Seq + 1)
    // If counter doesn't exist yet (first student of the year), next is 1.
    const nextSeq = counter ? counter.seq + 1 : 1;
    
    // 3. Format it
    const previewId = `${currentYear}-${String(nextSeq).padStart(4, '0')}`;
    
    res.status(200).json({ student_id: previewId });
  } catch (err) {
    console.error("Preview Error:", err);
    res.status(500).json({ msg: "Could not generate preview ID" });
  }
});

// GET STUDENT INVITATION CODE FOR PARENTS
router.get('/api/students/invitation', 
  isAuthenticated, 
  hasRole('superadmin'),
  async (req, res) => {
    try {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789';
      let code = '';
      let isUnique = false;

      // Keep generating until we find a unique one
      while (!isUnique) {
        code = '';
        // Generate random 6-char string
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        // Check Database for duplicates
        const existingStudent = await Student.findOne({ invitation_code: code });
        
        // If no student has this code, it's unique!
        if (!existingStudent) {
          isUnique = true;
        }
      }
      return res.status(200).json({ code });

    } catch (err) {
      console.error("Code Generation Error:", err);
      return res.status(500).json({ msg: "Failed to generate code" });
    }
});

// GET TOTAL STUDENTS OF TEACHER
router.get("/api/students/teacher/totalStudents", 
  isAuthenticated, 
  hasRole('admin'),
  async (req, res) => { 
    
    try {
        // 2. Get the current logged-in teacher's ID
        // CRITICAL: Ensure this is a Number to match your database schema (user_id: 2)
        const teacherId = Number(req.user.user_id); 

        // 3. Find ONLY sections where user_id matches the current teacher
        const sections = await Section.find({ user_id: teacherId });

        // 4. Calculate Total Sections (Count of documents found)
        const totalSections = sections.length;

        // 5. Calculate Total Students (Sum of all student_id arrays)
        const totalStudents = sections.reduce((total, section) => {
            // Use ?.length to safely handle sections with no students (undefined)
            return total + (section.student_id?.length || 0);
        }, 0);

        // 6. Return the data
        res.status(200).json({
            success: true,
            teacherId: teacherId,
            totalSections: totalSections,
            totalStudents: totalStudents
        });

    } catch (error) {
        console.error("Error fetching teacher totals:", error);
        res.status(500).json({ error: "Server Error" });
    }
});

export default router;