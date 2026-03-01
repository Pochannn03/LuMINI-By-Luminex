import { Router } from "express";
import { validationResult, matchedData, checkSchema} from "express-validator";
import { isAuthenticated, hasRole } from '../middleware/authMiddleware.js';
import { createClassValidationSchema } from '../validation/classValidation.js';
import { User } from "../models/users.js";
import { Audit } from "../models/audits.js";
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

// ==================================================
// NEW PUBLIC ROUTE: VERIFY SECTION CODE (For Parents)
// ==================================================
router.get('/api/sections/verify-code/:code', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    
    // Find the section by code and populate the teacher's details
    const section = await Section.findOne({ section_code: code, is_archive: false })
                                 .populate('user_details', 'first_name last_name');

    if (!section) {
      return res.status(404).json({ success: false, msg: "Invalid Section Code. Please try again." });
    }

    // Return success along with the basic info to reassure the parent
    return res.status(200).json({
      success: true,
      data: {
        section_id: section.section_id,
        section_name: section.section_name,
        teacher_name: section.user_details ? `${section.user_details.first_name} ${section.user_details.last_name}` : "Unknown Teacher"
      }
    });

  } catch (err) {
    console.error("Error verifying code:", err);
    res.status(500).json({ success: false, msg: "Server error while verifying code." });
  }
});

