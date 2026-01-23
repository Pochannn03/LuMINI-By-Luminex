import { Router } from "express";
import { validationResult, matchedData, checkSchema} from "express-validator";
import { createUserValidationSchema } from "../validation/userValidation.js";
import { createStudentValidationSchema } from '../validation/studentValidation.js'
import { Student } from "../models/students.js";
import { User } from "../models/users.js";
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

// Student ID Generate Function
const generateStudentId = async () => {
  const currentYear = new Date().getFullYear();

  const lastStudentId = await Student.findOne({ 
    student_id: { $regex: `^${currentYear}-` }
  }).sort({ student_id: -1 });

  let newSequence = 1;

  if (lastStudentId && lastStudentId.student_id) {
    const lastSequenceStr = lastStudentId.student_id.split('-')[1];
    const lastSequence = parseInt(lastSequenceStr, 10);
    
    if (!isNaN(lastSequence)) {
      newSequence = lastSequence + 1;
    }
  }

  return `${currentYear}-${String(newSequence).padStart(4, '0')}`;
}

router.post('/api/superadminDashboard',  
  (req, res) => {

});

// CREATE STUDENT ROUTER
router.post('/api/createStudent', 
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
    try {
      data.student_id = await generateStudentId(); 
    } catch (error) {
      console.error("ID Generation Error:", error);
      return res.status(500).send({ msg: "Failed to generate Student ID" });
    }
    data.created_by = "SuperAdmin";
    data.updated_by = "SuperAdmin";

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
router.get('/api/getStudentIdPreview', async (req, res) => {
  try {
      const previewId = await generateStudentId();
      res.status(200).json({ student_id: previewId });
    } catch (err) {
      res.status(500).json({ msg: "Could not generate preview ID" });
    }
  }
);

// CREATE TEACHER

router.post('/api/createTeacher',
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

export default router;