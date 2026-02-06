import { Router } from "express";
import { validationResult, body, matchedData, checkSchema} from "express-validator";
import { isAuthenticated, hasRole } from '../middleware/authMiddleware.js';
import { hashPassword } from "../utils/passwordUtils.js";
import { createUserValidationSchema } from "../validation/userValidation.js";
import { createTeacherValidationSchema } from '../validation/teacherValidation.js'
import { User } from "../models/users.js";
import bcrypt from 'bcrypt';
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

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

router.post('/api/teachers',
  upload.single('profile_photo'),
  ...checkSchema(createUserValidationSchema), 
  async (req, res) => {
    const result = validationResult(req);

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

    try {
      const savedUser = await newUser.save();
      return res.status(201).send({ msg: "Parent registered successfully!", user: savedUser });
    } catch (err) {
      if (req.file) fs.unlinkSync(req.file.path);
      
      console.log(err);
      return res.status(400).send({ msg: "Registration failed", error: err.message });
    }
  }
);

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

// CREATE TEACHER FROM MODAL (SUPERADMIN)
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
      const archivedUser = await User.findByIdAndUpdate(
        userId, 
        { is_archive: true }, 
        { new: true }
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


export default router;