import { Router } from "express";
import { validationResult, matchedData, checkSchema} from "express-validator";
import { isAuthenticated, hasRole } from '../middleware/authMiddleware.js';
import { createUserValidationSchema } from "../validation/userValidation.js";
import { createStudentValidationSchema } from '../validation/studentValidation.js';
import { createClassValidationSchema } from '../validation/classValidation.js';
import { createTeacherValidationSchema } from '../validation/teacherValidation.js'
import { User } from "../models/users.js";
import { Student } from "../models/students.js";
import { Section } from "../models/sections.js";
import { Counter } from '../models/counter.js';
import { hashPassword } from "../utils/passwordUtils.js";
import bcrypt from 'bcrypt';
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


// TEACHERS
// GET TEACHER'S DATA 
router.get('/api/teachers',
  isAuthenticated,
  hasRole('superadmin'),
  async (req, res) => {

  try{
    const teachers = await User.find({ relationship: 'Teacher', is_archive: false })
                               
    if (!teachers || teachers.length === 0) {
      return res.status(200).json({ success: true, teachers: [] });
    }

    res.status(200).json({ success: true, teachers });

  } catch(err) {
    console.error("Error fetching teachers:", err);
    res.status(500).json({ msg: "Server error while fetching teachers" });
  }
});

// CREATE TEACHER
router.post('/api/teachers/modal',
  isAuthenticated,
  hasRole('superadmin'),
  upload.single('profile_photo'),
  ...checkSchema(createTeacherValidationSchema),
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
    data.is_archive = false;

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

// UPDATE/EDIT TEACHER
router.put('/api/teacher/:id',
  isAuthenticated,
  hasRole('superadmin'),
  upload.single('profile_photo'),
  ...checkSchema(createTeacherValidationSchema),
  async (req, res) => {
    const result = validationResult(req);

    if (!result.isEmpty()) {
      return res.status(400).send({ errors: result.array() });
    }
    
    const userId = req.params.id;
    const updateData = {
        ...req.body
    };
    
    if (req.file) {
        updateData.profile_picture = req.file.path; 
    }

    if (updateData.password) {
        try {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(updateData.password, salt);
        } catch (hashError) {
            return res.status(500).json({ success: false, msg: "Error hashing password" });
        }
    } else {
        delete updateData.password;
    }

    try {
      const updatedUser = await User.findByIdAndUpdate(
        userId, 
        updateData, 
        { 
          new: true,           
          runValidators: true  
        }
      )

      if (!updatedUser) {
        return res.status(404).json({ success: false, msg: "Class not found" });
      }

      return res.status(200).json({ 
        success: true, 
        msg: "Class updated successfully!", 
        class: updatedUser 
      });

    } catch (err) {
      console.error("Update Error:", err);
      return res.status(500).json({ success: false, msg: "Update failed", error: err.message });
    }
})

// DELETE (is_archive: true) TEACHER
router.put('/api/teacher/archive/:id', 
  isAuthenticated,
  hasRole('superadmin'),
  async (req, res) => {
    const userId = req.params.id;

    try {
      // Update is_archive to "true" (String) to match your DB schema
      // If you change your schema to Boolean later, remove the quotes around true
      const archivedUser = await User.findByIdAndUpdate(
        userId, 
        { is_archive: true }, 
        { new: true } // Returns the updated document
      );

      if (!archivedUser) {
        return res.status(404).json({ success: false, msg: "Teacher not found" });
      }

      console.log(`Teacher archived: ${archivedUser.username}`);

      return res.status(200).json({ 
        success: true, 
        msg: "Teacher archived successfully.", 
        user: archivedUser 
      });

    } catch (err) {
      console.error("Archive Error:", err);
      return res.status(500).json({ success: false, msg: "Failed to archive teacher", error: err.message });
    }
});

// CLASSES
router.get('/api/sections',
  isAuthenticated,
  hasRole('superadmin'),
  async (req, res) => {

    try {
      const classes = await Section.find({ is_archive: false })
                                   .select('section_name class_schedule max_capacity description user_id')
                                   .populate('user_details', 'first_name last_name');

      if (!classes || classes.length === 0) {
        return res.status(200).json({ success: true, classes: [] });
      }

      res.status(200).json({ success: true, classes });
    } catch (err) {
      console.error("Error fetching classes:", err);
      res.status(500).json({ msg: "Server error while fetching classes" });
    }
});

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

router.delete('/api/sections/:id', // WILL CHANGE INTO PUT FOR is_archive TO BE SET TRUE
  isAuthenticated,
  hasRole('superadmin'),
  async (req, res) => {
    try {
      const sectionId = req.params.id;
      const deletedSection = await Section.findByIdAndDelete(sectionId);

      if (!deletedSection) {
        return res.status(404).json({ success: false, msg: "Class not found" });
      }

      // 3. (Optional) If you need to "Disconnect" the teacher specifically
      // If your User model has an array of classes, you would pull it here.
      // If your relationship is only stored in Section (user_id field), 
      // then deleting the Section is enough! // WILL THINK ABOUT THIS
      
      console.log(`Deleted section: ${deletedSection.section_name}`);

      res.status(200).json({ success: true, msg: "Class deleted successfully" });

    } catch (err) {
      console.error("Error deleting class:", err);

      if (err.kind === 'ObjectId') {
         return res.status(404).json({ success: false, msg: "Class not found" });
      }

      res.status(500).json({ success: false, msg: "Server error" });
    }
});

router.put('/api/sections/:id',
  isAuthenticated,
  hasRole('superadmin'),
  ...checkSchema(createClassValidationSchema),
  async (req, res) => {
    const result = validationResult(req);

    if (!result.isEmpty()) {
      return res.status(400).send({ errors: result.array() });
    }
    
    const sectionId = req.params.id;
    const data = matchedData(req);

    try {
      // 3. The "Magic" Update Command
      // findByIdAndUpdate(id, updateData, options)
      const updatedClass = await Section.findByIdAndUpdate(
        sectionId, 
        data, 
        { 
          new: true,           // Return the UPDATED document (not the old one)
          runValidators: true  // Make sure rules (like required fields) are still checked
        }
      ).populate('user_details', 'first_name last_name'); // Optional: Return teacher info immediately

      if (!updatedClass) {
        return res.status(404).json({ success: false, msg: "Class not found" });
      }

      return res.status(200).json({ 
        success: true, 
        msg: "Class updated successfully!", 
        class: updatedClass 
      });

    } catch (err) {
      console.error("Update Error:", err);
      return res.status(500).json({ success: false, msg: "Update failed", error: err.message });
    }
});


export default router;