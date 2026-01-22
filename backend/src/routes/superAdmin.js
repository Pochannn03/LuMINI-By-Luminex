import { Router } from "express";
import { createStudentValidationSchema } from '../validation/studentValidation.js'
import { validationResult, matchedData, checkSchema} from "express-validator";
import { Student } from "../models/students.js";
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

router.post('/api/superadminDashboard',  
  (req, res) => {

});

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

    if (req.file) {
      data.profile_picture = req.file.path; 
    }

    const newStudent = new Student(data);

    try {
        const savedUser = await newStudent.save();
        return res.status(201).send({ msg: "Student registered successfully!", user: savedUser });
    } catch (err) {
        if (req.file) fs.unlinkSync(req.file.path);
        
        console.log(err);
        return res.status(400).send({ msg: "Registration failed", error: err.message });
    }

  }
);

export default router;