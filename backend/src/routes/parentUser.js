import { Router } from "express";
import { createUserValidationSchema } from '../validation/userValidation.js'
import { validationResult, body, matchedData, checkSchema} from "express-validator";
import { User } from "../models/users.js";
import { Student } from "../models/students.js";
import { hashPassword } from "../utils/passwordUtils.js";
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

// PARENT REGISTRATION 
// STUDENT CODE VERIFICATION (PHASE I)
router.post('/api/verify-invitation',
  isAuthenticated,
  hasRole('user'),
  async (req, res) => {
  const { code } = req.body;

  try {
    const student = await Student.findOne({ invitation_code: code });

    if (!student) {
      return res.status(404).send({ msg: "Invitation code not found." });
    }

    if (student.invitation_status === "used") {
      return res.status(400).send({ msg: "This code has already been used." });
    }
    
    const fullName = `${student.first_name} ${student.last_name}`;

    return res.status(200).send({ 
      msg: "Code valid", 
      fullName: fullName
    });
  } catch (err) {
    res.status(500).send({ msg: "Server error" });
  }
});

// PARENT REGISTRATION (PHASE II)
router.post('/api/parent-register',
  isAuthenticated,
  hasRole('user'),
  upload.single('profile_photo'),
  ...checkSchema(createUserValidationSchema), 
  async (req, res) => {
    const result = validationResult(req);

    if (!result.isEmpty()) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).send({ errors: result.array() });
    }

    const data = matchedData(req);

    try {
      const student = await Student.findOne({ invitation_code: data.invitation_code });

      if (!student) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(404).send({ msg: "Invalid invitation code." });
      }

      if (student.invitation_status === "used") {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).send({ msg: "This code has already been used." });
      }

      const hashedPassword = await hashPassword(data.password);
      
      const newUser = new User({
        ...data,
        password: hashedPassword,
        relationship: "Parent",
        role: "user",
        profile_picture: req.file ? req.file.path : null
      });

      const savedUser = await newUser.save();

      student.user_id.push(savedUser.user_id); 
      student.invitation_status = "used";
      student.invitation_used_at = Date.now();
      
      await student.save();

      return res.status(201).send({ 
        msg: "Parent registered and linked to student successfully!", 
        user: savedUser 
      });

    } catch (err) {
      // Clean up uploaded file if the database fails
      if (req.file) fs.unlinkSync(req.file.path);
      console.error("Registration Error:", err);
      return res.status(500).send({ msg: "Registration failed", error: err.message });
    }
  }
);

// Checking for User Information under the Student Schema

router.get('/api/user-checking',
  isAuthenticated,
  hasRole('user'),
  async (req, res) => {
  try {
    // Populate the VIRTUAL name 'user_details', not the field name 'user_id'
    const studentWithParent = await Student.findOne({ student_id: "2026-0001" })
    .populate({
      path: 'user_details',
      select: 'username first_name last_name email profile_picture' // Exclude password here
    });

    if (!studentWithParent) {
      return res.status(404).send({ msg: "Student not found" });
    }

    if (studentWithParent.user_details && studentWithParent.user_details.length > 0) {
      console.log("Parent Username:", studentWithParent.user_details[0].username);
      return res.status(200).send(studentWithParent);
    } else {
      return res.status(200).send({ 
        msg: "Student found, but no linked parent details found in User collection.",
        student: studentWithParent 
      });
    }
  } catch (err) {
    console.error("Query Error:", err);
    res.status(500).send({ msg: "Server error", error: err.message });
  }
});

export default router;