// CLASSES
router.get('/api/sections',
  isAuthenticated,
  hasRole('superadmin'),
  async (req, res) => {
    try {
      const classes = await Section.find({ is_archive: false })
        // 1. Ensure profile_picture is included in the main class selection
        .select('section_id section_name class_schedule max_capacity description user_id student_id profile_picture')
        
        // 2. THIS IS THE KEY: You must add 'profile_picture' to the populate string below
        .populate('user_details', 'first_name last_name profile_picture') 
        
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

router.get('/api/sections/archived-list', 
  isAuthenticated, 
  hasRole('superadmin'), 
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      // 1. Get total count for pagination math
      const totalCount = await Section.countDocuments({ is_archive: true });

      // 2. Fetch the paginated data
      const archived = await Section.find({ is_archive: true })
        .sort({ updated_at: -1 }) // Show most recently archived first
        .skip(skip)
        .limit(limit);

      // Send total count in headers (matching your example) or body
      res.set('x-total-count', totalCount.toString());
      
      res.status(200).json({ 
        success: true, 
        classes: archived,
        totalCount // Also sending in body for easier access
      });
    } catch (err) {
      console.error("Error fetching archives:", err);
      res.status(500).json({ success: false, msg: "Server error" });
    }
});

router.get('/api/sections/archived/:id', 
  isAuthenticated, 
  hasRole('superadmin'), 
  async (req, res) => {
    try {
      const mongoId = req.params.id;

      const section = await Section.findOne({ _id: mongoId, is_archive: true })
        .populate({
          path: 'student_details', 
          match: { is_archive: true }
        })
        .populate('user_details');

      if (!section) {
        return res.status(404).json({ success: false, msg: "Archived class not found" });
      }

      res.status(200).json({ 
        success: true, 
        classData: section 
      });

    } catch (err) {
      console.error("❌ Error fetching archived section details:", err);
      res.status(500).json({ success: false, msg: "Server error" });
    }
});

// ==========================================
// POST: CREATE NEW CLASS
// ==========================================
router.post('/api/sections',
  isAuthenticated,
  hasRole('superadmin'),
  ...checkSchema(createClassValidationSchema),
  async (req, res) => {
    const result = validationResult(req);
    const currentUserId = req.user.user_id;
    const fullName = `${req.user.first_name || "Admin"} ${req.user.last_name || ""}`.trim();
    const userRole = req.user.role;

    if (!result.isEmpty()) {
      return res.status(400).send({ errors: result.array() });
    }
    
    const data = matchedData(req);

    try {
      // --- RESTRICTION 1: CHECK FOR DUPLICATE SECTION NAME ---
      const existingSection = await Section.findOne({ 
        section_name: { $regex: new RegExp(`^${data.section_name}$`, 'i') },
        is_archive: false 
      });

      if (existingSection) {
        return res.status(409).json({ 
          success: false, 
          msg: `A class named "${data.section_name}" already exists.` 
        });
      }

      // --- RESTRICTION 2: CHECK FOR TEACHER SCHEDULE CONFLICT ---
      const teacherConflict = await Section.findOne({
        user_id: data.user_id,
        class_schedule: data.class_schedule,
        is_archive: false
      }).populate('user_details', 'first_name last_name');

      if (teacherConflict) {
        const tName = teacherConflict.user_details 
          ? `${teacherConflict.user_details.first_name} ${teacherConflict.user_details.last_name}` 
          : "This teacher";
        return res.status(409).json({
          success: false,
          msg: `${tName} is already assigned to a ${data.class_schedule} class (${teacherConflict.section_name}).`
        });
      }

      // Proceed with saving...
      const newClass = new Section(data);
      const savedClass = await newClass.save();
      
      if (data.student_id && data.student_id.length > 0) {
        await Student.updateMany(
          { student_id: { $in: data.student_id } },
          { $set: { section_id: newClass.section_id } }
        );
      }

      let studentCount = 0;
      if (data.student_id && data.student_id.length > 0) {
        studentCount = data.student_id.length;
        await Student.updateMany(
          { student_id: { $in: data.student_id } },
          { $set: { section_id: newClass.section_id } }
        );
      }

      const auditLog = new Audit({
        user_id: currentUserId,
        full_name: fullName,
        role: userRole,
        action: "Class Created",
        target: `Section: ${data.section_name} Enrolled ${studentCount} students`
      });
      await auditLog.save();

      const io = req.app.get('socketio');
      io.emit('section_added', savedClass);
      io.emit('students_updated');

      return res.status(201).send({ 
        msg: "Section created and students enrolled successfully", 
        user: savedClass 
      });
    } catch (err) {
      console.log(err);
      return res.status(400).send({ msg: "Registration failed", error: err.message });
    }
})

// ==========================================
// PUT: ARCHIVE CLASS
// ==========================================
router.put('/api/sections/archive/:id',
  isAuthenticated,
  hasRole('superadmin'),
  async (req, res) => {
    try {
      const mongoId = req.params.id;
      const sectionToArchive = await Section.findById(mongoId);

      if (!sectionToArchive) {
        return res.status(404).json({ success: false, msg: "Class not found" });
      }

      const numericSectionId = sectionToArchive.section_id;
      const sectionName = sectionToArchive.section_name;
      const studentsInSection = await Student.find({ section_id: numericSectionId });
      const parentUserIds = studentsInSection.map(s => s.parent_id).filter(id => id != null);
      const currentUserId = req.user.user_id;
      const fullName = `${req.user.first_name || "Admin"} ${req.user.last_name || ""}`.trim();

      await Section.findByIdAndUpdate(mongoId, { 
        is_archive: true,
        user_id: null,
      });

      await Student.updateMany(
        { section_id: numericSectionId },
        { $set: { is_archive: true } }
      );

      if (parentUserIds.length > 0) {
        await User.updateMany(
          { _id: { $in: parentUserIds } },
          { $set: { is_archive: true } }
        );
      }

      const auditLog = new Audit({
        user_id: currentUserId,
        full_name: fullName,
        role: req.user.role,
        action: "Archive Section",
        target: `Section: ${sectionName}`
      });
      await auditLog.save();

      const io = req.app.get('socketio');
      if (io) {
        io.emit("section_archived", { section_id: numericSectionId });
        io.emit("students_updated");
        io.emit("users_updated"); // Notify frontend to refresh user/parent lists
      }

      res.status(200).json({ 
        success: true, 
        msg: "Class archived and students/teacher unlinked successfully" 
      });

    } catch (err) {
      console.error("❌ Error archiving class:", err);
      if (err.kind === 'ObjectId') {
         return res.status(404).json({ success: false, msg: "Class not found" });
      }
      res.status(500).json({ success: false, msg: "Server error" });
    }
});

// ==========================================
// PUT: EDIT EXISTING CLASS
// ==========================================
router.put('/api/sections/:id',
  isAuthenticated,
  hasRole('superadmin'),
  ...checkSchema(createClassValidationSchema),
  async (req, res) => {
    const result = validationResult(req);

    if (!result.isEmpty()) {
      return res.status(400).send({ errors: result.array() });
    }
    
    const sectionId = req.params.id; // This is the MongoDB _id
    const data = matchedData(req);
    const currentUserId = req.user.user_id;
    const fullName = `${req.user.first_name || "Admin"} ${req.user.last_name || ""}`.trim();

    try {
      // --- RESTRICTION 1: CHECK FOR DUPLICATE SECTION NAME (Excluding this current class) ---
      const existingSection = await Section.findOne({ 
        section_name: { $regex: new RegExp(`^${data.section_name}$`, 'i') },
        is_archive: false,
        _id: { $ne: sectionId } 
      });

      if (existingSection) {
        return res.status(409).json({ 
          success: false, 
          msg: `A class named "${data.section_name}" already exists.` 
        });
      }

      // --- RESTRICTION 2: CHECK FOR TEACHER SCHEDULE CONFLICT (Excluding this current class) ---
      const teacherConflict = await Section.findOne({
        user_id: data.user_id,
        class_schedule: data.class_schedule,
        is_archive: false,
        _id: { $ne: sectionId }
      }).populate('user_details', 'first_name last_name');

      if (teacherConflict) {
        const tName = teacherConflict.user_details 
          ? `${teacherConflict.user_details.first_name} ${teacherConflict.user_details.last_name}` 
          : "This teacher";
        return res.status(409).json({
          success: false,
          msg: `${tName} is already assigned to a ${data.class_schedule} class (${teacherConflict.section_name}).`
        });
      }

      // Proceed with updating...
      const updatedClass = await Section.findByIdAndUpdate(
        sectionId, 
        data, 
        { 
          new: true,
          runValidators: true
        }
      ).populate('user_details', 'first_name last_name'); 

      if (!updatedClass) {
        return res.status(404).json({ success: false, msg: "Class not found" });
      }

      const numericSectionId = updatedClass.section_id;
      const newStudentList = data.student_id || [];

      await Student.updateMany(
        { 
          section_id: numericSectionId, 
          student_id: { $nin: newStudentList } 
        },
        { $set: { section_id: null } }
      );

      if (newStudentList.length > 0) {
        await Student.updateMany(
          { student_id: { $in: newStudentList } },
          { $set: { section_id: numericSectionId } }
        );
      }

      const auditLog = new Audit({
        user_id: currentUserId,
        full_name: fullName,
        role: req.user.role,
        action: "Edit Section",
        target: `Updated Section: ${updatedClass.section_name}. `
      });
      await auditLog.save();

      const io = req.app.get('socketio');
      if (io) {
        io.emit('section_updated', updatedClass);
        io.emit('students_updated'); 
        io.emit('teachers_updated');
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