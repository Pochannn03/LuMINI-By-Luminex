import { Router } from "express";
import { validationResult, matchedData, checkSchema} from "express-validator";
import { isAuthenticated, hasRole } from '../middleware/authMiddleware.js';
import { createStudentValidationSchema } from '../validation/studentValidation.js';
import { updateStudentValidationSchema } from '../validation/editStudentValidation.js';
import { User } from "../models/users.js";
import { Audit } from "../models/audits.js";
import { Student } from "../models/students.js";
import { Section } from "../models/sections.js";
import { Counter } from '../models/counter.js';
import { sendInvitationEmail } from "../utils/emailService.js";
import multer from "multer";
import path from "path";
import fs from "fs";

// Router Import to Export this router to index.js
const router = Router();

// --- Multer Setup for Student Images ---
const uploadDir = 'uploads/students'; // Store student images in a separate subfolder
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); 
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'student-' + uniqueSuffix + path.extname(file.originalname)); 
  }
});

const upload = multer({ storage: storage });

// --- NEW ROUTE: Update Student Profile Picture ---
router.put('/api/student/:id/profile-picture', 
  isAuthenticated, 
  upload.single('profile_picture'), 
  async (req, res) => {
    try {
      const studentId = req.params.id;

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded." });
      }

      // 1. Find the student to get the old picture path
      const student = await Student.findById(studentId);
      if (!student) {
        // Clean up the uploaded file if student not found
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ message: "Student not found." });
      }

      // 2. Delete the OLD file if it exists
      if (student.profile_picture) {
        const oldImagePath = path.join(process.cwd(), student.profile_picture);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
          console.log(`fwb_log: Old student profile picture deleted: ${oldImagePath}`);
        }
      }

      // 3. Update the student record with the new picture path
      student.profile_picture = req.file.path;
      const updatedStudent = await student.save();

      const auditLog = new Audit({
        user_id: req.user.user_id,
        full_name: `${req.user.first_name} ${req.user.last_name}`,
        role: req.user.role,
        action: "Update Student Photo",
        target: `Updated photo student ${student.first_name} ${student.last_name}`
      });
      await auditLog.save();

      res.status(200).json({ 
        success: true, 
        message: "Student profile picture updated successfully!", 
        student: updatedStudent 
      });

    } catch (err) {
      console.error("Error updating student profile picture:", err);
      // Clean up the uploaded file on error
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ message: "Failed to update student profile picture." });
    }
});

// --- NEW ROUTE: Update Student Medical Details (For Parents) ---
router.put('/api/student/:id/medical', isAuthenticated, async (req, res) => {
  try {
    const studentId = req.params.id;
    const { allergies, medical_history } = req.body;

    // Update only the specific medical fields
    const updatedStudent = await Student.findByIdAndUpdate(
      studentId,
      { 
        $set: { 
          allergies: allergies, 
          medical_history: medical_history 
        } 
      },
      { new: true, runValidators: true }
    );

    if (!updatedStudent) {
      return res.status(404).json({ message: "Student not found." });
    }

    const auditLog = new Audit({
      user_id: req.user.user_id,
      full_name: `${req.user.first_name} ${req.user.last_name}`,
      role: req.user.role,
      action: "Update Medical Info",
      target: `Updated medical records ${updatedStudent.first_name} ${updatedStudent.last_name}`
    });
    await auditLog.save();

    res.status(200).json({ 
      success: true, 
      message: "Medical details updated successfully!", 
      student: updatedStudent 
    });

  } catch (err) {
    console.error("Error updating medical details:", err);
    res.status(500).json({ message: "Failed to update medical details." });
  }
});

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
    
    // --- BUILD THE UPDATE OBJECT ---
    const updateData = {
        ...req.body
    };
    
    if (req.file) {
        updateData.profile_picture = req.file.path; 
    }

    if (req.body.passive_parent_name !== undefined) {
      updateData['passive_parent.name'] = req.body.passive_parent_name;
    }
    if (req.body.passive_parent_phone !== undefined) {
      updateData['passive_parent.phone'] = req.body.passive_parent_phone;
    }
    if (req.body.passive_parent_email !== undefined) {
      updateData['passive_parent.email'] = req.body.passive_parent_email;
    }

    try {
      const updatedStudent = await Student.findByIdAndUpdate(
        studentId, 
        { $set: updateData }, 
        { 
          new: true,          
          runValidators: true  
        }
      )

      if (!updatedStudent) {
        return res.status(404).json({ success: false, msg: "Student not found" });
      }

      const auditLog = new Audit({
        user_id: req.user.user_id,
        full_name: `${req.user.first_name} ${req.user.last_name}`,
        role: req.user.role,
        action: "Edit Student Info",
        // THE FIX 1: Changed `updatedUser` to `updatedStudent`
        target: `Updated student ${updatedStudent.first_name} ${updatedStudent.last_name}`
      });
      await auditLog.save();

      return res.status(200).json({ 
        success: true, 
        msg: "Student updated successfully!", 
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
        return res.status(404).json({ success: false, msg: "Student not found" });
      }

      const auditLog = new Audit({
        user_id: req.user.user_id,
        full_name: `${req.user.first_name} ${req.user.last_name}`,
        role: req.user.role,
        action: "Archive Student",
        // THE FIX 2: Changed `updatedStudent` to `archivedStudent` to match the variable above!
        target: `Archived student ${archivedStudent.first_name} ${archivedStudent.last_name}`
      });
      await auditLog.save();

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

    const students = await Student.find(query).populate('section_details');

    res.status(200).json({ success: true, students });
  } catch (err) {
    console.error("Fetch available students error:", err);
    res.status(500).json({ success: false });
  }
});


