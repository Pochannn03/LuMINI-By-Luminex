import { Router } from "express";
import { validationResult, matchedData, checkSchema} from "express-validator";
import { isAuthenticated, hasRole } from '../middleware/authMiddleware.js';
import { createUserValidationSchema } from "../validation/userValidation.js";
import { createStudentValidationSchema } from '../validation/studentValidation.js';
import { createClassValidationSchema } from '../validation/classValidation.js';
import { Student } from "../models/students.js";
import { User } from "../models/users.js";
import { Section } from "../models/sections.js";
import { Counter } from '../models/counter.js';
import { hashPassword } from "../utils/passwordUtils.js";
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

router.post('/api/superadminDashboard',  
  (req, res) => {

});

// CREATE STUDENT ROUTER
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

// Getting the Current Student ID for Add Student Modal
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

router.get('/api/students/invitation', 
  isAuthenticated, 
  hasRole('superadmin', 'teacher', 'admin'), // Adjust roles as needed
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

// CREATE TEACHER

router.post('/api/teachers',
  isAuthenticated,
  hasRole('superadmin'),
  upload.single('profile_photo'),
  ...checkSchema(createUserValidationSchema),
  async (req, res) => {

    const result = validationResult(req)

    if (!result.isEmpty()) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).send({ errors: result.array() });
    }

    const data = matchedData(req);
    console.log("Received Valid Data:", data);
    data.password = await hashPassword(data.password);
    data.role = "admin";

    if (req.file) {
      data.profile_picture = req.file.path; 
    }

    const newUser = new User(data);

    try{
      const savedUser = await newUser.save();
      return res.status(201).send({ msg: "Parent registered successfully!", user: savedUser });
    } catch (err) {
      if (req.file) fs.unlinkSync(req.file.path);
      
      console.log(err);
      return res.status(400).send({ msg: "Registration failed", error: err.message });
    }

});

// Get Teacher's Data to Populate the Select Option

router.get('/api/teachers',
  isAuthenticated,
  hasRole('superadmin'),
  async (req, res) => {

  try{
    const teachers = await User.find({ relationship: 'Teacher' })
                               .select('first_name last_name user_id');
                               
    if (!teachers || teachers.length === 0) {
      return res.status(200).json([]);
    }

    res.status(200).json(teachers);
  } catch(err) {
    console.error("Error fetching teachers:", err);
    res.status(500).json({ msg: "Server error while fetching teachers" });
  }
});

// ADD CLASS
router.post('/api/sections',
  isAuthenticated,
  hasRole('superadmin'),
  ...checkSchema(createClassValidationSchema),
  async (req, res) => {
    const result = validationResult(req);

    if (!result.isEmpty()) {
      return res.status(400).send({ errors: result.array() });
    }
    
    const data = matchedData(req);
    
    const newClass = new Section(data);

    try{
      const savedClass = await newClass.save();
      return res.status(201).send({ msg: "Class created successfully!", user: savedClass });
    } catch (err) {
      console.log(err);
      return res.status(400).send({ msg: "Registration failed", error: err.message });
    }
    
})

export default router;