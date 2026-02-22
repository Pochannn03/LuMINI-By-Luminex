import { Router } from "express";
import { validationResult, matchedData, checkSchema} from "express-validator";
import { isAuthenticated, hasRole } from '../middleware/authMiddleware.js';
import { createClassValidationSchema } from '../validation/classValidation.js';
import { User } from "../models/users.js";
import { Student } from "../models/students.js";
import { Section } from "../models/sections.js";
import multer from "multer";
import path from "path";
import fs from "fs";

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

// CLASSES
router.get('/api/sections',
  isAuthenticated,
  hasRole('superadmin'),
  async (req, res) => {

    try {
      const classes = await Section.find({ is_archive: false })
                                   .select('section_id section_name class_schedule max_capacity description user_id student_id')
                                   .populate('user_details', 'first_name last_name')
                                   .populate('student_details');

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
      if (data.student_id && data.student_id.length > 0) {
        await Student.updateMany(
          { student_id: { $in: data.student_id } },
          { $set: { section_id: newClass.section_id } }
        );
      }
      const io = req.app.get('socketio');
      io.emit('section_added', savedClass);
      return res.status(201).send({ 
        msg: "Section created and students enrolled successfully", 
        user: savedClass 
      });
    } catch (err) {
      console.log(err);
      return res.status(400).send({ msg: "Registration failed", error: err.message });
    }
})

router.put('/api/sections/archive/:id',
  isAuthenticated,
  hasRole('superadmin'),
  async (req, res) => {

    try {
      const sectionId = req.params.id;
      const deletedSection = await Section.findByIdAndUpdate(
        sectionId,
        { is_archive: true }, 
        { new: true }
      );

      if (!deletedSection) {
        return res.status(404).json({ success: false, msg: "Class not found" });
      }

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

      const numericSectionId = updatedClass.section_id;
      const newStudentList = data.student_id || [];

      // 2. THE "UNCHECK" LOGIC: 
      // Find students who CURRENTLY have this section_id, 
      // but are NOT in the new list sent from the frontend.
      await Student.updateMany(
        { 
          section_id: numericSectionId, 
          student_id: { $nin: newStudentList } 
        },
        { $set: { section_id: null } }
      );

      // 3. THE "ENROLL" LOGIC:
      // Ensure all students in the new list are updated to have this section_id.
      if (newStudentList.length > 0) {
        await Student.updateMany(
          { student_id: { $in: newStudentList } },
          { $set: { section_id: numericSectionId } }
        );
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