// ==========================================
// CREATE STUDENT (MANUAL REGISTRATION)
// ==========================================
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

    data.passive_parent = {
      name: req.body.passive_parent_name || null,
      phone: req.body.passive_parent_phone || null,
      email: req.body.passive_parent_email || null,
      is_verified: false
    };

    const newStudent = new Student(data);

    try {
        const savedStudent = await newStudent.save();
        const auditLog = new Audit({
          user_id: req.user.user_id,
          full_name: `${req.user.first_name} ${req.user.last_name}`,
          role: req.user.role,
          action: "Register Student",
          target: `Registered student ${savedStudent.first_name} ${savedStudent.last_name}`
        });
        await auditLog.save();

        const io = req.app.get('socketio');
        io.emit('student_added', savedStudent);
        
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
    
    let counter = await Counter.findById(counterName);
    
    const nextSeq = counter ? counter.seq + 1 : 1;
    
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

      while (!isUnique) {
        code = '';
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const existingStudent = await Student.findOne({ invitation_code: code });
        
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

// GET TOTAL STUDENTS OF TEACHER (AND SECTION DETAILS)
router.get("/api/students/teacher/totalStudents", 
  isAuthenticated, 
  hasRole('admin'),
  async (req, res) => { 
    
    try {
        const teacherId = Number(req.user.user_id); 

        const sections = await Section.find({ user_id: teacherId })
            .populate({
                path: 'student_details',
                populate: {
                    path: 'user_details', 
                    model: 'User' 
                }
            }); 

        let totalStudents = 0;
        const colors = ["blue", "orange", "green"];

        const formattedSections = sections.map((section, index) => {
            const studentsList = section.student_details || [];
            totalStudents += studentsList.length;

            return {
                id: section.section_id || section._id,
                name: section.section_name,
                time: section.class_schedule,
                color: colors[index % colors.length], 
                code: section.section_code, 
                
                students: studentsList.map(student => ({
                    _id: student._id,
                    id: student.student_id, 
                    name: `${student.first_name} ${student.last_name}`, 
                    profile_picture: student.profile_picture,
                    gender: student.gender,
                    birthday: student.birthday,
                    age: student.age,
                    allergies: student.allergies,
                    medical_history: student.medical_history,
                    guardians: student.user_details || [] 
                }))
            };
        });

        res.status(200).json({
            success: true,
            teacherId: teacherId,
            totalSections: sections.length,
            totalStudents: totalStudents,
            sections: formattedSections 
        });

    } catch (error) {
        console.error("Error fetching teacher totals:", error);
        res.status(500).json({ error: "Server Error" });
    }
});

// ==================================================
// NEW ROUTE: SEND INVITATION CODE TO PARENT
// ==================================================
router.post('/api/students/send-invitation', 
  isAuthenticated, 
  hasRole('superadmin'), 
  async (req, res) => {
  try {
    const { student_id } = req.body;

    if (!student_id) {
      return res.status(400).json({ success: false, msg: "Student ID is required." });
    }

    // 1. Get the student from the DB
    const student = await Student.findOne({ student_id });
    if (!student) {
      return res.status(404).json({ success: false, msg: "Student not found." });
    }

    // 2. Extract parent details from the passive_parent tag
    const parentEmail = student.passive_parent?.email;
    const parentName = student.passive_parent?.name || "Parent/Guardian";
    const studentName = `${student.first_name} ${student.last_name}`;

    if (!parentEmail) {
      return res.status(400).json({ success: false, msg: "No email address found for this student's parent." });
    }

    // 3. Trigger the email service!
    const emailSent = await sendInvitationEmail(parentEmail, student.invitation_code, parentName, studentName);

    if (emailSent) {
      return res.status(200).json({ success: true, msg: `Invitation successfully sent to ${parentEmail}` });
    } else {
      return res.status(500).json({ success: false, msg: "Failed to send email. Check server logs." });
    }

  } catch (error) {
    console.error("Send Invitation Route Error:", error);
    return res.status(500).json({ success: false, msg: "Server error while sending email." });
  }
});

export default router;